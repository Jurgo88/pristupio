import { createClient } from '@supabase/supabase-js'
import { getGuidance, getWcagLevel } from './audit-guidance'
import {
  DEFAULT_ISSUE_LOCALE,
  createIssueCopyMap,
  localizeIssues,
  normalizeIssueLocale
} from './audit-copy'
import { enrichIssuesWithAiCopy } from './audit-ai-copy'
import { normalizeUrlForCompare } from './audit-site-security'
import { getErrorMessage, logJson, truncateText } from './audit-site-observability'
import {
  clampNumber,
  IMPACT_ORDER,
  type Impact,
  type ReportIssue,
  type SiteAuditJobRow,
  type SiteAuditLocale,
  type SiteAuditMode,
  type SiteAuditPageRow,
  type SiteAuditProfile,
  type SiteAuditTier,
  type SupabaseAdminClient
} from './audit-site-types'

declare const process: {
  env: Record<string, string | undefined>
}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const DEFAULT_MAX_JOBS_PER_WORKER = 1
const DEFAULT_MAX_LINKS_PER_PAGE = 120

const START_RATE_LIMIT_MAX_ATTEMPTS = clampNumber(process.env.AUDIT_SITE_START_RATE_LIMIT_MAX, 1, 20, 4)
const START_RATE_LIMIT_WINDOW_SEC = clampNumber(process.env.AUDIT_SITE_START_RATE_LIMIT_WINDOW_SEC, 60, 86_400, 600)

export const getMaxJobsPerWorker = () =>
  clampNumber(process.env.AUDIT_SITE_WORKER_MAX_JOBS, 1, 10, DEFAULT_MAX_JOBS_PER_WORKER)

export const getMaxLinksPerPage = () =>
  clampNumber(process.env.AUDIT_SITE_MAX_LINKS_PER_PAGE, 20, 500, DEFAULT_MAX_LINKS_PER_PAGE)

export const createSupabaseAdminClient = () => {
  if (!supabaseUrl || !supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
}

const normalizeImpact = (value?: string): Impact => {
  if (value === 'critical' || value === 'serious' || value === 'moderate' || value === 'minor') {
    return value
  }
  return 'minor'
}

const normalizeRuleId = (value: unknown) => {
  if (typeof value !== 'string') return 'unknown'
  const normalized = value.trim().toLowerCase()
  return normalized || 'unknown'
}

const buildSelectorFingerprint = (nodes: Array<{ target: string[] }>) => {
  const selectors = nodes
    .map((node) => (Array.isArray(node.target) ? node.target.join(' > ').trim() : ''))
    .filter(Boolean)
    .slice(0, 3)
  return selectors.length > 0 ? selectors.join(' | ') : 'document'
}

const summaryFromIssues = (issues: ReportIssue[]) => {
  const summary = {
    total: issues.length,
    byImpact: {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0
    }
  }

  for (const issue of issues) {
    summary.byImpact[issue.impact] += 1
  }
  return summary
}

const pickTopIssues = (issues: ReportIssue[], count: number) => {
  return [...issues]
    .sort((a, b) => {
      const aOrder = IMPACT_ORDER[a.impact] ?? 99
      const bOrder = IMPACT_ORDER[b.impact] ?? 99
      if (aOrder !== bOrder) return aOrder - bOrder
      return (b.nodesCount || 0) - (a.nodesCount || 0)
    })
    .slice(0, count)
}

export const normalizeSiteAuditTier = (value: unknown): SiteAuditTier => {
  if (value === 'pro' || value === 'basic') return value
  return 'none'
}

export const normalizeSiteAuditMode = (value: unknown): SiteAuditMode => {
  return value === 'full' ? 'full' : 'quick'
}

export const normalizeSiteAuditLocale = (value: unknown): SiteAuditLocale => {
  const locale = normalizeIssueLocale(value, DEFAULT_ISSUE_LOCALE)
  return locale === 'en' ? 'en' : 'sk'
}

export const getTierPageLimit = (tier: SiteAuditTier, mode: SiteAuditMode) => {
  if (tier === 'pro') return mode === 'full' ? 400 : 75
  if (tier === 'basic') return mode === 'full' ? 120 : 25
  return mode === 'full' ? 50 : 10
}

export const normalizeRequestedPagesLimit = (
  tier: SiteAuditTier,
  mode: SiteAuditMode,
  requested: unknown
) => {
  const maxByTier = getTierPageLimit(tier, mode)
  return clampNumber(requested, 1, maxByTier, maxByTier)
}

export const normalizeRequestedMaxDepth = (mode: SiteAuditMode, requested: unknown) => {
  const fallback = mode === 'full' ? 4 : 2
  return clampNumber(requested, 0, 8, fallback)
}

export const loadSiteAuditProfile = async (
  supabase: SupabaseAdminClient,
  userId: string
): Promise<SiteAuditProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, plan, audit_tier, paid_audit_credits, paid_audit_completed')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data?.id) return null

  const isAdmin = data.role === 'admin'
  const auditTier = normalizeSiteAuditTier(data.audit_tier)
  const paidAuditCredits = Number(data.paid_audit_credits || 0)
  const isPaid = data.plan === 'paid' || paidAuditCredits > 0 || auditTier !== 'none'

  return {
    id: data.id,
    role: data.role || null,
    plan: data.plan || 'free',
    auditTier,
    paidAuditCredits,
    paidAuditCompleted: !!data.paid_audit_completed,
    isAdmin,
    isPaid
  }
}

export const canStartSiteAudit = (profile: SiteAuditProfile | null) => {
  if (!profile) return { allowed: false, reason: 'Profil sa nepodarilo nacitat.' }
  if (profile.isAdmin) return { allowed: true, reason: '' }
  if (!profile.isPaid) return { allowed: false, reason: 'Site audit je dostupny iba pre plateny audit plan.' }
  if (profile.paidAuditCredits <= 0) {
    return { allowed: false, reason: 'Nemate kredit na zakladny audit. Objednajte dalsi audit.' }
  }
  return { allowed: true, reason: '' }
}

export const checkSiteAuditStartRateLimit = async (supabase: SupabaseAdminClient, userId: string) => {
  const since = new Date(Date.now() - START_RATE_LIMIT_WINDOW_SEC * 1_000).toISOString()
  const { count, error } = await supabase
    .from('audit_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since)

  if (error) {
    logJson('warn', 'rate_limit_query_failed', { userId, error: getErrorMessage(error) })
    return { allowed: true, retryAfterSec: 0 }
  }

  const used = Number(count || 0)
  if (used < START_RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: true, retryAfterSec: 0 }
  }

  return {
    allowed: false,
    retryAfterSec: START_RATE_LIMIT_WINDOW_SEC,
    message: `Prilis vela spusteni site auditu. Skuste to znova o ${START_RATE_LIMIT_WINDOW_SEC} sekund.`
  }
}

export const getExistingActiveSiteAuditJob = async (supabase: SupabaseAdminClient, userId: string) => {
  const { data } = await supabase
    .from('audit_jobs')
    .select('id, status, root_url, mode, pages_limit, pages_queued, pages_scanned, pages_failed, created_at')
    .eq('user_id', userId)
    .in('status', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data || null
}

export type CreateSiteAuditJobInput = {
  supabase: SupabaseAdminClient
  userId: string
  rootUrl: string
  mode: SiteAuditMode
  locale: SiteAuditLocale
  auditTier: SiteAuditTier
  pagesLimit: number
  maxDepth: number
}

export const createSiteAuditJob = async ({
  supabase,
  userId,
  rootUrl,
  mode,
  locale,
  auditTier,
  pagesLimit,
  maxDepth
}: CreateSiteAuditJobInput) => {
  const nowIso = new Date().toISOString()
  const insertResult = await supabase
    .from('audit_jobs')
    .insert({
      user_id: userId,
      root_url: rootUrl,
      mode,
      status: 'queued',
      lang: locale,
      audit_tier_snapshot: auditTier,
      pages_limit: pagesLimit,
      max_depth: maxDepth,
      pages_queued: 1,
      pages_scanned: 0,
      pages_failed: 0,
      issues_total: 0,
      created_at: nowIso,
      updated_at: nowIso
    })
    .select('*')
    .single()

  if (insertResult.error || !insertResult.data?.id) {
    throw new Error('Vytvorenie site audit jobu zlyhalo.')
  }

  const pageInsert = await supabase.from('audit_job_pages').insert({
    job_id: insertResult.data.id,
    url: rootUrl,
    normalized_url: normalizeUrlForCompare(rootUrl),
    depth: 0,
    status: 'queued'
  })

  if (pageInsert.error) {
    await supabase.from('audit_jobs').delete().eq('id', insertResult.data.id)
    throw new Error('Vytvorenie vstupnej stranky pre site audit zlyhalo.')
  }

  return insertResult.data as SiteAuditJobRow
}

export const getSiteAuditJobForUser = async (supabase: SupabaseAdminClient, userId: string, jobId: string) => {
  const { data, error } = await supabase
    .from('audit_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return { data: null, error: 'Nacitanie site audit jobu zlyhalo.' }
  return { data: (data as SiteAuditJobRow | null) || null, error: null }
}

export const cancelSiteAuditJob = async (supabase: SupabaseAdminClient, userId: string, jobId: string) => {
  const nowIso = new Date().toISOString()
  const updateResult = await supabase
    .from('audit_jobs')
    .update({
      status: 'cancelled',
      finished_at: nowIso,
      updated_at: nowIso
    })
    .eq('id', jobId)
    .eq('user_id', userId)
    .in('status', ['queued', 'running'])
    .select('*')
    .maybeSingle()

  if (updateResult.error) return { data: null, error: 'Zrusenie site audit jobu zlyhalo.' }
  if (!updateResult.data?.id) return { data: null, error: 'Site audit job sa neda zrusit v tomto stave.' }

  await supabase
    .from('audit_job_pages')
    .update({
      status: 'skipped',
      error_message: 'Cancelled by user.',
      scanned_at: nowIso
    })
    .eq('job_id', jobId)
    .eq('status', 'queued')

  return { data: updateResult.data as SiteAuditJobRow, error: null }
}

export const syncJobCounters = async (supabase: SupabaseAdminClient, jobId: string) => {
  const { data: pages } = await supabase.from('audit_job_pages').select('status').eq('job_id', jobId)

  const queued = (pages || []).filter((page: any) => page?.status === 'queued').length
  const scanned = (pages || []).filter((page: any) => page?.status === 'done').length
  const failed = (pages || []).filter((page: any) => page?.status === 'failed').length

  await supabase
    .from('audit_jobs')
    .update({
      pages_queued: queued,
      pages_scanned: scanned,
      pages_failed: failed,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId)

  return {
    pagesQueued: queued,
    pagesScanned: scanned,
    pagesFailed: failed
  }
}

export const claimOldestQueuedJob = async (supabase: SupabaseAdminClient) => {
  const { data: nextJob } = await supabase
    .from('audit_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!nextJob?.id) return null

  const nowIso = new Date().toISOString()
  const claim = await supabase
    .from('audit_jobs')
    .update({
      status: 'running',
      started_at: nowIso,
      updated_at: nowIso,
      error_message: null
    })
    .eq('id', nextJob.id)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle()

  if (claim.error || !claim.data?.id) return null
  return claim.data as SiteAuditJobRow
}

export const releaseClaimedJob = async (supabase: SupabaseAdminClient, jobId: string) => {
  const nowIso = new Date().toISOString()
  await supabase
    .from('audit_jobs')
    .update({
      status: 'queued',
      started_at: null,
      updated_at: nowIso
    })
    .eq('id', jobId)
    .eq('status', 'running')
}

export const getPrimaryRunningJob = async (supabase: SupabaseAdminClient) => {
  const { data } = await supabase
    .from('audit_jobs')
    .select('id, started_at, updated_at, status')
    .eq('status', 'running')
    .order('started_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()

  return data || null
}

export const markJobFailed = async (supabase: SupabaseAdminClient, jobId: string, message: string) => {
  const nowIso = new Date().toISOString()
  await supabase
    .from('audit_jobs')
    .update({
      status: 'failed',
      error_message: truncateText(message, 700),
      finished_at: nowIso,
      updated_at: nowIso
    })
    .eq('id', jobId)
}

export const failStuckRunningJobs = async (supabase: SupabaseAdminClient, staleBeforeIso: string) => {
  const { data: staleJobs, error } = await supabase
    .from('audit_jobs')
    .select('id, updated_at, started_at')
    .eq('status', 'running')
    .lt('updated_at', staleBeforeIso)

  if (error || !Array.isArray(staleJobs) || staleJobs.length === 0) return 0

  const nowIso = new Date().toISOString()
  for (const job of staleJobs) {
    await supabase
      .from('audit_jobs')
      .update({
        status: 'failed',
        error_message: '[timeout] Worker watchdog marked this job as stuck.',
        finished_at: nowIso,
        updated_at: nowIso
      })
      .eq('id', job.id)
      .eq('status', 'running')

    await supabase
      .from('audit_job_pages')
      .update({
        status: 'failed',
        error_message: '[timeout] Worker watchdog marked page scan as stuck.',
        scanned_at: nowIso
      })
      .eq('job_id', job.id)
      .eq('status', 'running')
  }

  return staleJobs.length
}

export const getLiveJobStatus = async (supabase: SupabaseAdminClient, jobId: string) => {
  const { data } = await supabase
    .from('audit_jobs')
    .select('id, status, updated_at, pages_limit, max_depth')
    .eq('id', jobId)
    .maybeSingle()

  return data || null
}

export const heartbeatJob = async (supabase: SupabaseAdminClient, jobId: string) => {
  await supabase
    .from('audit_jobs')
    .update({
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId)
    .eq('status', 'running')
}

export const claimNextQueuedPage = async (supabase: SupabaseAdminClient, jobId: string) => {
  const { data: nextPage } = await supabase
    .from('audit_job_pages')
    .select('id, job_id, url, normalized_url, depth, status')
    .eq('job_id', jobId)
    .eq('status', 'queued')
    .order('depth', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!nextPage?.id) return null

  const claimResult = await supabase
    .from('audit_job_pages')
    .update({ status: 'running' })
    .eq('id', nextPage.id)
    .eq('status', 'queued')
    .select('id, job_id, url, normalized_url, depth, status')
    .maybeSingle()

  if (claimResult.error || !claimResult.data?.id) return null
  return claimResult.data as SiteAuditPageRow
}

export const markPageSkipped = async (supabase: SupabaseAdminClient, pageId: number, message: string) => {
  await supabase
    .from('audit_job_pages')
    .update({
      status: 'skipped',
      error_message: truncateText(message, 600),
      scanned_at: new Date().toISOString()
    })
    .eq('id', pageId)
}

export const markPageFailed = async (supabase: SupabaseAdminClient, pageId: number, message: string) => {
  await supabase
    .from('audit_job_pages')
    .update({
      status: 'failed',
      scanned_at: new Date().toISOString(),
      error_message: truncateText(message, 600)
    })
    .eq('id', pageId)
}

export const markPageDone = async (
  supabase: SupabaseAdminClient,
  pageId: number,
  payload: {
    url: string
    normalizedUrl: string
    httpStatus: number | null
    loadMs: number | null
    issuesCount: number
  }
) => {
  await supabase
    .from('audit_job_pages')
    .update({
      status: 'done',
      url: payload.url,
      normalized_url: payload.normalizedUrl,
      http_status: payload.httpStatus,
      load_ms: payload.loadMs,
      issues_count: payload.issuesCount,
      scanned_at: new Date().toISOString(),
      error_message: null
    })
    .eq('id', pageId)
}

export const skipRemainingQueuedPages = async (supabase: SupabaseAdminClient, jobId: string, message: string) => {
  await supabase
    .from('audit_job_pages')
    .update({ status: 'skipped', error_message: truncateText(message, 600) })
    .eq('job_id', jobId)
    .eq('status', 'queued')
}

export const queueDiscoveredPages = async (
  supabase: SupabaseAdminClient,
  job: SiteAuditJobRow,
  page: SiteAuditPageRow,
  discoveredUrls: string[]
) => {
  const nextDepth = Number(page.depth || 0) + 1
  if (nextDepth > Number(job.max_depth || 0)) return 0
  if (!Array.isArray(discoveredUrls) || discoveredUrls.length === 0) return 0

  const unique = Array.from(new Set(discoveredUrls.map((url) => normalizeUrlForCompare(url))))
  if (unique.length === 0) return 0

  const pagesCountResult = await supabase
    .from('audit_job_pages')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', job.id)

  const existingCount = Number(pagesCountResult.count || 0)
  const maxAllowed = Math.max(0, Number(job.pages_limit || 0) - existingCount)
  if (maxAllowed <= 0) return 0

  const rows = unique.slice(0, maxAllowed).map((url) => ({
    job_id: job.id,
    url,
    normalized_url: normalizeUrlForCompare(url),
    depth: nextDepth,
    discovered_from_url: page.url,
    status: 'queued'
  }))

  if (rows.length === 0) return 0

  const insertResult = await supabase
    .from('audit_job_pages')
    .upsert(rows, { onConflict: 'job_id,normalized_url', ignoreDuplicates: true })
    .select('id')

  if (insertResult.error || !Array.isArray(insertResult.data)) return 0
  return insertResult.data.length
}

const buildIssueRows = (jobId: string, pageId: number, issues: ReportIssue[]) => {
  return issues.map((issue) => ({
    job_id: jobId,
    page_id: pageId,
    rule_id: issue.id,
    impact: issue.impact,
    wcag: issue.wcag,
    wcag_level: issue.wcagLevel,
    principle: issue.principle,
    selector_fingerprint: buildSelectorFingerprint(issue.nodes),
    nodes_count: Number(issue.nodesCount || 0),
    help_url: issue.helpUrl || null,
    issue_payload: {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      recommendation: issue.recommendation,
      copy: issue.copy,
      impact: issue.impact,
      wcag: issue.wcag,
      wcagLevel: issue.wcagLevel,
      principle: issue.principle,
      helpUrl: issue.helpUrl || null,
      nodesCount: issue.nodesCount || 0,
      nodes: issue.nodes.slice(0, 3).map((node) => ({
        target: node.target,
        html: node.html,
        failureSummary: node.failureSummary
      }))
    }
  }))
}

export const insertPageIssues = async (
  supabase: SupabaseAdminClient,
  jobId: string,
  pageId: number,
  issues: ReportIssue[]
) => {
  if (!Array.isArray(issues) || issues.length === 0) return 0
  const issueRows = buildIssueRows(jobId, pageId, issues)
  const issueInsert = await supabase.from('audit_job_issues').insert(issueRows)
  if (issueInsert.error) {
    throw new Error(`Issue insert failed: ${issueInsert.error.message || 'unknown error'}`)
  }
  return issueRows.length
}

const aggregateJobIssues = async (supabase: SupabaseAdminClient, jobId: string): Promise<ReportIssue[]> => {
  const { data: issueRows } = await supabase
    .from('audit_job_issues')
    .select(
      'page_id, rule_id, impact, wcag, wcag_level, principle, selector_fingerprint, nodes_count, help_url, issue_payload'
    )
    .eq('job_id', jobId)

  const clusters = new Map<
    string,
    {
      impact: Impact
      nodesCount: number
      baseIssue: ReportIssue
    }
  >()

  ;(issueRows || []).forEach((row: any) => {
    const clusterKey = `${normalizeRuleId(row?.rule_id)}::${String(row?.selector_fingerprint || 'document')}`
    const raw = row?.issue_payload || {}

    const baseIssue: ReportIssue = {
      id: normalizeRuleId(row?.rule_id),
      title: String(raw?.title || raw?.id || row?.rule_id || 'Unknown accessibility issue'),
      impact: normalizeImpact(row?.impact),
      description: String(raw?.description || ''),
      recommendation: String(raw?.recommendation || ''),
      copy: raw?.copy && typeof raw.copy === 'object' ? raw.copy : createIssueCopyMap('sk', raw),
      wcag: String(row?.wcag || raw?.wcag || ''),
      wcagLevel: String(row?.wcag_level || raw?.wcagLevel || ''),
      principle: String(row?.principle || raw?.principle || ''),
      helpUrl: row?.help_url || raw?.helpUrl || undefined,
      nodesCount: Number(row?.nodes_count || raw?.nodesCount || 0),
      nodes: Array.isArray(raw?.nodes)
        ? raw.nodes.map((node: any) => ({
            target: Array.isArray(node?.target) ? node.target : [],
            html: typeof node?.html === 'string' ? node.html : '',
            failureSummary: typeof node?.failureSummary === 'string' ? node.failureSummary : undefined
          }))
        : []
    }

    const existing = clusters.get(clusterKey)
    if (!existing) {
      clusters.set(clusterKey, {
        impact: baseIssue.impact,
        nodesCount: Number(row?.nodes_count || baseIssue.nodesCount || 0),
        baseIssue
      })
      return
    }

    existing.nodesCount += Number(row?.nodes_count || baseIssue.nodesCount || 0)
    const currentOrder = IMPACT_ORDER[existing.impact] ?? 99
    const nextOrder = IMPACT_ORDER[baseIssue.impact] ?? 99
    if (nextOrder < currentOrder) {
      existing.impact = baseIssue.impact
      existing.baseIssue = {
        ...baseIssue,
        nodesCount: existing.nodesCount
      }
    } else {
      existing.baseIssue.nodesCount = existing.nodesCount
    }
  })

  return Array.from(clusters.values())
    .map((item) => ({
      ...item.baseIssue,
      impact: item.impact,
      nodesCount: item.nodesCount
    }))
    .sort((a, b) => {
      const aOrder = IMPACT_ORDER[a.impact] ?? 99
      const bOrder = IMPACT_ORDER[b.impact] ?? 99
      if (aOrder !== bOrder) return aOrder - bOrder
      return (b.nodesCount || 0) - (a.nodesCount || 0)
    })
}

export const finalizeSiteAuditJob = async (supabase: SupabaseAdminClient, job: SiteAuditJobRow) => {
  const profile = await loadSiteAuditProfile(supabase, job.user_id)
  const isPaid = profile?.isAdmin || profile?.isPaid

  let issues = await aggregateJobIssues(supabase, job.id)
  const locale = normalizeIssueLocale(job.lang, DEFAULT_ISSUE_LOCALE)
  if (isPaid && issues.length > 0) {
    issues = await enrichIssuesWithAiCopy({
      issues,
      locale,
      context: 'audit-run'
    })
  }

  const summary = summaryFromIssues(issues)
  const topIssues = pickTopIssues(issues, 3)
  const counters = await syncJobCounters(supabase, job.id)

  const { data: auditInsert, error: auditError } = await supabase
    .from('audits')
    .insert({
      user_id: job.user_id,
      url: job.root_url,
      audit_kind: 'paid',
      summary,
      top_issues: topIssues,
      scope: 'site',
      pages_scanned: counters.pagesScanned,
      job_id: job.id
    })
    .select('id')
    .single()

  if (auditError || !auditInsert?.id) {
    throw new Error('Ulozenie auditu zlyhalo.')
  }

  const { error: detailError } = await supabase.from('audit_full').insert({
    audit_id: auditInsert.id,
    user_id: job.user_id,
    url: job.root_url,
    full_issues: issues
  })

  if (detailError) {
    await supabase.from('audits').delete().eq('id', auditInsert.id)
    throw new Error('Ulozenie detailu auditu zlyhalo.')
  }

  if (profile && !profile.isAdmin) {
    const nextCredits = Math.max(0, Number(profile.paidAuditCredits || 0) - 1)
    await supabase
      .from('profiles')
      .update({ paid_audit_completed: true, paid_audit_credits: nextCredits })
      .eq('id', profile.id)
  }

  await supabase
    .from('audit_jobs')
    .update({
      status: 'completed',
      audit_id: auditInsert.id,
      issues_total: summary.total,
      pages_scanned: counters.pagesScanned,
      pages_failed: counters.pagesFailed,
      pages_queued: counters.pagesQueued,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', job.id)

  logJson('info', 'job_completed', {
    jobId: job.id,
    auditId: auditInsert.id,
    issuesTotal: summary.total,
    pagesScanned: counters.pagesScanned,
    pagesFailed: counters.pagesFailed
  })

  return {
    auditId: auditInsert.id as string,
    summary,
    issues: localizeIssues(issues, locale, DEFAULT_ISSUE_LOCALE),
    counters
  }
}

export const getSiteAuditResult = async (
  supabase: SupabaseAdminClient,
  job: SiteAuditJobRow,
  localeInput: unknown
) => {
  if (!job.audit_id) return { data: null, error: 'Job nema priradeny audit report.' }

  const locale = normalizeIssueLocale(localeInput, DEFAULT_ISSUE_LOCALE)
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('id, url, audit_kind, summary, top_issues, created_at, scope, pages_scanned')
    .eq('id', job.audit_id)
    .maybeSingle()

  if (auditError || !audit?.id) return { data: null, error: 'Nacitanie finalneho auditu zlyhalo.' }

  const fullResult = await supabase
    .from('audit_full')
    .select('full_issues')
    .eq('audit_id', audit.id)
    .maybeSingle()

  const issues = Array.isArray(fullResult.data?.full_issues) ? fullResult.data.full_issues : []
  const report = {
    summary: audit.summary || {
      total: 0,
      byImpact: {
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0
      }
    },
    issues: localizeIssues(issues, locale, DEFAULT_ISSUE_LOCALE)
  }

  return {
    data: {
      auditId: audit.id,
      url: audit.url,
      auditKind: audit.audit_kind,
      scope: audit.scope || 'site',
      pagesScanned: Number(audit.pages_scanned || 0),
      accessLevel: 'paid',
      report,
      meta: {
        standard: 'EN 301 549 (WCAG 2.1 AA)',
        tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
        note: 'Automatizovane testy nepokrivaju vsetky kriteria; cast vyzaduje manualnu kontrolu.',
        locale
      }
    },
    error: null
  }
}

export const getGuidanceForViolation = (ruleId: unknown, description: unknown, help: unknown) => {
  const normalizedRule = typeof ruleId === 'string' ? ruleId : String(ruleId || '')
  const normalizedDescription = typeof description === 'string' ? description : String(description || '')
  const normalizedHelp = typeof help === 'string' ? help : String(help || '')
  const guidance = getGuidance(normalizedRule, normalizedDescription, normalizedHelp)
  return {
    ...guidance,
    wcagLevel: getWcagLevel(normalizedRule, guidance.wcag)
  }
}

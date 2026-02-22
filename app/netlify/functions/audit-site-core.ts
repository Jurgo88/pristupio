import type { HandlerEvent } from '@netlify/functions'
import chromium from '@sparticuz/chromium-min'
import { chromium as playwright } from 'playwright-core'
import axe from 'axe-core'
import { createClient } from '@supabase/supabase-js'
import { getGuidance, getWcagLevel } from './audit-guidance'
import {
  DEFAULT_ISSUE_LOCALE,
  createIssueCopyMap,
  localizeIssues,
  normalizeIssueLocale,
  type IssueCopyMap
} from './audit-copy'
import { enrichIssuesWithAiCopy } from './audit-ai-copy'

declare const process: {
  env: Record<string, string | undefined>
}

process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] as const

const NAVIGATION_TIMEOUT_MS = 45_000
const AXE_RUN_TIMEOUT_MS = 90_000
const NAVIGATION_RETRY_COUNT = 2
const NAVIGATION_RETRY_DELAY_MS = 1_000
const DEFAULT_MAX_JOBS_PER_WORKER = 1
const DEFAULT_MAX_LINKS_PER_PAGE = 120

const TRACKING_QUERY_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid']

const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

const getMaxJobsPerWorker = () =>
  clampNumber(process.env.AUDIT_SITE_WORKER_MAX_JOBS, 1, 10, DEFAULT_MAX_JOBS_PER_WORKER)

const getMaxLinksPerPage = () =>
  clampNumber(process.env.AUDIT_SITE_MAX_LINKS_PER_PAGE, 20, 500, DEFAULT_MAX_LINKS_PER_PAGE)

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message
  return String(error || 'Unknown error')
}

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  }) as Promise<T>
}

type SupabaseAdminClient = any

export type SiteAuditMode = 'quick' | 'full'
export type SiteAuditStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
export type SiteAuditLocale = 'sk' | 'en'
export type SiteAuditTier = 'none' | 'basic' | 'pro'
export type Impact = 'critical' | 'serious' | 'moderate' | 'minor'

type SiteAuditProfile = {
  id: string
  role: string | null
  plan: string
  auditTier: SiteAuditTier
  paidAuditCredits: number
  paidAuditCompleted: boolean
  isAdmin: boolean
  isPaid: boolean
}

type SiteAuditJobRow = {
  id: string
  user_id: string
  root_url: string
  mode: SiteAuditMode
  status: SiteAuditStatus
  lang: SiteAuditLocale
  pages_limit: number
  max_depth: number
  pages_queued: number
  pages_scanned: number
  pages_failed: number
  issues_total: number
  audit_id?: string | null
  error_message?: string | null
  started_at?: string | null
  finished_at?: string | null
  created_at?: string
  updated_at?: string
}

type SiteAuditPageRow = {
  id: number
  job_id: string
  url: string
  normalized_url: string
  depth: number
  status: 'queued' | 'running' | 'done' | 'failed' | 'skipped'
}

type ReportIssue = {
  id: string
  title: string
  impact: Impact
  description: string
  recommendation: string
  copy: IssueCopyMap
  wcag: string
  wcagLevel: string
  principle: string
  helpUrl?: string
  nodesCount: number
  nodes: Array<{
    target: string[]
    html: string
    failureSummary?: string
  }>
}

type ScannedPage = {
  url: string
  normalizedUrl: string
  httpStatus: number | null
  loadMs: number | null
  issues: ReportIssue[]
  discoveredUrls: string[]
}

const impactOrder: Record<Impact, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3
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

  issues.forEach((issue) => {
    summary.byImpact[issue.impact] += 1
  })

  return summary
}

const pickTopIssues = (issues: ReportIssue[], count: number) => {
  return [...issues]
    .sort((a, b) => {
      const aOrder = impactOrder[a.impact] ?? 99
      const bOrder = impactOrder[b.impact] ?? 99
      if (aOrder !== bOrder) return aOrder - bOrder
      return (b.nodesCount || 0) - (a.nodesCount || 0)
    })
    .slice(0, count)
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

const truncateText = (value: unknown, limit: number) => {
  const text = typeof value === 'string' ? value : ''
  if (text.length <= limit) return text
  return `${text.slice(0, Math.max(0, limit - 1)).trim()}...`
}

const normalizeUrlForCompare = (rawUrl: string): string => {
  const parsed = new URL(rawUrl)
  parsed.hash = ''

  TRACKING_QUERY_PARAMS.forEach((key) => {
    parsed.searchParams.delete(key)
  })

  parsed.hostname = parsed.hostname.toLowerCase()
  parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/'

  return parsed.toString()
}

const normalizeUrlOrNull = (rawUrl: unknown): string | null => {
  if (typeof rawUrl !== 'string') return null
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`
  try {
    const parsed = new URL(withProtocol)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return normalizeUrlForCompare(parsed.toString())
  } catch {
    return null
  }
}

const buildSelectorFingerprint = (nodes: Array<{ target: string[] }>) => {
  const selectors = nodes
    .map((node) => (Array.isArray(node.target) ? node.target.join(' > ').trim() : ''))
    .filter(Boolean)
    .slice(0, 3)

  return selectors.length > 0 ? selectors.join(' | ') : 'document'
}

const normalizeAuditResults = (results: any): ReportIssue[] => {
  const violations = Array.isArray(results?.violations) ? results.violations : []

  return violations.map((violation: any) => {
    const nodes = Array.isArray(violation.nodes)
      ? violation.nodes.map((node: any) => ({
          target: Array.isArray(node?.target) ? node.target : [],
          html: truncateText(node?.html || '', 1_500),
          failureSummary: truncateText(node?.failureSummary || '', 300)
        }))
      : []

    const guidance = getGuidance(violation.id, violation.description, violation.help)
    const copy = createIssueCopyMap(DEFAULT_ISSUE_LOCALE, {
      title: guidance.title,
      description: guidance.description,
      recommendation: guidance.recommendation
    })

    return {
      id: normalizeRuleId(violation.id || violation.help || 'unknown'),
      title: guidance.title,
      impact: normalizeImpact(violation.impact),
      description: guidance.description,
      recommendation: guidance.recommendation,
      copy,
      wcag: guidance.wcag,
      wcagLevel: getWcagLevel(violation.id, guidance.wcag),
      principle: guidance.principle,
      helpUrl: violation.helpUrl,
      nodesCount: nodes.length,
      nodes
    }
  })
}

const gotoWithRetry = async (page: any, url: string) => {
  let lastError: unknown = null

  for (let attempt = 1; attempt <= NAVIGATION_RETRY_COUNT; attempt += 1) {
    try {
      return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
    } catch (error: unknown) {
      lastError = error
      if (attempt < NAVIGATION_RETRY_COUNT) {
        await delay(NAVIGATION_RETRY_DELAY_MS)
      }
    }
  }

  throw new Error(`Nacitanie stranky zlyhalo: ${getErrorMessage(lastError)}`)
}

const discoverInternalLinks = async (page: any, currentUrl: string, rootHost: string) => {
  const rawLinks = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'))
    return anchors.map((anchor) => (anchor as HTMLAnchorElement).getAttribute('href') || '')
  })

  const discovered = new Set<string>()
  for (const rawLink of rawLinks) {
    if (typeof rawLink !== 'string') continue
    const trimmed = rawLink.trim()
    if (!trimmed) continue

    const lowered = trimmed.toLowerCase()
    if (lowered.startsWith('javascript:') || lowered.startsWith('mailto:') || lowered.startsWith('tel:')) continue

    try {
      const parsed = new URL(trimmed, currentUrl)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue
      if (parsed.host.toLowerCase() !== rootHost) continue

      const normalized = normalizeUrlForCompare(parsed.toString())
      discovered.add(normalized)
      if (discovered.size >= getMaxLinksPerPage()) break
    } catch {
      // ignore malformed links
    }
  }

  return [...discovered]
}

const scanSinglePage = async (page: any, url: string, rootHost: string): Promise<ScannedPage> => {
  const startedAt = Date.now()
  const response = await gotoWithRetry(page, url)

  await page.addScriptTag({ content: axe.source })
  const results = await withTimeout(
    page.evaluate(async (axeTags) => {
      // @ts-ignore
      return await window.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: axeTags
        },
        resultTypes: ['violations']
      })
    }, [...AXE_TAGS]),
    AXE_RUN_TIMEOUT_MS,
    'Axe evaluation timeout.'
  )

  const discoveredUrls = await discoverInternalLinks(page, url, rootHost)
  return {
    url,
    normalizedUrl: normalizeUrlForCompare(url),
    httpStatus: response ? Number(response.status()) : null,
    loadMs: Date.now() - startedAt,
    issues: normalizeAuditResults(results),
    discoveredUrls
  }
}

const queueDiscoveredPages = async (
  supabase: SupabaseAdminClient,
  job: SiteAuditJobRow,
  page: SiteAuditPageRow,
  discoveredUrls: string[]
) => {
  const nextDepth = Number(page.depth || 0) + 1
  if (nextDepth > Number(job.max_depth || 0)) return 0
  if (!Array.isArray(discoveredUrls) || discoveredUrls.length === 0) return 0

  const unique = Array.from(new Set(discoveredUrls))
  if (unique.length === 0) return 0

  const rows = unique.map((url) => ({
    job_id: job.id,
    url,
    normalized_url: normalizeUrlForCompare(url),
    depth: nextDepth,
    discovered_from_url: page.url,
    status: 'queued'
  }))

  const insertResult = await supabase
    .from('audit_job_pages')
    .upsert(rows, { onConflict: 'job_id,normalized_url', ignoreDuplicates: true })
    .select('id')

  if (insertResult.error || !Array.isArray(insertResult.data)) return 0
  return insertResult.data.length
}

const syncJobCounters = async (supabase: SupabaseAdminClient, jobId: string) => {
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

const claimNextQueuedPage = async (supabase: SupabaseAdminClient, jobId: string) => {
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

const skipRemainingQueuedPages = async (supabase: SupabaseAdminClient, jobId: string) => {
  await supabase
    .from('audit_job_pages')
    .update({ status: 'skipped', error_message: 'Page limit reached.' })
    .eq('job_id', jobId)
    .eq('status', 'queued')
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
      copy: raw?.copy && typeof raw.copy === 'object' ? (raw.copy as IssueCopyMap) : createIssueCopyMap('sk', raw),
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
    const currentOrder = impactOrder[existing.impact] ?? 99
    const nextOrder = impactOrder[baseIssue.impact] ?? 99
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

  return [...clusters.values()]
    .map((item) => ({
      ...item.baseIssue,
      impact: item.impact,
      nodesCount: item.nodesCount
    }))
    .sort((a, b) => {
      const aOrder = impactOrder[a.impact] ?? 99
      const bOrder = impactOrder[b.impact] ?? 99
      if (aOrder !== bOrder) return aOrder - bOrder
      return (b.nodesCount || 0) - (a.nodesCount || 0)
    })
}

const finalizeSiteAuditJob = async (supabase: SupabaseAdminClient, job: SiteAuditJobRow) => {
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

  return {
    auditId: auditInsert.id as string,
    summary,
    issues: localizeIssues(issues, locale, DEFAULT_ISSUE_LOCALE),
    counters
  }
}

const markJobFailed = async (supabase: SupabaseAdminClient, jobId: string, message: string) => {
  await supabase
    .from('audit_jobs')
    .update({
      status: 'failed',
      error_message: message,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId)
}

const runSiteAuditJob = async (supabase: SupabaseAdminClient, job: SiteAuditJobRow) => {
  let browser: Awaited<ReturnType<typeof playwright.launch>> | null = null

  try {
    const rootHost = new URL(job.root_url).host.toLowerCase()
    const isLocal = process.env.NETLIFY_DEV === 'true'
    browser = await playwright.launch({
      args: chromium.args,
      executablePath: isLocal
        ? undefined
        : await chromium.executablePath(
            'https://github.com/sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar'
          ),
      headless: (chromium as any).headless
    })

    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS)
    page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS)

    await page.route('**/*', (route) => {
      const type = route.request().resourceType()
      if (type === 'image' || type === 'media' || type === 'font') {
        return route.abort()
      }
      return route.continue()
    })

    while (true) {
      const { data: liveJob } = await supabase.from('audit_jobs').select('id, status').eq('id', job.id).maybeSingle()

      const status = (liveJob?.status || job.status) as SiteAuditStatus
      if (status === 'cancelled') {
        return { cancelled: true }
      }

      const counters = await syncJobCounters(supabase, job.id)
      const processed = counters.pagesScanned + counters.pagesFailed
      if (processed >= Number(job.pages_limit || 0)) {
        await skipRemainingQueuedPages(supabase, job.id)
        break
      }

      const nextPage = await claimNextQueuedPage(supabase, job.id)
      if (!nextPage?.id) break

      if (Number(nextPage.depth || 0) > Number(job.max_depth || 0)) {
        await supabase
          .from('audit_job_pages')
          .update({
            status: 'skipped',
            error_message: 'Depth limit reached.',
            scanned_at: new Date().toISOString()
          })
          .eq('id', nextPage.id)
        continue
      }

      try {
        const scannedPage = await scanSinglePage(page, nextPage.url, rootHost)
        const issueRows = buildIssueRows(job.id, nextPage.id, scannedPage.issues)
        if (issueRows.length > 0) {
          const issueInsert = await supabase.from('audit_job_issues').insert(issueRows)
          if (issueInsert.error) {
            throw new Error(`Issue insert failed: ${issueInsert.error.message || 'unknown error'}`)
          }
        }

        await queueDiscoveredPages(supabase, job, nextPage, scannedPage.discoveredUrls)

        await supabase
          .from('audit_job_pages')
          .update({
            status: 'done',
            url: scannedPage.url,
            normalized_url: scannedPage.normalizedUrl,
            http_status: scannedPage.httpStatus,
            load_ms: scannedPage.loadMs,
            issues_count: scannedPage.issues.length,
            scanned_at: new Date().toISOString(),
            error_message: null
          })
          .eq('id', nextPage.id)
      } catch (scanError) {
        await supabase
          .from('audit_job_pages')
          .update({
            status: 'failed',
            scanned_at: new Date().toISOString(),
            error_message: truncateText(getErrorMessage(scanError), 600)
          })
          .eq('id', nextPage.id)
      }
    }

    await finalizeSiteAuditJob(supabase, job)
    return { cancelled: false }
  } catch (error) {
    await markJobFailed(supabase, job.id, truncateText(getErrorMessage(error), 700))
    return { cancelled: false }
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('Site audit browser close error:', getErrorMessage(closeError))
      }
    }
  }
}

export const createSupabaseAdminClient = () => {
  if (!supabaseUrl || !supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
}

export const getBearerToken = (event: HandlerEvent) => {
  const authHeader = event.headers.authorization || event.headers.Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.replace('Bearer ', '').trim()
}

export const getAuthUser = async (supabase: SupabaseAdminClient, token: string) => {
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.id) {
    return { userId: null, error: 'Neplatne prihlasenie.' }
  }
  return { userId: data.user.id as string, error: null }
}

export const jsonResponse = (statusCode: number, payload: Record<string, unknown>) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})

export const errorResponse = (statusCode: number, message: string) => jsonResponse(statusCode, { error: message })

export const normalizeAuditUrl = (value: unknown) => normalizeUrlOrNull(value)

export const normalizeSiteAuditMode = (value: unknown): SiteAuditMode => {
  return value === 'full' ? 'full' : 'quick'
}

export const normalizeSiteAuditLocale = (value: unknown): SiteAuditLocale => {
  const locale = normalizeIssueLocale(value, DEFAULT_ISSUE_LOCALE)
  return locale === 'en' ? 'en' : 'sk'
}

export const normalizeSiteAuditTier = (value: unknown): SiteAuditTier => {
  if (value === 'pro' || value === 'basic') return value
  return 'none'
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
  if (!profile) {
    return { allowed: false, reason: 'Profil sa nepodarilo nacitat.' }
  }
  if (profile.isAdmin) {
    return { allowed: true, reason: '' }
  }
  if (!profile.isPaid) {
    return { allowed: false, reason: 'Site audit je dostupny iba pre plateny audit plan.' }
  }
  if (profile.paidAuditCredits <= 0) {
    return { allowed: false, reason: 'Nemate kredit na zakladny audit. Objednajte dalsi audit.' }
  }

  return { allowed: true, reason: '' }
}

export const getExistingActiveSiteAuditJob = async (supabase: SupabaseAdminClient, userId: string) => {
  const { data } = await supabase
    .from('audit_jobs')
    .select('id, status, root_url, mode, pages_limit, pages_scanned, pages_failed, created_at')
    .eq('user_id', userId)
    .in('status', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data || null
}

type CreateSiteAuditJobInput = {
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

  if (error) {
    return { data: null, error: 'Nacitanie site audit jobu zlyhalo.' }
  }
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

  if (updateResult.error) {
    return { data: null, error: 'Zrusenie site audit jobu zlyhalo.' }
  }

  if (!updateResult.data?.id) {
    return { data: null, error: 'Site audit job sa neda zrusit v tomto stave.' }
  }

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

export const getSiteAuditResult = async (
  supabase: SupabaseAdminClient,
  job: SiteAuditJobRow,
  localeInput: unknown
) => {
  if (!job.audit_id) {
    return { data: null, error: 'Job nema priradeny audit report.' }
  }

  const locale = normalizeIssueLocale(localeInput, DEFAULT_ISSUE_LOCALE)
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('id, url, audit_kind, summary, top_issues, created_at, scope, pages_scanned')
    .eq('id', job.audit_id)
    .maybeSingle()

  if (auditError || !audit?.id) {
    return { data: null, error: 'Nacitanie finalneho auditu zlyhalo.' }
  }

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
        tags: [...AXE_TAGS],
        note: 'Automatizovane testy nepokrivaju vsetky kriteria; cast vyzaduje manualnu kontrolu.',
        locale
      }
    },
    error: null
  }
}

export const processQueuedSiteAuditJobs = async (
  supabase: SupabaseAdminClient,
  options?: { maxJobs?: number }
) => {
  const maxJobs = clampNumber(options?.maxJobs, 1, 10, getMaxJobsPerWorker())

  const { data: queuedJobs, error: queuedError } = await supabase
    .from('audit_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(maxJobs)

  if (queuedError) {
    throw new Error('Nacitanie queued site audit jobov zlyhalo.')
  }

  let processed = 0
  let failed = 0
  let skipped = 0

  for (const item of queuedJobs || []) {
    const claim = await supabase
      .from('audit_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: null
      })
      .eq('id', item.id)
      .eq('status', 'queued')
      .select('*')
      .maybeSingle()

    if (claim.error || !claim.data?.id) {
      skipped += 1
      continue
    }

    try {
      const result = await runSiteAuditJob(supabase, claim.data as SiteAuditJobRow)
      if (!result.cancelled) {
        processed += 1
      }
    } catch (error) {
      failed += 1
      await markJobFailed(supabase, claim.data.id, truncateText(getErrorMessage(error), 700))
    }
  }

  return {
    queued: (queuedJobs || []).length,
    processed,
    failed,
    skipped
  }
}

import type { HandlerEvent } from '@netlify/functions'
import chromium from '@sparticuz/chromium-min'
import { chromium as playwright } from 'playwright-core'
import axe from 'axe-core'
import { createClient } from '@supabase/supabase-js'
import { getGuidance, getWcagLevel } from './audit-guidance'

declare const process: {
  env: Record<string, string | undefined>
}

process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'

export type Impact = 'critical' | 'serious' | 'moderate' | 'minor'
export type MonitoringCadenceMode = 'interval_days' | 'monthly_runs'
export type MonitoringProfile = 'wad' | 'eaa'
export type MonitoringTier = 'none' | 'basic' | 'pro'

export type Summary = {
  total: number
  byImpact: Record<Impact, number>
}

export type ReportIssue = {
  id: string
  title: string
  impact: Impact
  description: string
  recommendation: string
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

type MonitoringDiffInput = {
  previousSummary?: Summary | null
  previousIssueIds?: string[] | null
  currentSummary: Summary
  currentIssueIds: string[]
}

type RunStoredAuditInput = {
  supabase: SupabaseAdminClient
  userId: string
  url: string
  auditKind?: 'paid' | 'free'
}

export type MonitoringEntitlement = {
  plan: string
  role: string | null
  paidAuditCompleted: boolean
  monitoringActive: boolean
  monitoringUntil: string | null
  monitoringTier: MonitoringTier
  monitoringDomainsLimit: number
  monitoringMonthlyRuns: number
}

export const monitoringTargetSelect =
  'id, user_id, default_url, profile, active, cadence_mode, cadence_value, anchor_at, last_run_at, next_run_at, created_at, updated_at'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
type SupabaseAdminClient = any

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] as const

const impactOrder: Record<Impact, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3
}

const NAVIGATION_TIMEOUT_MS = 45_000
const AXE_RUN_TIMEOUT_MS = 90_000
const NAVIGATION_RETRY_COUNT = 2
const NAVIGATION_RETRY_DELAY_MS = 1_000

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message
  return String(error || 'Unknown error')
}

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  }) as Promise<T>
}

const gotoWithRetry = async (page: any, url: string) => {
  let lastError: unknown = null

  for (let attempt = 1; attempt <= NAVIGATION_RETRY_COUNT; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
      return
    } catch (error: unknown) {
      lastError = error
      if (attempt < NAVIGATION_RETRY_COUNT) {
        await delay(NAVIGATION_RETRY_DELAY_MS)
      }
    }
  }

  throw new Error(`Nacitanie stranky zlyhalo: ${getErrorMessage(lastError)}`)
}

export const emptySummary = (): Summary => ({
  total: 0,
  byImpact: {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0
  }
})

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
  if (!supabase) return { userId: null, error: 'Chyba konfiguracia Supabase.' }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.id) {
    return { userId: null, error: 'Neplatne prihlasenie.' }
  }
  return { userId: data.user.id, error: null }
}

export const loadMonitoringEntitlement = async (
  supabase: SupabaseAdminClient,
  userId: string
): Promise<MonitoringEntitlement> => {
  const withMonitoring = await supabase
    .from('profiles')
    .select(
      'plan, role, paid_audit_completed, monitoring_active, monitoring_until, monitoring_tier, monitoring_domains_limit, monitoring_monthly_runs'
    )
    .eq('id', userId)
    .maybeSingle()

  if (!withMonitoring.error && withMonitoring.data) {
    const monitoringTier =
      withMonitoring.data.monitoring_tier === 'pro' || withMonitoring.data.monitoring_tier === 'basic'
        ? withMonitoring.data.monitoring_tier
        : 'none'
    const rawDomainsLimit = Number(withMonitoring.data.monitoring_domains_limit || 0)
    const rawMonthlyRuns = Number(withMonitoring.data.monitoring_monthly_runs || 0)
    const fallbackDomainsLimit = monitoringTier === 'pro' ? 8 : monitoringTier === 'basic' ? 2 : 0
    const fallbackMonthlyRuns = monitoringTier === 'pro' ? 8 : monitoringTier === 'basic' ? 4 : 0
    const monitoringDomainsLimit = rawDomainsLimit > 0 ? rawDomainsLimit : fallbackDomainsLimit
    const monitoringMonthlyRuns = rawMonthlyRuns > 0 ? rawMonthlyRuns : fallbackMonthlyRuns

    return {
      plan: withMonitoring.data.plan || 'free',
      role: withMonitoring.data.role || null,
      paidAuditCompleted: !!withMonitoring.data.paid_audit_completed,
      monitoringActive: !!withMonitoring.data.monitoring_active,
      monitoringUntil: withMonitoring.data.monitoring_until || null,
      monitoringTier,
      monitoringDomainsLimit,
      monitoringMonthlyRuns
    }
  }

  const fallback = await supabase
    .from('profiles')
    .select('plan, role, paid_audit_completed')
    .eq('id', userId)
    .maybeSingle()
  return {
    plan: fallback.data?.plan || 'free',
    role: fallback.data?.role || null,
    paidAuditCompleted: !!fallback.data?.paid_audit_completed,
    monitoringActive: false,
    monitoringUntil: null,
    monitoringTier: 'none',
    monitoringDomainsLimit: 0,
    monitoringMonthlyRuns: 0
  }
}

export const hasMonitoringPrerequisite = (entitlement: MonitoringEntitlement) => {
  if (entitlement.role === 'admin') return true
  return !!entitlement.paidAuditCompleted
}

export const hasMonitoringAccess = (entitlement: MonitoringEntitlement) => {
  if (entitlement.role === 'admin') return true
  if (entitlement.monitoringActive) {
    if (!entitlement.monitoringUntil) return true
    return new Date(entitlement.monitoringUntil).getTime() > Date.now()
  }
  return false
}

export const getLatestAuditUrl = async (supabase: SupabaseAdminClient, userId: string) => {
  const { data } = await supabase
    .from('audits')
    .select('url, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.url || null
}

export const getMonitoringTarget = async (
  supabase: SupabaseAdminClient,
  userId: string
) => {
  const { data, error } = await supabase
    .from('monitoring_targets')
    .select(monitoringTargetSelect)
    .eq('user_id', userId)
    .order('active', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { data, error }
}

export const getMonitoringTargets = async (supabase: SupabaseAdminClient, userId: string) => {
  const { data, error } = await supabase
    .from('monitoring_targets')
    .select(monitoringTargetSelect)
    .eq('user_id', userId)
    .order('active', { ascending: false })
    .order('updated_at', { ascending: false })

  return {
    data: Array.isArray(data) ? data : [],
    error
  }
}

export const getMonitoringTargetById = async (
  supabase: SupabaseAdminClient,
  userId: string,
  targetId: string
) => {
  const { data, error } = await supabase
    .from('monitoring_targets')
    .select(monitoringTargetSelect)
    .eq('user_id', userId)
    .eq('id', targetId)
    .maybeSingle()

  return { data, error }
}

export const normalizeAuditUrl = (rawUrl: unknown): string | null => {
  if (typeof rawUrl !== 'string') return null

  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`
  try {
    const parsed = new URL(withProtocol)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

export const normalizeMonitoringUrlForCompare = (rawUrl: unknown): string => {
  const parsed = normalizeAuditUrl(rawUrl)
  if (!parsed) return ''
  return parsed.replace(/\/+$/, '').toLowerCase()
}

export const normalizeMonitoringProfile = (value: unknown): MonitoringProfile => {
  if (value === 'eaa') return 'eaa'
  return 'wad'
}

export const normalizeMonitoringTier = (value: unknown): MonitoringTier => {
  if (value === 'pro') return 'pro'
  if (value === 'basic') return 'basic'
  return 'none'
}

export const monitoringWeekdaysByTier = (tier: MonitoringTier): number[] => {
  if (tier === 'pro') return [1, 4]
  return [1]
}

export const computeNextWeeklyRunAt = (from: Date, weekdays: number[]) => {
  const normalized: number[] = []
  weekdays.forEach((day) => {
    if (!Number.isInteger(day) || day < 0 || day > 6) return
    if (!normalized.includes(day)) normalized.push(day)
  })
  const activeDays = normalized.length > 0 ? normalized : [1]
  const daySet = new Set(activeDays)
  const next = new Date(from.getTime())

  for (let offset = 1; offset <= 14; offset += 1) {
    next.setTime(from.getTime())
    next.setUTCDate(from.getUTCDate() + offset)
    if (daySet.has(next.getUTCDay())) {
      return next
    }
  }

  next.setTime(from.getTime())
  next.setUTCDate(from.getUTCDate() + 7)
  return next
}

export const computeNextRunAtByTier = (from: Date, tier: MonitoringTier) => {
  return computeNextWeeklyRunAt(from, monitoringWeekdaysByTier(tier))
}

export const normalizeCadenceMode = (value: unknown): MonitoringCadenceMode => {
  if (value === 'monthly_runs') return 'monthly_runs'
  return 'interval_days'
}

export const normalizeCadenceValue = (mode: MonitoringCadenceMode, value: unknown) => {
  const parsed = Number(value)

  if (mode === 'monthly_runs') {
    if (!Number.isFinite(parsed)) return 2
    return Math.min(8, Math.max(2, Math.round(parsed)))
  }

  if (!Number.isFinite(parsed)) return 14
  return Math.min(60, Math.max(1, Math.round(parsed)))
}

export const cadenceDays = (mode: MonitoringCadenceMode, value: number) => {
  if (mode === 'monthly_runs') {
    const monthlyRuns = Math.min(8, Math.max(2, Math.round(value)))
    return Math.max(1, Math.round(30 / monthlyRuns))
  }
  return Math.max(1, value)
}

export const computeNextRunAt = (from: Date, mode: MonitoringCadenceMode, value: number) => {
  const next = new Date(from.getTime())
  next.setUTCDate(next.getUTCDate() + cadenceDays(mode, value))
  return next
}

export const extractIssueIds = (issues?: ReportIssue[] | null) => {
  if (!Array.isArray(issues)) return []
  const ids = new Set<string>()
  issues.forEach((issue) => {
    const raw = typeof issue?.id === 'string' ? issue.id.trim() : ''
    if (raw) ids.add(raw)
  })
  return [...ids]
}

export const normalizeSummary = (summary: any): Summary => {
  if (!summary || typeof summary !== 'object') return emptySummary()
  const byImpact = summary.byImpact || {}
  return {
    total: Number(summary.total || 0),
    byImpact: {
      critical: Number(byImpact.critical || 0),
      serious: Number(byImpact.serious || 0),
      moderate: Number(byImpact.moderate || 0),
      minor: Number(byImpact.minor || 0)
    }
  }
}

export const buildMonitoringDiff = (input: MonitoringDiffInput) => {
  const previousSummary = normalizeSummary(input.previousSummary)
  const previousIds = new Set(Array.isArray(input.previousIssueIds) ? input.previousIssueIds : [])
  const currentIds = new Set(Array.isArray(input.currentIssueIds) ? input.currentIssueIds : [])

  let newIssues = 0
  let resolvedIssues = 0

  currentIds.forEach((id) => {
    if (!previousIds.has(id)) newIssues += 1
  })
  previousIds.forEach((id) => {
    if (!currentIds.has(id)) resolvedIssues += 1
  })

  return {
    totalDelta: input.currentSummary.total - previousSummary.total,
    byImpactDelta: {
      critical: input.currentSummary.byImpact.critical - previousSummary.byImpact.critical,
      serious: input.currentSummary.byImpact.serious - previousSummary.byImpact.serious,
      moderate: input.currentSummary.byImpact.moderate - previousSummary.byImpact.moderate,
      minor: input.currentSummary.byImpact.minor - previousSummary.byImpact.minor
    },
    newIssues,
    resolvedIssues
  }
}

const normalizeImpact = (value?: string): Impact => {
  if (value === 'critical' || value === 'serious' || value === 'moderate' || value === 'minor') {
    return value
  }
  return 'minor'
}

const buildSummary = (issues: ReportIssue[]): Summary => {
  const summary = emptySummary()
  summary.total = issues.length

  issues.forEach((issue) => {
    summary.byImpact[issue.impact] += 1
  })

  return summary
}

const stripIssueForFree = (issue: ReportIssue): ReportIssue => ({
  ...issue,
  recommendation: '',
  nodes: []
})

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

function normalizeAuditResults(results: any): ReportIssue[] {
  const violations = Array.isArray(results?.violations) ? results.violations : []

  return violations.map((v: any) => {
    const impact = normalizeImpact(v.impact)
    const nodes = Array.isArray(v.nodes)
      ? v.nodes.map((n: any) => ({
          target: Array.isArray(n.target) ? n.target : [],
          html: n.html || '',
          failureSummary: n.failureSummary
        }))
      : []

    const guidance = getGuidance(v.id, v.description, v.help)
    return {
      id: v.id || v.help || 'unknown',
      title: guidance.title,
      impact,
      description: guidance.description,
      recommendation: guidance.recommendation,
      wcag: guidance.wcag,
      wcagLevel: getWcagLevel(v.id, guidance.wcag),
      principle: guidance.principle,
      helpUrl: v.helpUrl,
      nodesCount: nodes.length,
      nodes
    }
  })
}

export const runStoredAudit = async ({ supabase, userId, url, auditKind = 'paid' }: RunStoredAuditInput) => {
  let browser: Awaited<ReturnType<typeof playwright.launch>> | null = null

  try {
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

    await gotoWithRetry(page, url)
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

    const issues = normalizeAuditResults(results)
    const summary = buildSummary(issues)
    const topIssues = pickTopIssues(issues, 3)
    const storedTopIssues = auditKind === 'paid' ? topIssues : topIssues.map(stripIssueForFree)

    const { data: auditInsert, error: auditError } = await supabase
      .from('audits')
      .insert({
        user_id: userId,
        url,
        audit_kind: auditKind,
        summary,
        top_issues: storedTopIssues
      })
      .select('id')
      .single()

    if (auditError || !auditInsert?.id) {
      throw new Error('Ulozenie auditu zlyhalo.')
    }

    const { error: fullError } = await supabase.from('audit_full').insert({
      audit_id: auditInsert.id,
      user_id: userId,
      url,
      full_issues: issues
    })

    if (fullError) {
      await supabase.from('audits').delete().eq('id', auditInsert.id)
      throw new Error('Ulozenie detailu auditu zlyhalo.')
    }

    return {
      auditId: auditInsert.id as string,
      summary,
      issues,
      topIssues
    }
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch (error) {
        console.error('Monitoring browser close error:', getErrorMessage(error))
      }
    }
  }
}

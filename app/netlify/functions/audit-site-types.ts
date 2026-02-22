export type SupabaseAdminClient = any

export type SiteAuditMode = 'quick' | 'full'
export type SiteAuditStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
export type SiteAuditLocale = 'sk' | 'en'
export type SiteAuditTier = 'none' | 'basic' | 'pro'
export type Impact = 'critical' | 'serious' | 'moderate' | 'minor'

export type SiteAuditProfile = {
  id: string
  role: string | null
  plan: string
  auditTier: SiteAuditTier
  paidAuditCredits: number
  paidAuditCompleted: boolean
  isAdmin: boolean
  isPaid: boolean
}

export type SiteAuditJobRow = {
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

export type SiteAuditPageStatus = 'queued' | 'running' | 'done' | 'failed' | 'skipped'

export type SiteAuditPageRow = {
  id: number
  job_id: string
  url: string
  normalized_url: string
  depth: number
  status: SiteAuditPageStatus
}

export type IssueCopyValue = {
  title?: string
  description?: string
  recommendation?: string
  source?: 'static' | 'ai' | string
  promptVersion?: string
  generatedAt?: string
}

export type IssueCopyMap = Record<string, IssueCopyValue>

export type ReportIssue = {
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

export type ScannedPage = {
  url: string
  normalizedUrl: string
  httpStatus: number | null
  loadMs: number | null
  issues: ReportIssue[]
  discoveredUrls: string[]
}

export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] as const

export const IMPACT_ORDER: Record<Impact, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3
}

export const TRACKING_QUERY_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid'
]

export const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}


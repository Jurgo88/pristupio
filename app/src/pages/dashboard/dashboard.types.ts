export type ImpactLevel = 'critical' | 'serious' | 'moderate' | 'minor'

export type DashboardIssueNode = {
  target?: string[]
  failureSummary?: string
  html?: string
}

export type DashboardIssue = {
  id?: string
  impact?: ImpactLevel | string
  title?: string
  description?: string
  recommendation?: string
  wcag?: string
  wcagLevel?: string
  principle?: string
  helpUrl?: string
  nodesCount?: number
  nodes?: DashboardIssueNode[]
}

export type DashboardReportSummary = {
  total?: number
  byImpact?: Partial<Record<ImpactLevel, number>>
}

export type DashboardReport = {
  summary?: DashboardReportSummary
  issues?: DashboardIssue[]
}

export type AuditHistoryItem = {
  id: string
  url: string
  created_at?: string
  audit_kind?: 'paid' | 'free' | string
  summary?: DashboardReportSummary
}

export type ProfileOption = {
  value: 'wad' | 'eaa'
  title: string
  subtitle: string
}

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

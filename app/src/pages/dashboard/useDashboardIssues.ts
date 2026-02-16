import { computed, ref, watch, type Ref } from 'vue'
import type { DashboardIssue, DashboardReport, DashboardReportSummary, ImpactLevel } from './dashboard.types'

export const useDashboardIssues = (report: Ref<DashboardReport | null | undefined>) => {
  const ISSUE_BATCH_SIZE = 25
  const selectedPrinciple = ref('')
  const selectedImpact = ref('')
  const searchText = ref('')
  const openDetails = ref<Record<string, boolean>>({})
  const visibleIssuesCount = ref(ISSUE_BATCH_SIZE)

  const issueTotal = (summary: DashboardReportSummary | null | undefined) => summary?.total ?? 0
  const issueHigh = (summary: DashboardReportSummary | null | undefined) =>
    (summary?.byImpact?.critical || 0) + (summary?.byImpact?.serious || 0)

  const highCount = computed(() => {
    const byImpact = report.value?.summary.byImpact
    return (byImpact?.critical || 0) + (byImpact?.serious || 0)
  })

  const totalIssues = computed(() => {
    const byImpact = report.value?.summary.byImpact
    return (
      (byImpact?.critical || 0) +
      (byImpact?.serious || 0) +
      (byImpact?.moderate || 0) +
      (byImpact?.minor || 0)
    )
  })

  const medCount = computed(() => {
    return report.value?.summary.byImpact.moderate || 0
  })

  const lowCount = computed(() => {
    return report.value?.summary.byImpact.minor || 0
  })

  const auditScore = computed(() => {
    const byImpact = report.value?.summary.byImpact
    if (!byImpact) return 0
    const total = totalIssues.value
    if (total === 0) return 100
    const penalty =
      (byImpact.critical || 0) * 18 +
      (byImpact.serious || 0) * 10 +
      (byImpact.moderate || 0) * 5 +
      (byImpact.minor || 0) * 2

    const score = 100 / (1 + penalty / 60)
    return Math.max(0, Math.round(score))
  })

  const criticalPercent = computed(() => {
    const total = totalIssues.value
    if (total === 0) return 0
    return Math.round((highCount.value / total) * 100)
  })

  const moderatePercent = computed(() => {
    const total = totalIssues.value
    if (total === 0) return 0
    return Math.round((medCount.value / total) * 100)
  })

  const minorPercent = computed(() => {
    const total = totalIssues.value
    if (total === 0) return 0
    return Math.round((lowCount.value / total) * 100)
  })

  const impactClass = (impact: string) => {
    if (impact === 'critical') return 'impact-critical'
    if (impact === 'serious') return 'impact-serious'
    if (impact === 'moderate') return 'impact-moderate'
    return 'impact-minor'
  }

  const principleOptions = computed(() => {
    const issues = report.value?.issues || []
    const unique = new Set(issues.map((i) => i.principle).filter(Boolean))
    return Array.from(unique)
  })

  const filteredIssues = computed(() => {
    const issues = report.value?.issues || []
    const term = searchText.value.trim().toLowerCase()

    const filtered = issues.filter((i: DashboardIssue) => {
      const principleOk = !selectedPrinciple.value || i.principle === selectedPrinciple.value
      const impactOk = !selectedImpact.value || i.impact === selectedImpact.value
      const text = `${i.title || ''} ${i.description || ''} ${i.recommendation || ''} ${i.wcag || ''} ${i.principle || ''}`.toLowerCase()
      const searchOk = !term || text.includes(term)
      return principleOk && impactOk && searchOk
    })

    const order: Record<ImpactLevel, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 }
    return filtered.sort((a: DashboardIssue, b: DashboardIssue) => {
      const aOrder = order[a.impact || ''] ?? 99
      const bOrder = order[b.impact || ''] ?? 99
      if (aOrder !== bOrder) return aOrder - bOrder
      return (b.nodesCount || 0) - (a.nodesCount || 0)
    })
  })

  const visibleIssues = computed(() => filteredIssues.value.slice(0, visibleIssuesCount.value))
  const hasMoreIssues = computed(() => filteredIssues.value.length > visibleIssuesCount.value)

  const loadMoreIssues = () => {
    visibleIssuesCount.value += ISSUE_BATCH_SIZE
  }

  watch([selectedPrinciple, selectedImpact, searchText, report], () => {
    visibleIssuesCount.value = ISSUE_BATCH_SIZE
  })

  watch(filteredIssues, (issues) => {
    if (visibleIssuesCount.value > issues.length && issues.length > 0) {
      visibleIssuesCount.value = Math.max(ISSUE_BATCH_SIZE, issues.length)
    }
  })

  const clearFilters = () => {
    selectedPrinciple.value = ''
    selectedImpact.value = ''
    searchText.value = ''
    visibleIssuesCount.value = ISSUE_BATCH_SIZE
  }

  const violationKey = (violation: DashboardIssue, index: number) => `${violation.id}-${index}`

  const toggleDetails = (key: string) => {
    openDetails.value = { ...openDetails.value, [key]: !openDetails.value[key] }
  }

  const isOpen = (key: string) => !!openDetails.value[key]

  return {
    selectedPrinciple,
    selectedImpact,
    searchText,
    openDetails,
    issueTotal,
    issueHigh,
    highCount,
    medCount,
    lowCount,
    auditScore,
    criticalPercent,
    moderatePercent,
    minorPercent,
    impactClass,
    principleOptions,
    filteredIssues,
    visibleIssues,
    hasMoreIssues,
    loadMoreIssues,
    clearFilters,
    violationKey,
    toggleDetails,
    isOpen
  }
}

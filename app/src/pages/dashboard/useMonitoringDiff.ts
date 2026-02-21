import { computed, type Ref } from 'vue'

type MonitoringDiffJson = {
  totalDelta?: number
  newIssues?: number
  resolvedIssues?: number
  byImpactDelta?: Record<string, number>
}

type MonitoringRunLike = {
  diff_json?: MonitoringDiffJson | null
}

type LatestSuccessRunByTarget = Record<string, MonitoringRunLike | undefined>

type MonitoringDiffMeta = {
  totalDelta: number
  newIssues: number
  resolvedIssues: number
  criticalDelta: number
  worsening: boolean
  improving: boolean
}

const signedDelta = (value: number) => {
  if (!Number.isFinite(value) || value === 0) return '0'
  return value > 0 ? `+${value}` : String(value)
}

export const useMonitoringDiff = (latestSuccessRunByTarget: Ref<LatestSuccessRunByTarget>) => {
  const monitoringDiffMeta = (targetId: string): MonitoringDiffMeta | null => {
    const run = latestSuccessRunByTarget.value?.[targetId]
    const diff = (run?.diff_json || {}) as MonitoringDiffJson
    if (!diff || typeof diff !== 'object') return null

    const totalDelta = Number(diff.totalDelta || 0)
    const newIssues = Number(diff.newIssues || 0)
    const resolvedIssues = Number(diff.resolvedIssues || 0)
    const byImpactDelta = (diff.byImpactDelta || {}) as Record<string, number>
    const criticalDelta = Number(byImpactDelta.critical || 0)

    return {
      totalDelta,
      newIssues: Math.max(0, newIssues),
      resolvedIssues: Math.max(0, resolvedIssues),
      criticalDelta,
      worsening: totalDelta > 0 || criticalDelta > 0,
      improving: totalDelta < 0
    }
  }

  const monitoringDiffLabel = (targetId: string) => {
    const meta = monitoringDiffMeta(targetId)
    if (!meta) return ''
    return `Zmena: ${signedDelta(meta.totalDelta)} | Nové: +${meta.newIssues} | Vyriešené: -${meta.resolvedIssues}`
  }

  const monitoringDiffClass = (targetId: string) => {
    const meta = monitoringDiffMeta(targetId)
    if (!meta) return ''
    if (meta.worsening) return 'diff-pill diff-pill--worsening'
    if (meta.improving) return 'diff-pill diff-pill--improving'
    return 'diff-pill diff-pill--neutral'
  }

  const monitoringWorseningNotice = computed(() => {
    const ids = Object.keys(latestSuccessRunByTarget.value || {})
    let worsenedCount = 0
    ids.forEach((id) => {
      const meta = monitoringDiffMeta(id)
      if (meta?.worsening) worsenedCount += 1
    })
    if (worsenedCount === 0) return ''
    if (worsenedCount === 1) {
      return 'Upozornenie: pri 1 doméne sa monitoring zhoršil oproti minulému auditu.'
    }
    return `Upozornenie: pri ${worsenedCount} doménach sa monitoring zhoršil oproti minulému auditu.`
  })

  return {
    monitoringDiffLabel,
    monitoringDiffClass,
    monitoringWorseningNotice
  }
}

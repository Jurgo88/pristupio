import { computed, ref, type Ref } from 'vue'
import { supabase } from '@/services/supabase'
import type { DashboardIssue, DashboardReport } from './dashboard.types'

type UseDashboardExportParams = {
  report: Ref<DashboardReport | null | undefined>
  targetUrl: Ref<string>
  selectedProfile: Ref<'wad' | 'eaa'>
  profileLabel: Ref<string>
  selectedPrinciple: Ref<string>
  selectedImpact: Ref<string>
  searchText: Ref<string>
  filteredIssues: Ref<DashboardIssue[]>
}

export const useDashboardExport = ({
  report,
  targetUrl,
  selectedProfile,
  profileLabel,
  selectedPrinciple,
  selectedImpact,
  searchText,
  filteredIssues
}: UseDashboardExportParams) => {
  const exporting = ref(false)
  const exportError = ref('')
  const exportProgress = ref(0)
  const exportStatus = ref('')
  let progressTimer: ReturnType<typeof setInterval> | null = null

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message
    return 'Export sa nepodaril.'
  }

  const stopProgressTimer = () => {
    if (!progressTimer) return
    clearInterval(progressTimer)
    progressTimer = null
  }

  const startProgressTimer = () => {
    stopProgressTimer()
    progressTimer = setInterval(() => {
      if (exportProgress.value >= 88) return
      const step = exportProgress.value < 40 ? 6 : exportProgress.value < 70 ? 3 : 1
      exportProgress.value = Math.min(88, exportProgress.value + step)
    }, 420)
  }

  const trimmedTargetUrl = computed(() => targetUrl.value.trim())

  const buildSummary = (issues: DashboardIssue[]) => {
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
      const impact = issue?.impact
      if (impact && summary.byImpact[impact as keyof typeof summary.byImpact] !== undefined) {
        summary.byImpact[impact as keyof typeof summary.byImpact] += 1
      }
    })

    return summary
  }

  const buildFileName = () => {
    const date = new Date().toISOString().slice(0, 10)
    const rawUrl = trimmedTargetUrl.value
    let host = 'web'

    if (rawUrl) {
      try {
        const withProtocol = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
        host = new URL(withProtocol).hostname
      } catch (_error) {
        host = rawUrl
      }
    }

    host = host.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    return `wcag-report-${host || 'web'}-${date}.pdf`
  }

  const exportPdf = async () => {
    if (!report.value || exporting.value) return
    exporting.value = true
    exportError.value = ''
    exportProgress.value = 8
    exportStatus.value = 'Pripravujem data...'
    startProgressTimer()

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        throw new Error('Prihláste sa, aby ste mohli exportovať report.')
      }

      exportProgress.value = Math.max(exportProgress.value, 18)
      exportStatus.value = 'Pripravujem export...'

      const issues = filteredIssues.value
      const slimIssues = issues.map((issue) => ({
        id: issue.id,
        title: issue.title,
        impact: issue.impact,
        description: issue.description,
        recommendation: issue.recommendation,
        wcag: issue.wcag,
        wcagLevel: issue.wcagLevel,
        principle: issue.principle,
        helpUrl: issue.helpUrl,
        nodesCount: issue.nodesCount
      }))

      const payload = {
        url: trimmedTargetUrl.value,
        profile: selectedProfile.value,
        profileLabel: profileLabel.value,
        filters: {
          principle: selectedPrinciple.value || null,
          impact: selectedImpact.value || null,
          search: searchText.value.trim() || null
        },
        report: {
          summary: buildSummary(slimIssues),
          issues: slimIssues
        }
      }

      const response = await fetch('/.netlify/functions/audit-export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      })
      exportProgress.value = Math.max(exportProgress.value, 74)
      exportStatus.value = 'Generujem PDF na serveri...'

      if (!response.ok) {
        let message = 'Export zlyhal.'
        try {
          const data = await response.json()
          if (data?.error) message = data.error
        } catch (_error) {
          // ignore json parsing errors
        }
        throw new Error(message)
      }

      const blob = await response.blob()
      exportProgress.value = 94
      exportStatus.value = 'Stahujem PDF...'
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = buildFileName()
      link.click()
      URL.revokeObjectURL(link.href)
      exportProgress.value = 100
      exportStatus.value = 'Hotovo'
    } catch (error: unknown) {
      exportError.value = getErrorMessage(error)
      exportStatus.value = exportError.value
    } finally {
      stopProgressTimer()
      exporting.value = false
      setTimeout(() => {
        exportProgress.value = 0
        exportStatus.value = ''
      }, 900)
    }
  }

  return {
    exporting,
    exportError,
    exportProgress,
    exportStatus,
    exportPdf
  }
}

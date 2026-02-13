import { computed, ref, type Ref } from 'vue'
import { supabase } from '@/services/supabase'

type ExportIssue = {
  id?: string
  title?: string
  impact?: string
  description?: string
  recommendation?: string
  wcag?: string
  wcagLevel?: string
  principle?: string
  helpUrl?: string
  nodesCount?: number
}

type UseDashboardExportParams = {
  report: Ref<any>
  targetUrl: Ref<string>
  selectedProfile: Ref<'wad' | 'eaa'>
  profileLabel: Ref<string>
  selectedPrinciple: Ref<string>
  selectedImpact: Ref<string>
  searchText: Ref<string>
  filteredIssues: Ref<ExportIssue[]>
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

  const trimmedTargetUrl = computed(() => targetUrl.value.trim())

  const buildSummary = (issues: ExportIssue[]) => {
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

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        throw new Error('Prihlaste sa, aby ste mohli exportovat report.')
      }

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
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = buildFileName()
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error: any) {
      exportError.value = error?.message || 'Export sa nepodaril.'
    } finally {
      exporting.value = false
    }
  }

  return {
    exporting,
    exportError,
    exportPdf
  }
}

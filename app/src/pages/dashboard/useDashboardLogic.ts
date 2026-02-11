import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuditStore } from '@/stores/audit.store'
import { useAuthStore } from '@/stores/auth.store'
import { useMonitoringStore } from '@/stores/monitoring.store'
import { supabase } from '@/services/supabase'
import { buildLemonCheckoutUrl } from '@/utils/lemon'

type ProfileOption = {
  value: 'wad' | 'eaa'
  title: string
  subtitle: string
}

export const useDashboardLogic = () => {
  const targetUrl = ref('')
  const selectedProfile = ref<'wad' | 'eaa'>('wad')
  const selectedPrinciple = ref('')
  const selectedImpact = ref('')
  const searchText = ref('')
  const openDetails = ref<Record<string, boolean>>({})
  const exporting = ref(false)
  const exportError = ref('')
  const auditStore = useAuditStore()
  const monitoringStore = useMonitoringStore()
  const auth = useAuthStore()
  const route = useRoute()
  const refreshPlanLoading = ref(false)
  const paymentNotice = ref(false)
  const auditCheckoutBase = import.meta.env.VITE_LEMON_AUDIT_CHECKOUT_URL || ''
  const monitoringUrl = ref('')
  const monitoringFrequency = ref(14)

  const auditCheckoutUrl = computed(() => {
    if (!auth.user || !auditCheckoutBase) return ''
    return buildLemonCheckoutUrl({
      baseUrl: auditCheckoutBase,
      userId: auth.user.id,
      email: auth.user.email
    })
  })

  const isPreview = computed(() => auditStore.accessLevel === 'free')
  const freeLimitReached = computed(() => auth.isLoggedIn && !auth.isPaid && auth.freeAuditUsed)
  const paidLimitReached = computed(
    () => auth.isLoggedIn && auth.isPaid && (auth.paidAuditCredits || 0) <= 0 && !auth.isAdmin
  )
  const auditLocked = computed(() => freeLimitReached.value || paidLimitReached.value)

  const auditLockedMessage = computed(() => {
    if (paidLimitReached.value) {
      return 'Nemate kredit na zakladny audit. Objednajte dalsi audit.'
    }
    if (freeLimitReached.value) {
      return 'Free audit uz bol pouzity. Pre plny report si objednajte zakladny audit.'
    }
    return ''
  })

  const showUpgrade = computed(
    () => auth.isLoggedIn && !auth.isPaid && (auth.freeAuditUsed || isPreview.value)
  )
  const showPaidStatus = computed(() => auth.isLoggedIn && auth.isPaid && !auth.isAdmin)
  const paidCredits = computed(() => auth.paidAuditCredits || 0)
  const canManageMonitoring = computed(
    () => auth.isLoggedIn && (auth.isPaid || auth.isAdmin) && monitoringStore.canManage
  )
  const monitoringTargets = computed(() => monitoringStore.targets || [])
  const monitoringLoading = computed(() => monitoringStore.loading)
  const monitoringSaving = computed(() => monitoringStore.saving)
  const monitoringError = computed(() => monitoringStore.error || '')
  const canSaveMonitoring = computed(
    () => monitoringUrl.value.trim().length > 0 && !monitoringStore.saving && monitoringStore.canManage
  )
  const auditHistory = computed(() => auditStore.history || [])
  const historyLoading = ref(false)
  const historyError = ref('')
  const selectedAuditId = ref<string | null>(null)
  const latestAudit = computed(() => auditHistory.value[0] || null)

  const refreshPlan = async () => {
    refreshPlanLoading.value = true
    try {
      await auth.fetchUserProfile()
    } finally {
      refreshPlanLoading.value = false
    }
  }

  const loadAuditHistory = async () => {
    historyLoading.value = true
    historyError.value = ''
    try {
      await auditStore.fetchAuditHistory()
    } catch (_error) {
      historyError.value = 'Históriu auditov sa nepodarilo načítať.'
    } finally {
      historyLoading.value = false
    }
  }

  const loadMonitoringTargets = async () => {
    if (!auth.isLoggedIn) return
    await monitoringStore.fetchTargets()
  }

  const saveMonitoringTarget = async () => {
    const url = monitoringUrl.value.trim() || targetUrl.value.trim()
    if (!url) return
    const profile = selectedProfile.value === 'eaa' ? 'eaa' : 'wad'
    const inserted = await monitoringStore.upsertTarget({
      url,
      profile,
      frequencyDays: monitoringFrequency.value
    })
    if (inserted) {
      monitoringUrl.value = ''
    }
    await loadMonitoringTargets()
  }

  const toggleMonitoringTarget = async (targetId: string, active: boolean) => {
    if (!targetId) return
    await monitoringStore.toggleTarget(targetId, active)
    await loadMonitoringTargets()
  }

  const loadLatestAudit = async () => {
    if (!auth.isLoggedIn || auditStore.report) return
    const latest = await auditStore.fetchLatestAudit()
    if (latest?.url && !targetUrl.value.trim()) {
      targetUrl.value = latest.url
    }
    if (latest?.auditId) {
      selectedAuditId.value = latest.auditId
    }
  }

  onMounted(() => {
    if (route.query.paid === '1') {
      paymentNotice.value = true
      void refreshPlan()
    }
    void loadLatestAudit()
    void loadAuditHistory()
    void loadMonitoringTargets()
  })

  const profileOptions: ProfileOption[] = [
    {
      value: 'wad',
      title: 'Verejný sektor (WAD 2016/2102)',
      subtitle: 'Weby a aplikácie verejných inštitúcií'
    },
    {
      value: 'eaa',
      title: 'Produkty a služby (EAA 2019/882)',
      subtitle: 'E-shopy, banky, doprava, digitálne služby'
    }
  ]

  const canRunAudit = computed(
    () => targetUrl.value.trim().length > 0 && !auditStore.loading && !auditLocked.value
  )
  const profileLabel = computed(
    () => profileOptions.find((option) => option.value === selectedProfile.value)?.title || 'WCAG audit'
  )

  const handleStartAudit = async () => {
    const url = targetUrl.value.trim()
    if (!url) return
    await auditStore.runManualAudit(url)
    if (!monitoringUrl.value.trim()) {
      monitoringUrl.value = url
    }
    if (auditStore.currentAudit?.auditId) {
      selectedAuditId.value = auditStore.currentAudit.auditId
    }
    void loadAuditHistory()
  }

  const formatDate = (value?: string | null) => {
    if (!value) return ''
    try {
      return new Date(value).toLocaleDateString('sk-SK')
    } catch (_error) {
      return value
    }
  }

  const selectAudit = async (auditId: string) => {
    const data = await auditStore.loadAuditById(auditId)
    if (data?.url) {
      targetUrl.value = data.url
    }
    if (data?.auditId) {
      selectedAuditId.value = data.auditId
    }
  }

  const openLatestAudit = () => {
    if (!latestAudit.value) return
    void selectAudit(latestAudit.value.id)
  }

  const issueTotal = (summary: any) => summary?.total ?? 0
  const issueHigh = (summary: any) =>
    (summary?.byImpact?.critical || 0) + (summary?.byImpact?.serious || 0)

  const highCount = computed(() => {
    const byImpact = auditStore.report?.summary.byImpact
    return (byImpact?.critical || 0) + (byImpact?.serious || 0)
  })

  const totalIssues = computed(() => {
    const byImpact = auditStore.report?.summary.byImpact
    return (
      (byImpact?.critical || 0) +
      (byImpact?.serious || 0) +
      (byImpact?.moderate || 0) +
      (byImpact?.minor || 0)
    )
  })

  const medCount = computed(() => {
    return auditStore.report?.summary.byImpact.moderate || 0
  })

  const lowCount = computed(() => {
    return auditStore.report?.summary.byImpact.minor || 0
  })

  const auditScore = computed(() => {
    const byImpact = auditStore.report?.summary.byImpact
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
    const issues = auditStore.report?.issues || []
    const unique = new Set(issues.map((i: any) => i.principle).filter(Boolean))
    return Array.from(unique)
  })

  const filteredIssues = computed(() => {
    const issues = auditStore.report?.issues || []
    const term = searchText.value.trim().toLowerCase()

    const filtered = issues.filter((i: any) => {
      const principleOk = !selectedPrinciple.value || i.principle === selectedPrinciple.value
      const impactOk = !selectedImpact.value || i.impact === selectedImpact.value
      const text = `${i.title || ''} ${i.description || ''} ${i.recommendation || ''} ${i.wcag || ''} ${i.principle || ''}`.toLowerCase()
      const searchOk = !term || text.includes(term)
      return principleOk && impactOk && searchOk
    })

    const order: Record<string, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 }
    return filtered.sort((a: any, b: any) => {
      const aOrder = order[a.impact] ?? 99
      const bOrder = order[b.impact] ?? 99
      if (aOrder !== bOrder) return aOrder - bOrder
      return (b.nodesCount || 0) - (a.nodesCount || 0)
    })
  })

  const clearFilters = () => {
    selectedPrinciple.value = ''
    selectedImpact.value = ''
    searchText.value = ''
  }

  const violationKey = (violation: any, index: number) => `${violation.id}-${index}`

  const toggleDetails = (key: string) => {
    openDetails.value = { ...openDetails.value, [key]: !openDetails.value[key] }
  }

  const isOpen = (key: string) => !!openDetails.value[key]

  const buildSummary = (issues: any[]) => {
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
    const rawUrl = targetUrl.value.trim()
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
    if (!auditStore.report || exporting.value) return
    exporting.value = true
    exportError.value = ''

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        throw new Error('Prihlaste sa, aby ste mohli exportovat report.')
      }

      const issues = filteredIssues.value
      const slimIssues = issues.map((issue: any) => ({
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
        url: targetUrl.value.trim(),
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

  const formatTarget = (target: string[]) => {
    if (!Array.isArray(target)) return ''
    return target.join(', ')
  }

  const describeTarget = (target: string[]) => {
    if (!Array.isArray(target) || target.length === 0) return 'Prvok na stránke'
    const selector = target[0]

    if (selector === 'html') return 'Dokument (html)'
    if (selector === 'body') return 'Telo stránky (body)'
    if (selector.includes('header')) return 'Hlavička stránky'
    if (selector.includes('nav')) return 'Navigácia'
    if (selector.includes('main')) return 'Hlavný obsah'
    if (selector.includes('footer')) return 'Pätička'
    if (selector.includes('section')) return 'Sekcia'
    if (selector.includes('form')) return 'Formulár'
    if (selector.includes('table')) return 'Tabuľka'
    if (selector.includes('thead') || selector.includes('th')) return 'Hlavička tabuľky'
    if (selector.includes('tbody') || selector.includes('td')) return 'Bunka tabuľky'
    if (selector.includes('ul') || selector.includes('ol')) return 'Zoznam'
    if (selector.includes('li')) return 'Položka zoznamu'
    if (selector.includes('iframe')) return 'Vložený obsah (iframe)'
    if (selector.includes('button')) return 'Tlačidlo'
    if (selector.includes('input')) return 'Formulárové pole'
    if (selector.includes('textarea')) return 'Textové pole'
    if (selector.includes('select')) return 'Výberové pole'
    if (selector.includes('a')) return 'Odkaz'
    if (selector.includes('img')) return 'Obrázok'
    if (selector.includes('h1')) return 'Nadpis úrovne 1'
    if (selector.includes('h2')) return 'Nadpis úrovne 2'
    if (selector.includes('h3')) return 'Nadpis úrovne 3'
    if (selector.includes('h4')) return 'Nadpis úrovne 4'
    if (selector.includes('h5')) return 'Nadpis úrovne 5'
    if (selector.includes('h6')) return 'Nadpis úrovne 6'
    if (selector.includes('.')) return 'Prvok s CSS triedou'
    if (selector.includes('#')) return 'Prvok s konkrétnym ID'
    return 'Prvok na stránke'
  }

  return {
    targetUrl,
    selectedProfile,
    selectedPrinciple,
    selectedImpact,
    searchText,
    openDetails,
    exporting,
    exportError,
    auditStore,
    monitoringStore,
    auth,
    refreshPlanLoading,
    paymentNotice,
    auditCheckoutUrl,
    isPreview,
    auditLocked,
    auditLockedMessage,
    showUpgrade,
    showPaidStatus,
    paidCredits,
    monitoringUrl,
    monitoringFrequency,
    canManageMonitoring,
    monitoringTargets,
    monitoringLoading,
    monitoringSaving,
    monitoringError,
    canSaveMonitoring,
    auditHistory,
    historyLoading,
    historyError,
    selectedAuditId,
    latestAudit,
    refreshPlan,
    loadAuditHistory,
    profileOptions,
    canRunAudit,
    handleStartAudit,
    formatDate,
    selectAudit,
    openLatestAudit,
    loadMonitoringTargets,
    saveMonitoringTarget,
    toggleMonitoringTarget,
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
    clearFilters,
    violationKey,
    toggleDetails,
    isOpen,
    exportPdf,
    formatTarget,
    describeTarget
  }
}

import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuditStore } from '@/stores/audit.store'
import { useAuthStore } from '@/stores/auth.store'
import { useMonitoringStore } from '@/stores/monitoring.store'
import { buildLemonCheckoutUrl } from '@/utils/lemon'
import type { AuditHistoryItem, ProfileOption } from './dashboard.types'

export const useDashboardCore = () => {
  const targetUrl = ref('')
  const selectedProfile = ref<'wad' | 'eaa'>('wad')
  const auditStore = useAuditStore()
  const auth = useAuthStore()
  const monitoringStore = useMonitoringStore()
  const route = useRoute()
  const refreshPlanLoading = ref(false)
  const paymentNotice = ref(false)
  const historyLoading = ref(false)
  const historyLoadingMore = ref(false)
  const historyHasMore = ref(false)
  const historyPage = ref(1)
  const historyError = ref('')
  const selectedAuditId = ref<string | null>(null)
  const monitoringMessage = ref('')
  const monitoringError = ref('')

  const auditCheckoutBase = import.meta.env.VITE_LEMON_AUDIT_CHECKOUT_URL || ''
  const monitoringCheckoutBase = import.meta.env.VITE_LEMON_MONITORING_CHECKOUT_URL || ''
  const auditCheckoutUrl = computed(() => {
    if (!auth.user || !auditCheckoutBase) return ''
    return buildLemonCheckoutUrl({
      baseUrl: auditCheckoutBase,
      userId: auth.user.id,
      email: auth.user.email
    })
  })
  const monitoringCheckoutUrl = computed(() => {
    if (!auth.user || !monitoringCheckoutBase) return ''
    return buildLemonCheckoutUrl({
      baseUrl: monitoringCheckoutBase,
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
    if (paidLimitReached.value) return 'Nemáte kredit na základný audit. Objednajte ďalší audit.'
    if (freeLimitReached.value) {
      return 'Bezplatný audit už bol použitý. Pre plný report si objednajte základný audit.'
    }
    return ''
  })

  const showUpgrade = computed(
    () => auth.isLoggedIn && !auth.isPaid && (auth.freeAuditUsed || isPreview.value)
  )
  const showPaidStatus = computed(() => auth.isLoggedIn && auth.isPaid && !auth.isAdmin)
  const paidCredits = computed(() => auth.paidAuditCredits || 0)
  const auditHistory = computed(() => auditStore.history || [])
  const latestAudit = computed(() => auditHistory.value[0] || null)
  const monitoringHasAccess = computed(() => monitoringStore.hasAccess)
  const canBuyMonitoring = computed(() => auth.isAdmin || auth.paidAuditCompleted)
  const monitoringTarget = computed(() => monitoringStore.target)
  const monitoringLatestRun = computed(() => monitoringStore.latestRun)
  const monitoringLoadingStatus = computed(() => monitoringStore.loadingStatus)
  const monitoringLoadingAction = computed(() => monitoringStore.loadingAction)
  const monitoringIsActive = computed(() => !!monitoringTarget.value?.active)
  const monitoringDefaultCadenceLabel = computed(() => {
    const target = monitoringTarget.value
    if (!target) return 'Každých 14 dní'
    if (target.cadence_mode === 'monthly_runs') {
      return `${target.cadence_value}x mesačne`
    }
    return `Každých ${target.cadence_value} dní`
  })

  const refreshPlan = async () => {
    refreshPlanLoading.value = true
    try {
      await auth.fetchUserProfile()
    } finally {
      refreshPlanLoading.value = false
    }
  }

  const loadAuditHistory = async (options?: { loadMore?: boolean }) => {
    const loadMore = !!options?.loadMore
    if (loadMore) {
      if (historyLoading.value || historyLoadingMore.value || !historyHasMore.value) return
      historyLoadingMore.value = true
    } else {
      historyLoading.value = true
      historyPage.value = 1
      historyHasMore.value = false
    }

    historyError.value = ''
    try {
      const nextPage = loadMore ? historyPage.value + 1 : 1
      const result = await auditStore.fetchAuditHistory({
        page: nextPage,
        limit: 20,
        append: loadMore
      })
      historyPage.value = result?.page || nextPage
      historyHasMore.value = !!result?.hasMore
    } catch (_error) {
      historyError.value = 'Históriu auditov sa nepodarilo načítať.'
    } finally {
      if (loadMore) {
        historyLoadingMore.value = false
      } else {
        historyLoading.value = false
      }
    }
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

  const loadMonitoringStatus = async () => {
    if (!auth.isLoggedIn) return

    monitoringError.value = ''
    monitoringMessage.value = ''
    await monitoringStore.fetchStatus()
  }

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
    if (auditStore.currentAudit?.auditId) {
      selectedAuditId.value = auditStore.currentAudit.auditId
    }
    void loadAuditHistory()
  }

  const formatDate = (value?: string) => {
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

  const toggleMonitoringActive = async () => {
    const target = monitoringTarget.value
    if (!target) return

    monitoringError.value = ''
    monitoringMessage.value = ''
    try {
      await monitoringStore.updateConfig({ active: !target.active })
      monitoringMessage.value = target.active ? 'Monitoring je pozastavený.' : 'Monitoring je znova aktívny.'
      void loadMonitoringStatus()
    } catch (error: any) {
      monitoringError.value = error?.message || 'Stav monitoringu sa nepodarilo zmeniť.'
    }
  }

  const runMonitoringNow = async (overrideUrl?: string) => {
    monitoringError.value = ''
    monitoringMessage.value = ''
    try {
      const runUrl = typeof overrideUrl === 'string' ? overrideUrl.trim() : ''
      await monitoringStore.runNow(runUrl || undefined)
      monitoringMessage.value = 'Monitoring bol spustený.'
      void loadAuditHistory()
      void loadMonitoringStatus()
    } catch (error: any) {
      monitoringError.value = error?.message || 'Spustenie monitoringu zlyhalo.'
    }
  }

  const runMonitoringForAudit = async (audit: AuditHistoryItem) => {
    const url = typeof audit?.url === 'string' ? audit.url.trim() : ''
    if (!url) {
      monitoringError.value = 'Vybrany audit nema URL pre monitoring.'
      return
    }

    if (!monitoringHasAccess.value) {
      monitoringError.value = 'Monitoring plan nie je aktivny pre tento ucet.'
      return
    }

    if (!monitoringTarget.value?.id) {
      try {
        await monitoringStore.activate({
          defaultUrl: url,
          profile: selectedProfile.value,
          cadenceMode: 'interval_days',
          cadenceValue: 14
        })
      } catch (error: any) {
        monitoringError.value = error?.message || 'Monitoring target sa nepodarilo inicializovat.'
        return
      }
    }

    await runMonitoringNow(url)
  }

  const formatDateTime = (value?: string | null) => {
    if (!value) return ''
    try {
      return new Date(value).toLocaleString('sk-SK')
    } catch (_error) {
      return value
    }
  }

  onMounted(() => {
    if (route.query.paid === '1') {
      paymentNotice.value = true
      void refreshPlan()
    }
    void loadLatestAudit()
    void loadAuditHistory()
    void loadMonitoringStatus()
  })

  return {
    targetUrl,
    selectedProfile,
    auditStore,
    auth,
    refreshPlanLoading,
    paymentNotice,
    auditCheckoutUrl,
    monitoringCheckoutUrl,
    isPreview,
    auditLocked,
    auditLockedMessage,
    showUpgrade,
    showPaidStatus,
    paidCredits,
    auditHistory,
    historyLoading,
    historyLoadingMore,
    historyHasMore,
    historyError,
    selectedAuditId,
    latestAudit,
    monitoringStore,
    monitoringHasAccess,
    canBuyMonitoring,
    monitoringTarget,
    monitoringLatestRun,
    monitoringLoadingStatus,
    monitoringLoadingAction,
    monitoringIsActive,
    monitoringDefaultCadenceLabel,
    monitoringMessage,
    monitoringError,
    refreshPlan,
    loadAuditHistory,
    loadMonitoringStatus,
    profileOptions,
    canRunAudit,
    profileLabel,
    handleStartAudit,
    formatDate,
    formatDateTime,
    selectAudit,
    openLatestAudit,
    toggleMonitoringActive,
    runMonitoringNow,
    runMonitoringForAudit
  }
}

import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuditStore } from '@/stores/audit.store'
import { useAuthStore } from '@/stores/auth.store'
import { useMonitoringStore } from '@/stores/monitoring.store'
import { buildLemonCheckoutUrl } from '@/utils/lemon'
import type { AuditHistoryItem, ProfileOption } from './dashboard.types'

const normalizeMonitoringUrl = (value?: string) => (value || '').trim().replace(/\/+$/, '').toLowerCase()
const normalizeAuditUrlInput = (rawUrl: unknown): string | null => {
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

  const auditCheckoutBasicBase =
    import.meta.env.VITE_LEMON_AUDIT_CHECKOUT_URL_BASIC ||
    import.meta.env.VITE_LEMON_AUDIT_CHECKOUT_URL ||
    ''
  const auditCheckoutProBase = import.meta.env.VITE_LEMON_AUDIT_CHECKOUT_URL_PRO || ''
  const monitoringCheckoutBasicBase =
    import.meta.env.VITE_LEMON_MONITORING_CHECKOUT_URL_BASIC ||
    import.meta.env.VITE_LEMON_MONITORING_CHECKOUT_URL ||
    ''
  const monitoringCheckoutProBase = import.meta.env.VITE_LEMON_MONITORING_CHECKOUT_URL_PRO || ''

  const buildCheckout = (baseUrl: string, purchaseType: 'audit' | 'monitoring', tier: 'basic' | 'pro') => {
    if (!auth.user || !baseUrl) return ''
    return buildLemonCheckoutUrl({
      baseUrl,
      userId: auth.user.id,
      email: auth.user.email,
      customData: {
        purchase_type: purchaseType,
        purchase_tier: tier
      }
    })
  }

  const auditCheckoutBasicUrl = computed(() => buildCheckout(auditCheckoutBasicBase, 'audit', 'basic'))
  const auditCheckoutProUrl = computed(() => buildCheckout(auditCheckoutProBase, 'audit', 'pro'))
  const monitoringCheckoutBasicUrl = computed(() =>
    buildCheckout(monitoringCheckoutBasicBase, 'monitoring', 'basic')
  )
  const monitoringCheckoutProUrl = computed(() =>
    buildCheckout(monitoringCheckoutProBase, 'monitoring', 'pro')
  )

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
  const canBuyMonitoring = computed(
    () => auth.isAdmin || auth.paidAuditCompleted || monitoringHasAccess.value
  )
  const monitoringTargets = computed(() => monitoringStore.targets || [])
  const monitoringTarget = computed(() => monitoringStore.target || monitoringTargets.value[0] || null)
  const monitoringLatestRun = computed(() => monitoringStore.latestRun)
  const monitoringLatestSuccessRunByTarget = computed(
    () => monitoringStore.latestSuccessRunByTarget || {}
  )
  const monitoringLoadingStatus = computed(() => monitoringStore.loadingStatus)
  const monitoringLoadingAction = computed(() => monitoringStore.loadingAction)
  const monitoringDomainsLimit = computed(() =>
    Math.max(0, Number(monitoringStore.entitlement?.monitoringDomainsLimit || 0))
  )
  const monitoringConfiguredCount = computed(() => monitoringTargets.value.length)
  const monitoringCanAddTarget = computed(() => {
    if (auth.isAdmin) return true
    if (monitoringDomainsLimit.value <= 0) return false
    return monitoringConfiguredCount.value < monitoringDomainsLimit.value
  })
  const monitoringIsActive = computed(() => monitoringTargets.value.some((target) => !!target.active))
  const monitoringActiveTargetUrls = computed(() =>
    monitoringTargets.value.filter((target) => !!target.active).map((target) => target.default_url || '')
  )
  const monitoringDefaultCadenceLabel = computed(() => {
    const tier = monitoringStore.entitlement?.monitoringTier
    if (tier === 'pro') return 'Pondelok a štvrtok'
    return 'Každý pondelok'
  })
  const monitoringTier = computed(() => {
    const tier = monitoringStore.entitlement?.monitoringTier
    if (tier === 'pro' || tier === 'basic') return tier
    return 'none'
  })

  const syncOpenedOrLatestAudit = async () => {
    const openedAuditId = auditStore.currentAudit?.auditId || selectedAuditId.value
    if (openedAuditId) {
      const opened = await auditStore.loadAuditById(openedAuditId)
      if (opened?.auditId) {
        selectedAuditId.value = opened.auditId
        if (opened.url) {
          targetUrl.value = opened.url
        }
        return
      }
    }

    await loadLatestAudit()
  }

  const syncDashboardData = async () => {
    await syncOpenedOrLatestAudit()
    await loadAuditHistory()
    await loadMonitoringStatus()
  }

  const refreshPlan = async () => {
    if (refreshPlanLoading.value) return
    refreshPlanLoading.value = true
    try {
      await auth.fetchUserProfile()
      await syncDashboardData()
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

    monitoringMessage.value = ''
    monitoringError.value = ''
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

  const targetUrlValidationMessage = computed(() => {
    const raw = targetUrl.value.trim()
    if (!raw) return ''
    const normalized = normalizeAuditUrlInput(raw)
    if (!normalized) return 'Zadajte platnú URL (napr. https://priklad.sk).'
    return ''
  })

  const auditFormErrorMessage = computed(() => {
    if (targetUrlValidationMessage.value) return targetUrlValidationMessage.value
    return auditStore.error || ''
  })

  const canRunAudit = computed(
    () =>
      targetUrl.value.trim().length > 0 &&
      !targetUrlValidationMessage.value &&
      !auditStore.loading &&
      !auditLocked.value
  )
  const profileLabel = computed(
    () => profileOptions.find((option) => option.value === selectedProfile.value)?.title || 'WCAG audit'
  )

  const handleStartAudit = async () => {
    const raw = targetUrl.value.trim()
    if (!raw) return

    const normalizedUrl = normalizeAuditUrlInput(raw)
    if (!normalizedUrl) return

    await auditStore.runManualAudit(normalizedUrl)
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

  const removeMonitoringTarget = async (targetId: string) => {
    if (!targetId) return

    monitoringError.value = ''
    monitoringMessage.value = ''
    try {
      await monitoringStore.deleteTarget({ targetId })
      monitoringMessage.value = 'Monitoring domény bol zrušený.'
    } catch (error: any) {
      monitoringError.value = error?.message || 'Monitoring domény sa nepodarilo zrušiť.'
    }
  }

  const runMonitoringForAudit = async (audit: AuditHistoryItem) => {
    monitoringError.value = ''
    monitoringMessage.value = ''

    const url = typeof audit?.url === 'string' ? audit.url.trim() : ''
    if (!url) {
      monitoringError.value = 'Vybraný audit nemá URL pre monitoring.'
      return
    }

    if (!monitoringHasAccess.value) {
      monitoringError.value = 'Monitoring plán nie je aktívny pre tento účet.'
      return
    }

    const normalizedUrl = normalizeMonitoringUrl(url)
    const existingTarget = monitoringTargets.value.find(
      (target) => normalizeMonitoringUrl(target.default_url) === normalizedUrl
    )

    if (existingTarget?.active) {
      monitoringMessage.value = 'Táto doména je už monitorovaná.'
      return
    }

    if (existingTarget?.id) {
      try {
        await monitoringStore.updateConfig({
          targetId: existingTarget.id,
          defaultUrl: url,
          profile: selectedProfile.value,
          active: true
        })
        monitoringMessage.value = 'Monitoring domény bol obnovený.'
      } catch (error: any) {
        monitoringError.value = error?.message || 'Monitoring domény sa nepodarilo obnoviť.'
        return
      }
    } else {
      if (!monitoringCanAddTarget.value) {
        const limit = monitoringDomainsLimit.value
        monitoringError.value =
          limit > 0
            ? `Dosiahli ste limit monitorovaných domén (${limit}).`
            : 'Monitoring plán pre tento účet nemá dostupné domény.'
        return
      }

      try {
        await monitoringStore.activate({
          defaultUrl: url,
          profile: selectedProfile.value
        })
        monitoringMessage.value = 'Doména bola pridaná do monitoringu.'
      } catch (error: any) {
        monitoringError.value = error?.message || 'Monitoring domény sa nepodarilo aktivovať.'
        return
      }
    }
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
      return
    }
    void syncDashboardData()
  })

  return {
    targetUrl,
    selectedProfile,
    auditStore,
    auth,
    refreshPlanLoading,
    paymentNotice,
    auditCheckoutBasicUrl,
    auditCheckoutProUrl,
    monitoringCheckoutBasicUrl,
    monitoringCheckoutProUrl,
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
    monitoringTargets,
    monitoringTarget,
    monitoringLatestRun,
    monitoringLatestSuccessRunByTarget,
    monitoringLoadingStatus,
    monitoringLoadingAction,
    monitoringDomainsLimit,
    monitoringConfiguredCount,
    monitoringCanAddTarget,
    monitoringIsActive,
    monitoringActiveTargetUrls,
    monitoringDefaultCadenceLabel,
    monitoringTier,
    monitoringMessage,
    monitoringError,
    refreshPlan,
    loadAuditHistory,
    loadMonitoringStatus,
    profileOptions,
    auditFormErrorMessage,
    targetUrlValidationMessage,
    canRunAudit,
    profileLabel,
    handleStartAudit,
    formatDate,
    formatDateTime,
    selectAudit,
    openLatestAudit,
    removeMonitoringTarget,
    runMonitoringForAudit
  }
}


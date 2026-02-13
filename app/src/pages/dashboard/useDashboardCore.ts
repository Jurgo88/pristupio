import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuditStore } from '@/stores/audit.store'
import { useAuthStore } from '@/stores/auth.store'
import { buildLemonCheckoutUrl } from '@/utils/lemon'

type ProfileOption = {
  value: 'wad' | 'eaa'
  title: string
  subtitle: string
}

export const useDashboardCore = () => {
  const targetUrl = ref('')
  const selectedProfile = ref<'wad' | 'eaa'>('wad')
  const auditStore = useAuditStore()
  const auth = useAuthStore()
  const route = useRoute()
  const refreshPlanLoading = ref(false)
  const paymentNotice = ref(false)
  const historyLoading = ref(false)
  const historyError = ref('')
  const selectedAuditId = ref<string | null>(null)

  const auditCheckoutBase = import.meta.env.VITE_LEMON_AUDIT_CHECKOUT_URL || ''
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
    if (paidLimitReached.value) return 'Nemate kredit na zakladny audit. Objednajte dalsi audit.'
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
  const auditHistory = computed(() => auditStore.history || [])
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

  onMounted(() => {
    if (route.query.paid === '1') {
      paymentNotice.value = true
      void refreshPlan()
    }
    void loadLatestAudit()
    void loadAuditHistory()
  })

  return {
    targetUrl,
    selectedProfile,
    auditStore,
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
    auditHistory,
    historyLoading,
    historyError,
    selectedAuditId,
    latestAudit,
    refreshPlan,
    loadAuditHistory,
    profileOptions,
    canRunAudit,
    profileLabel,
    handleStartAudit,
    formatDate,
    selectAudit,
    openLatestAudit
  }
}

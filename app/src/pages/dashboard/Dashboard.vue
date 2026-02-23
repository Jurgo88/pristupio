<template>
  <div class="audit-page">
    <DashboardHeroSection />

    <DashboardMetricsStrip
      :has-report="!!auditStore.report"
      :audit-score="auditScore"
      :score-state-label="scoreStateLabel"
      :high-count="highCount"
      :total-issues-count="totalIssuesCount"
      :filtered-issues-count="filteredIssues.length"
      :last-audit-label="lastAuditLabel"
      :has-latest-audit="!!latestAudit"
    />

    <DashboardAccessPanels
      :show-preview="!!auditStore.report && isPreview"
      :payment-notice="paymentNotice"
      :refresh-plan-loading="refreshPlanLoading"
      :show-upgrade="showUpgrade"
      :show-paid-status="showPaidStatus"
      :paid-credits="paidCredits"
      :audit-checkout-basic-url="auditCheckoutBasicUrl"
      :audit-checkout-pro-url="auditCheckoutProUrl"
      @refresh-plan="refreshPlan"
    />
    <DashboardMonitoringPanel
      :is-logged-in="auth.isLoggedIn"
      :is-admin="auth.isAdmin"
      :monitoring-is-active="monitoringIsActive"
      :monitoring-configured-count="monitoringConfiguredCount"
      :monitoring-domains-limit="monitoringDomainsLimit"
      :monitoring-loading-status="monitoringLoadingStatus"
      :monitoring-has-access="monitoringHasAccess"
      :can-buy-monitoring="canBuyMonitoring"
      :monitoring-tier="monitoringTier"
      :monitoring-default-cadence-label="monitoringDefaultCadenceLabel"
      :monitoring-targets="monitoringTargets"
      :monitoring-checkout-basic-url="monitoringCheckoutBasicUrl"
      :monitoring-checkout-pro-url="monitoringCheckoutProUrl"
      :monitoring-loading-action="monitoringLoadingAction"
      :monitoring-message="monitoringMessage"
      :monitoring-worsening-notice="monitoringWorseningNotice"
      :monitoring-error="monitoringError"
      :monitoring-store-error="monitoringStore.error"
      :format-date-time="formatDateTime"
      :monitoring-diff-label="monitoringDiffLabel"
      :monitoring-diff-class="monitoringDiffClass"
      @remove-target="removeMonitoringTarget"
    />

    <DashboardAuditForm
      :target-url="targetUrl"
      :audit-mode="auditMode"
      :selected-profile="selectedProfile"
      :profile-options="profileOptions"
      :can-run-audit="canRunAudit"
      :audit-locked="auditLocked"
      :audit-locked-message="auditLockedMessage"
      :loading="auditStore.loading"
      :site-audit-job="siteAuditJob"
      :can-cancel-site-audit="canCancelSiteAudit"
      :error-message="auditFormErrorMessage"
      @update:target-url="targetUrl = $event"
      @update:audit-mode="auditMode = $event"
      @update:selected-profile="selectedProfile = $event"
      @start-audit="handleStartAuditWithSuccessModal"
      @cancel-site-audit="handleCancelSiteAudit"
    />

    <section
      class="dashboard-workspace"
      :class="{
        'is-tab-overview': activeMobileTab === 'overview',
        'is-tab-issues': activeMobileTab === 'issues',
        'is-tab-history': activeMobileTab === 'history'
      }"
    >
      <DashboardMobileTabs :active-tab="activeMobileTab" @update:active-tab="activeMobileTab = $event" />
      <DashboardHistoryRail
        :history-loading="historyLoading"
        :history-loading-more="historyLoadingMore"
        :latest-audit="latestAudit"
        :history-error="historyError"
        :monitoring-loading-action="monitoringLoadingAction"
        :monitoring-has-access="monitoringHasAccess"
        :monitoring-active-target-urls="monitoringActiveTargetUrls"
        :monitoring-can-add-target="monitoringCanAddTarget"
        :monitoring-domains-limit="monitoringDomainsLimit"
        :history-has-more="historyHasMore"
        :audit-history="auditHistory"
        :selected-audit-id="selectedAuditId"
        :format-date="formatDate"
        :issue-total="issueTotal"
        :issue-high="issueHigh"
        :select-audit="selectAudit"
        :run-monitoring-for-audit="runMonitoringForAudit"
        :load-more-history="() => loadAuditHistory({ loadMore: true })"
        @open-latest-audit="openLatestAudit"
        @refresh-history="loadAuditHistory"
      />
      <div class="workspace-main">
        <DashboardOverviewPane
          :has-report="!!auditStore.report"
          :high-count="highCount"
          :med-count="medCount"
          :low-count="lowCount"
          :audit-score="auditScore"
          :critical-percent="criticalPercent"
          :moderate-percent="moderatePercent"
          :minor-percent="minorPercent"
        />
        <DashboardIssuesPanel
          :has-report="!!auditStore.report"
          :is-preview="isPreview"
          :is-exporting="isExporting"
          :export-progress="exportProgress"
          :export-status="exportStatus"
          :selected-principle="selectedPrinciple"
          :selected-impact="selectedImpact"
          :search-text="searchText"
          :principle-options="principleOptions"
          :export-error="exportError"
          :visible-issues="visibleIssues"
          :filtered-issues="filteredIssues"
          :report-issues-count="totalIssuesCount"
          :has-more-issues="hasMoreIssues"
          :impact-class="impactClass"
          :violation-key="violationKey"
          :is-open="isOpen"
          :toggle-details="toggleDetails"
          @update:selected-principle="selectedPrinciple = $event"
          @update:selected-impact="selectedImpact = $event"
          @update:search-text="searchText = $event"
          @clear-filters="clearFilters"
          @export-pdf="exportPdf"
          @load-more-issues="loadMoreIssues"
        />
      </div>
    </section>

    <!-- <ManualChecklist :profile="selectedProfile" /> -->
    <div
      v-if="siteAuditSuccessModalVisible"
      class="site-audit-success-modal-backdrop"
      role="presentation"
      @click.self="closeSiteAuditSuccessModal"
    >
      <section
        class="site-audit-success-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-audit-success-title"
      >
        <h3 id="site-audit-success-title">{{ coreText.siteAuditSuccessTitle }}</h3>
        <p>{{ coreText.siteAuditSuccessLead }}</p>
        <p v-if="siteAuditSuccessUrl" class="site-audit-success-url">{{ siteAuditSuccessUrl }}</p>
        <div class="site-audit-success-stats">
          <div>
            <span>{{ coreText.siteAuditSuccessTotal }}</span>
            <strong>{{ siteAuditSuccessTotal }}</strong>
          </div>
          <div>
            <span>{{ coreText.siteAuditSuccessHigh }}</span>
            <strong>{{ siteAuditSuccessHigh }}</strong>
          </div>
        </div>
        <div class="site-audit-success-actions">
          <button type="button" class="btn btn-outline-secondary" @click="closeSiteAuditSuccessModal">
            {{ coreText.siteAuditSuccessClose }}
          </button>
          <button type="button" class="btn btn-primary" @click="openSiteAuditFromModal">
            {{ coreText.siteAuditSuccessOpen }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  DashboardAccessPanels,
  DashboardAuditForm,
  DashboardHeroSection,
  DashboardHistoryRail,
  DashboardIssuesPanel,
  DashboardMobileTabs,
  DashboardOverviewPane,
  DashboardMetricsStrip,
  DashboardMonitoringPanel,
  getDashboardScoreStateLabel,
  useDashboardIssues,
  useDashboardExport,
  useDashboardCore,
  useMonitoringDiff
} from './index'
import { DASHBOARD_CORE_TEXT } from './dashboard.copy'
import './dashboard.shared.css'

const {
  targetUrl,
  auditMode,
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
  siteAuditJob,
  canCancelSiteAudit,
  monitoringStore,
  monitoringHasAccess,
  canBuyMonitoring,
  monitoringTargets,
  monitoringLoadingStatus,
  monitoringLoadingAction,
  monitoringDomainsLimit,
  monitoringConfiguredCount,
  monitoringCanAddTarget,
  monitoringIsActive,
  monitoringActiveTargetUrls,
  monitoringLatestSuccessRunByTarget,
  monitoringDefaultCadenceLabel,
  monitoringTier,
  monitoringMessage,
  monitoringError,
  auditHistory,
  historyLoading,
  historyLoadingMore,
  historyHasMore,
  historyError,
  selectedAuditId,
  latestAudit,
  refreshPlan,
  loadAuditHistory,
  profileOptions,
  auditFormErrorMessage,
  canRunAudit,
  profileLabel,
  handleStartAudit,
  handleCancelSiteAudit,
  formatDate,
  formatDateTime,
  selectAudit,
  openLatestAudit,
  removeMonitoringTarget,
  runMonitoringForAudit
} = useDashboardCore()

const {
  selectedPrinciple,
  selectedImpact,
  searchText,
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
} = useDashboardIssues(computed(() => auditStore.report))

const {
  monitoringDiffLabel,
  monitoringDiffClass,
  monitoringWorseningNotice
} = useMonitoringDiff(monitoringLatestSuccessRunByTarget)


const {
  exporting: isExporting,
  exportError,
  exportProgress,
  exportStatus,
  exportPdf
} = useDashboardExport({
  report: computed(() => auditStore.report),
  targetUrl,
  selectedProfile,
  profileLabel,
  selectedPrinciple,
  selectedImpact,
  searchText,
  filteredIssues
})

const activeMobileTab = ref<'overview' | 'issues' | 'history'>('overview')
const totalIssuesCount = computed(() => auditStore.report?.issues?.length || 0)
const scoreStateLabel = computed(() => getDashboardScoreStateLabel(!!auditStore.report, auditScore.value))
const coreText = DASHBOARD_CORE_TEXT
const siteAuditSuccessModalVisible = ref(false)
const siteAuditSuccessTotal = ref(0)
const siteAuditSuccessHigh = ref(0)
const siteAuditSuccessUrl = ref('')

const closeSiteAuditSuccessModal = () => {
  siteAuditSuccessModalVisible.value = false
}

const handleStartAuditWithSuccessModal = async () => {
  const startedAsSiteAudit = auditMode.value === 'site'
  siteAuditSuccessModalVisible.value = false

  await handleStartAudit()

  if (!startedAsSiteAudit) return
  if (auditStore.error) return
  if (!auditStore.currentAudit?.auditId) return

  const summary = auditStore.report?.summary
  const total = Number(summary?.total) || Number(auditStore.report?.issues?.length || 0)
  const high = Number(summary?.byImpact?.critical || 0) + Number(summary?.byImpact?.serious || 0)

  siteAuditSuccessTotal.value = Math.max(0, total)
  siteAuditSuccessHigh.value = Math.max(0, high)
  siteAuditSuccessUrl.value =
    (typeof auditStore.currentAudit?.url === 'string' && auditStore.currentAudit.url) ||
    (typeof siteAuditJob.value?.rootUrl === 'string' && siteAuditJob.value.rootUrl) ||
    targetUrl.value
  siteAuditSuccessModalVisible.value = true
}

const openSiteAuditFromModal = async () => {
  closeSiteAuditSuccessModal()
  const auditId = auditStore.currentAudit?.auditId
  if (typeof auditId === 'string' && auditId) {
    await selectAudit(auditId)
    return
  }
  openLatestAudit()
}

const lastAuditLabel = computed(() => {
  if (!latestAudit.value?.created_at) return ''
  return formatDate(latestAudit.value.created_at)
})

</script>

<style scoped>
/* Page Layout */
.audit-page {
  --dashboard-sticky-offset: calc(4rem + env(safe-area-inset-top));
  width: 100%;
  margin: 0 auto;
  display: grid;
  gap: 2.15rem;
  padding: 0.5rem 0 3.4rem;
}

.dashboard-workspace {
  display: grid;
  grid-template-columns: minmax(340px, 0.85fr) minmax(0, 1.8fr);
  gap: 1.5rem;
  align-items: start;
}

.workspace-main {
  display: grid;
  gap: 1.15rem;
}

.site-audit-success-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(2, 6, 23, 0.58);
}

.site-audit-success-modal {
  width: min(560px, 100%);
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.3);
  padding: 1.25rem 1.25rem 1.1rem;
  display: grid;
  gap: 0.8rem;
}

.site-audit-success-modal h3 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--text);
}

.site-audit-success-modal p {
  margin: 0;
  color: var(--text-muted);
}

.site-audit-success-url {
  font-size: 0.88rem;
  word-break: break-word;
}

.site-audit-success-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}

.site-audit-success-stats > div {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-2);
  padding: 0.65rem 0.75rem;
  display: grid;
  gap: 0.2rem;
}

.site-audit-success-stats span {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.site-audit-success-stats strong {
  font-size: 1.18rem;
  color: var(--text);
}

.site-audit-success-actions {
  margin-top: 0.3rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.55rem;
}
/* Responsive */
@media (max-width: 980px) {
  .audit-page {
    --dashboard-sticky-offset: calc(4.8rem + env(safe-area-inset-top));
    gap: 1.4rem;
    padding-bottom: 2.2rem;
  }

  .dashboard-workspace {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .mobile-pane {
    display: none;
  }

  .dashboard-workspace.is-tab-overview .mobile-pane--overview {
    display: grid;
  }

  .dashboard-workspace.is-tab-issues .mobile-pane--issues,
  .dashboard-workspace.is-tab-history .mobile-pane--history {
    display: block;
  }

  .site-audit-success-modal {
    padding: 1rem;
  }

  .site-audit-success-stats {
    grid-template-columns: 1fr;
  }
}
</style>

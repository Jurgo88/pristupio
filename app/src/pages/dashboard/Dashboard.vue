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
      :selected-profile="selectedProfile"
      :profile-options="profileOptions"
      :can-run-audit="canRunAudit"
      :audit-locked="auditLocked"
      :audit-locked-message="auditLockedMessage"
      :loading="auditStore.loading"
      :error-message="auditFormErrorMessage"
      @update:target-url="targetUrl = $event"
      @update:selected-profile="selectedProfile = $event"
      @start-audit="handleStartAudit"
    />

    <section
      class="dashboard-workspace"
      :class="{
        'is-tab-overview': activeMobileTab === 'overview',
        'is-tab-issues': activeMobileTab === 'issues',
        'is-tab-history': activeMobileTab === 'history'
      }"
    >
      <nav class="mobile-tabs" aria-label="Sekcie dashboardu">
        <button
          type="button"
          class="mobile-tab"
          :class="{ 'is-active': activeMobileTab === 'overview' }"
          @click="activeMobileTab = 'overview'"
        >
          Prehľad
        </button>
        <button
          type="button"
          class="mobile-tab"
          :class="{ 'is-active': activeMobileTab === 'issues' }"
          @click="activeMobileTab = 'issues'"
        >
          Nálezy
        </button>
        <button
          type="button"
          class="mobile-tab"
          :class="{ 'is-active': activeMobileTab === 'history' }"
          @click="activeMobileTab = 'history'"
        >
          História
        </button>
      </nav>
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
  DashboardOverviewPane,
  DashboardMetricsStrip,
  DashboardMonitoringPanel,
  useDashboardIssues,
  useDashboardExport,
  useDashboardCore
} from './index'
import './dashboard.shared.css'

const {
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
const scoreStateLabel = computed(() => {
  if (!auditStore.report) return 'Spustite audit'
  if (auditScore.value >= 90) return 'Vysoka pripravenost'
  if (auditScore.value >= 75) return 'Solidny zaklad'
  if (auditScore.value >= 60) return 'Treba dorobit klucove opravy'
  return 'Rizikovy stav'
})
const lastAuditLabel = computed(() => {
  if (!latestAudit.value?.created_at) return ''
  return formatDate(latestAudit.value.created_at)
})

const signedDelta = (value: number) => {
  if (!Number.isFinite(value) || value === 0) return '0'
  return value > 0 ? `+${value}` : String(value)
}

const monitoringDiffMeta = (targetId: string) => {
  const run = monitoringLatestSuccessRunByTarget.value?.[targetId]
  const diff = run?.diff_json || {}
  if (!diff || typeof diff !== 'object') return null

  const totalDelta = Number((diff as any).totalDelta || 0)
  const newIssues = Number((diff as any).newIssues || 0)
  const resolvedIssues = Number((diff as any).resolvedIssues || 0)
  const byImpactDelta = ((diff as any).byImpactDelta || {}) as Record<string, number>
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
  if (!meta) {
    return ''
  }

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
  const ids = Object.keys(monitoringLatestSuccessRunByTarget.value || {})
  let worsenedCount = 0
  ids.forEach((id) => {
    const meta = monitoringDiffMeta(id)
    if (meta?.worsening) worsenedCount += 1
  })
  if (worsenedCount === 0) return ''
  if (worsenedCount === 1) return 'Upozornenie: pri 1 doméne sa monitoring zhoršil oproti minulému auditu.'
  return `Upozornenie: pri ${worsenedCount} doménach sa monitoring zhoršil oproti minulému auditu.`
})
</script>

<style scoped>
/* Page Layout */
.audit-page {
  --dashboard-sticky-offset: calc(4rem + env(safe-area-inset-top));
  width: 100%;
  margin: 0 auto;
  display: grid;
  gap: 2.5rem;
  padding: 0.5rem 0 4rem;
}

.dashboard-workspace {
  display: grid;
  grid-template-columns: minmax(340px, 0.85fr) minmax(0, 1.8fr);
  gap: 1.5rem;
  align-items: start;
}

.workspace-main {
  display: grid;
  gap: 1.4rem;
}

.mobile-tabs {
  display: none;
}

.mobile-tab {
  border: 1px solid var(--border);
  background: var(--surface);
  color: #0f172a;
  border-radius: var(--radius);
  padding: 0.65rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.mobile-tab.is-active {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  background: #ffffff;
}

/* Responsive */
@media (max-width: 980px) {
  .audit-page {
    --dashboard-sticky-offset: calc(4.8rem + env(safe-area-inset-top));
  }

  .dashboard-workspace {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .mobile-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.6rem;
    position: sticky;
    top: var(--dashboard-sticky-offset);
    z-index: 2;
    background: #f8fafc;
    padding-bottom: 0.35rem;
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
}
</style>

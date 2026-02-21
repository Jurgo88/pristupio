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

      <aside class="workspace-rail">
        <section class="panel audit-history mobile-pane mobile-pane--history">
          <div class="panel-head panel-head--tight">
            <div>
              <p class="kicker">História</p>
              <h2>História auditov</h2>
            </div>
            <div class="history-actions">
              <button
                class="btn btn-sm btn-filter-clear"
                @click="openLatestAudit"
                :disabled="historyLoading || historyLoadingMore || !latestAudit"
              >
                Zobraziť posledný audit
              </button>
              <button
                class="btn btn-sm btn-filter-clear"
                @click="loadAuditHistory"
                :disabled="historyLoading || historyLoadingMore"
              >
                {{ historyLoading ? 'Načítavam...' : 'Obnoviť' }}
              </button>
            </div>
          </div>
          <div class="history-scroll">
            <DashboardAuditHistoryList
              :history-error="historyError"
              :history-loading="historyLoading"
              :history-loading-more="historyLoadingMore"
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
            />
          </div>
        </section>
      </aside>

      <div class="workspace-main">
        <section class="workspace-overview mobile-pane mobile-pane--overview">
          <DashboardStats
            v-if="auditStore.report"
            :high-count="highCount"
            :med-count="medCount"
            :low-count="lowCount"
          />

          <DashboardReportPreview
            v-if="auditStore.report"
            :audit-score="auditScore"
            :high-count="highCount"
            :med-count="medCount"
            :low-count="lowCount"
            :critical-percent="criticalPercent"
            :moderate-percent="moderatePercent"
            :minor-percent="minorPercent"
          />

          <section v-if="!auditStore.report" class="panel overview-empty">
            Spustite audit a po dokončení sa tu zobrazí prehľad skóre a rozdelenie nálezov.
          </section>
        </section>

        <section class="panel issues-panel mobile-pane mobile-pane--issues">
          <div class="issues-toolbar">
            <DashboardIssuesControls
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
              @update:selected-principle="selectedPrinciple = $event"
              @update:selected-impact="selectedImpact = $event"
              @update:search-text="searchText = $event"
              @clear-filters="clearFilters"
              @export-pdf="exportPdf"
            />
          </div>

          <p v-if="auditStore.report" class="issues-meta">
            Zobrazené nálezy: <strong>{{ visibleIssues.length }}</strong> / {{ filteredIssues.length }}
            <span class="issues-meta-total"> (celkovo {{ auditStore.report.issues.length }})</span>
          </p>

          <div v-if="!auditStore.report" class="status-state">
            {{ DASHBOARD_ISSUES_TEXT.emptyNoReport }}
          </div>

          <div v-else-if="auditStore.report.issues.length === 0" class="status-state">
            {{ DASHBOARD_ISSUES_TEXT.emptyNoIssues }}
          </div>

          <div v-else-if="filteredIssues.length === 0" class="status-state">
            {{ DASHBOARD_ISSUES_TEXT.emptyNoFilteredIssues }}
          </div>

          <DashboardIssueList
            v-else
            :filtered-issues="visibleIssues"
            :is-preview="isPreview"
            :impact-class="impactClass"
            :violation-key="violationKey"
            :is-open="isOpen"
            :toggle-details="toggleDetails"
          />

          <div v-if="hasMoreIssues" class="issues-load-more">
            <button class="btn btn-outline" @click="loadMoreIssues">Načítať ďalšie nálezy</button>
          </div>
        </section>
      </div>
    </section>

    <!-- <ManualChecklist :profile="selectedProfile" /> -->
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  DashboardAccessPanels,
  DashboardAuditHistoryList,
  DashboardAuditForm,
  DashboardHeroSection,
  DashboardIssueList,
  DashboardIssuesControls,
  DashboardMetricsStrip,
  DashboardMonitoringPanel,
  DashboardReportPreview,
  DashboardStats,
  DASHBOARD_ISSUES_TEXT,
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

.metrics-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;
}

.metric-card {
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: var(--radius-md);
  padding: 0.9rem 1rem;
  display: grid;
  gap: 0.25rem;
  backdrop-filter: blur(6px);
  box-shadow: var(--shadow-sm);
}

.metric-card span {
  font-size: 0.72rem;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 700;
}

.metric-card strong {
  font-family: var(--font-display);
  font-size: clamp(1.3rem, 1.05rem + 0.8vw, 1.8rem);
  line-height: 1.1;
  color: #0f172a;
}

.metric-card small {
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.2;
}

.workspace-rail {
  display: grid;
  gap: 1rem;
  position: sticky;
  top: var(--dashboard-sticky-offset);
  max-height: calc(100vh - var(--dashboard-sticky-offset) - 0.5rem);
}

.workspace-main {
  display: grid;
  gap: 1.4rem;
}

.workspace-overview {
  display: grid;
  gap: 1rem;
}

.overview-empty {
  color: var(--text-muted);
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

.workspace-rail .audit-history {
  display: grid;
  grid-template-rows: auto 1fr;
  max-height: calc(100vh - var(--dashboard-sticky-offset) - 0.5rem);
  min-height: 280px;
  min-width: 0;
  overflow: hidden;
}

.history-scroll {
  overflow: auto;
  min-height: 0;
  padding-right: 0.25rem;
}

.issues-panel {
  display: grid;
  gap: 0.8rem;
  align-content: start;
}

.issues-toolbar {
  position: sticky;
  top: var(--dashboard-sticky-offset);
  z-index: 4;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.75rem;
}

.issues-meta {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.issues-meta-total {
  color: #64748b;
}

.issues-load-more {
  display: flex;
  justify-content: center;
  padding-top: 0.35rem;
}

/* Hero */
.page-hero {
  position: relative;
  background: linear-gradient(125deg, #0f172a 0%, #111827 56%, #0b274f 100%);
  color: #e2e8f0;
  border: 1px solid #0b1220;
  border-radius: var(--radius-lg);
  padding: 2rem 2.2rem;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 1.4rem;
  align-items: center;
}

.page-hero::before,
.page-hero::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  opacity: 0.6;
  z-index: 0;
}

.page-hero::before {
  width: 260px;
  height: 260px;
  right: -100px;
  top: -100px;
  background: radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.45), transparent 70%);
}

.page-hero::after {
  width: 220px;
  height: 220px;
  left: -90px;
  bottom: -100px;
  background: radial-gradient(circle at 70% 70%, rgba(14, 165, 233, 0.35), transparent 70%);
}

.page-hero__content {
  position: relative;
  z-index: 1;
}

.page-hero__content h1 {
  font-size: clamp(1.7rem, 1.28rem + 1.45vw, 2.45rem);
  line-height: 1.1;
  margin: 0 0 0.5rem;
  color: #f8fafc;
}

.kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 700;
  margin: 0 0 0.4rem;
}

.lead {
  color: var(--text-muted);
  font-size: 1rem;
  margin: 0;
}

.page-hero__content .lead {
  color: #cbd5f5;
  margin: 0 0 0.8rem;
  font-size: 0.94rem;
}

.page-hero .kicker {
  color: #93c5fd;
}

.hero-tags {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  font-size: 0.78rem;
  color: #cbd5e1;
}

.hero-tags span {
  border: 1px solid #1f2937;
  padding: 0.28rem 0.62rem;
  border-radius: var(--radius-pill);
  background: rgba(15, 23, 42, 0.45);
}

.page-hero__card {
  position: relative;
  z-index: 1;
  background: #ffffff;
  color: #0f172a;
  border-radius: var(--radius-md);
  padding: 1.05rem 1.1rem;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
  border: 1px solid rgba(226, 232, 240, 0.7);
}

.page-hero__aside {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 1rem;
}

.hero-card-title {
  font-weight: 700;
  font-size: 0.95rem;
}

.page-hero__card ul {
  margin: 0.55rem 0 0;
  padding-left: 1.1rem;
  color: #475569;
  display: grid;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.hero-card-meta {
  margin-top: 0.5rem;
  font-size: 0.76rem;
  color: #64748b;
}

/* Panel Shell */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.8rem;
  box-shadow: var(--shadow-sm);
}

.preview-banner {
  background: linear-gradient(135deg, rgba(30, 64, 175, 0.1), rgba(14, 165, 233, 0.08));
  border-color: rgba(37, 99, 235, 0.35);
}

.preview-banner h2 {
  margin: 0.2rem 0 0.6rem;
}

.payment-banner {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(34, 197, 94, 0.08));
  border-color: rgba(16, 185, 129, 0.4);
}

.paid-banner {
  background: linear-gradient(135deg, rgba(2, 132, 199, 0.12), rgba(14, 116, 144, 0.08));
  border-color: rgba(14, 116, 144, 0.35);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem 1rem;
  align-items: center;
  padding: 1.25rem 1.35rem;
}

.paid-banner.is-empty-credit {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(185, 28, 28, 0.1));
  border-color: rgba(180, 83, 9, 0.38);
}

.paid-banner__copy {
  min-width: 0;
}

.paid-banner h2 {
  margin: 0.15rem 0 0.45rem;
  font-size: clamp(1.15rem, 1rem + 0.55vw, 1.45rem);
}

.paid-banner .lead {
  font-size: 0.94rem;
  line-height: 1.4;
}

.paid-banner__meta {
  display: grid;
  gap: 0.55rem;
  justify-items: end;
  align-content: center;
}

.paid-banner__credits {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.34rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(14, 116, 144, 0.4);
  background: rgba(255, 255, 255, 0.82);
  color: #0f172a;
  font-size: 0.8rem;
  font-weight: 600;
}

.paid-banner__credits strong {
  color: #0c4a6e;
  font-size: 0.95rem;
  line-height: 1;
}

.paid-banner.is-empty-credit .paid-banner__credits {
  border-color: rgba(180, 83, 9, 0.42);
  background: rgba(255, 251, 235, 0.9);
}

.paid-banner.is-empty-credit .paid-banner__credits strong {
  color: #9a3412;
}

.paid-banner__actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.paid-banner__cta {
  padding: 0.5rem 0.95rem;
  box-shadow: 0 10px 18px rgba(29, 78, 216, 0.25);
  white-space: nowrap;
}

[data-theme='dark'] .paid-banner {
  background: linear-gradient(135deg, rgba(8, 47, 73, 0.55), rgba(14, 116, 144, 0.34));
  border-color: rgba(56, 189, 248, 0.38);
}

[data-theme='dark'] .paid-banner.is-empty-credit {
  background: linear-gradient(135deg, rgba(120, 53, 15, 0.54), rgba(127, 29, 29, 0.38));
  border-color: rgba(251, 191, 36, 0.42);
}

[data-theme='dark'] .paid-banner__credits {
  background: rgba(15, 23, 42, 0.88);
  border-color: rgba(148, 163, 184, 0.42);
  color: #cbd5e1;
}

[data-theme='dark'] .paid-banner__credits strong {
  color: #e2e8f0;
}

[data-theme='dark'] .paid-banner.is-empty-credit .paid-banner__credits {
  background: rgba(69, 26, 3, 0.55);
  border-color: rgba(251, 191, 36, 0.46);
}

[data-theme='dark'] .paid-banner.is-empty-credit .paid-banner__credits strong {
  color: #fde68a;
}

.upgrade-panel {
  display: grid;
  gap: 1.2rem;
}

.upgrade-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  align-items: center;
}

/* History Section */
.audit-history .btn-filter-clear {
  height: auto;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: #0f172a;
  box-shadow: none;
}

.audit-history .btn-filter-clear:hover {
  background: #e2e8f0;
}

.history-actions {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

[data-theme='dark'] .audit-history .btn-filter-clear {
  background: #101b2e;
  border-color: #3b4f6e;
  color: #dbe7fb;
}

[data-theme='dark'] .audit-history .btn-filter-clear:hover {
  background: #17243a;
  border-color: #5476a3;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.4rem;
}

.panel-head--tight {
  margin-bottom: 1rem;
}

.panel-head h2 {
  margin: 0.2rem 0 0;
  font-size: clamp(1.4rem, 1.1rem + 1vw, 2rem);
}

.history-stats {
  display: flex;
  gap: 0.8rem;
  margin-top: 0.4rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Responsive */
@media (max-width: 1100px) {
  .metrics-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .page-hero {
    grid-template-columns: 1fr;
    padding: 1.6rem 1.5rem;
  }

  .page-hero__card {
    width: 100%;
  }

  .paid-banner {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .paid-banner__meta,
  .paid-banner__actions {
    justify-items: start;
    justify-content: flex-start;
  }
}

@media (max-width: 980px) {
  .audit-page {
    --dashboard-sticky-offset: calc(4.8rem + env(safe-area-inset-top));
  }

  .dashboard-workspace {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .metrics-strip {
    grid-template-columns: 1fr;
  }

  .workspace-rail {
    position: static;
    max-height: none;
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

  .workspace-rail .audit-history {
    grid-template-rows: auto;
  }

  .history-scroll {
    overflow: visible;
    padding-right: 0;
  }

  .issues-toolbar {
    position: static;
    border-bottom: 0;
    padding-bottom: 0;
  }

  .dashboard-workspace.is-tab-overview .mobile-pane--overview {
    display: grid;
  }

  .dashboard-workspace.is-tab-issues .mobile-pane--issues,
  .dashboard-workspace.is-tab-history .mobile-pane--history {
    display: block;
  }
}

@media (max-width: 640px) {
  .page-hero {
    padding: 2rem 1.6rem;
  }

  .panel {
    padding: 1.4rem;
  }

}
</style>

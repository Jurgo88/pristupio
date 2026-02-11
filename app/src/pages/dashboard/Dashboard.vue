<template>
  <div class="audit-page">
    <DashboardHeroSection />

    <DashboardBanners
      :show-preview="!!auditStore.report && isPreview"
      :payment-notice="paymentNotice"
      :show-upgrade="showUpgrade"
      :show-paid-status="showPaidStatus"
      :paid-credits="paidCredits"
      :audit-checkout-url="auditCheckoutUrl"
      :refresh-plan-loading="refreshPlanLoading"
      @refresh-plan="refreshPlan"
    />

    <DashboardHistorySection
      :history-loading="historyLoading"
      :history-error="historyError"
      :audit-history="auditHistory"
      :selected-audit-id="selectedAuditId"
      :latest-audit="latestAudit"
      :format-date="formatDate"
      :issue-total="issueTotal"
      :issue-high="issueHigh"
      @open-latest-audit="openLatestAudit"
      @reload-history="loadAuditHistory"
      @select-audit="selectAudit"
    />

    <DashboardAuditFormSection
      :target-url="targetUrl"
      :selected-profile="selectedProfile"
      :profile-options="profileOptions"
      :audit-locked="auditLocked"
      :can-run-audit="canRunAudit"
      :audit-loading="auditStore.loading"
      :audit-error="auditStore.error"
      :audit-locked-message="auditLockedMessage"
      @update:target-url="targetUrl = $event"
      @update:selected-profile="selectedProfile = $event"
      @start-audit="handleStartAudit"
    />

    <DashboardMonitoringSection
      :can-manage="canManageMonitoring"
      :monitoring-loading="monitoringLoading"
      :monitoring-saving="monitoringSaving"
      :monitoring-error="monitoringError"
      :monitoring-url="monitoringUrl"
      :monitoring-frequency="monitoringFrequency"
      :can-save-monitoring="canSaveMonitoring"
      :monitoring-targets="monitoringTargets"
      :format-date="formatDate"
      @update:monitoring-url="monitoringUrl = $event"
      @update:monitoring-frequency="monitoringFrequency = $event"
      @save-target="saveMonitoringTarget"
      @reload-targets="loadMonitoringTargets"
      @toggle-target="toggleMonitoringTarget"
    />

    <DashboardReportSummarySection
      :has-report="!!auditStore.report"
      :high-count="highCount"
      :med-count="medCount"
      :low-count="lowCount"
      :audit-score="auditScore"
      :critical-percent="criticalPercent"
      :moderate-percent="moderatePercent"
      :minor-percent="minorPercent"
    />

    <DashboardIssuesSection
      :has-report="!!auditStore.report"
      :is-preview="isPreview"
      :exporting="exporting"
      :export-error="exportError"
      :selected-principle="selectedPrinciple"
      :selected-impact="selectedImpact"
      :search-text="searchText"
      :principle-options="principleOptions"
      :filtered-issues="filteredIssues"
      :impact-class="impactClass"
      :violation-key="violationKey"
      :is-open="isOpen"
      :format-target="formatTarget"
      :describe-target="describeTarget"
      @update:selected-principle="selectedPrinciple = $event"
      @update:selected-impact="selectedImpact = $event"
      @update:search-text="searchText = $event"
      @clear-filters="clearFilters"
      @export-pdf="exportPdf"
      @toggle-details="toggleDetails"
    />

    <!-- <ManualChecklist :profile="selectedProfile" /> -->
  </div>
</template>

<script setup lang="ts">
import DashboardHeroSection from './components/DashboardHeroSection.vue'
import DashboardBanners from './components/DashboardBanners.vue'
import DashboardHistorySection from './components/DashboardHistorySection.vue'
import DashboardAuditFormSection from './components/DashboardAuditFormSection.vue'
import DashboardMonitoringSection from './components/DashboardMonitoringSection.vue'
import DashboardReportSummarySection from './components/DashboardReportSummarySection.vue'
import DashboardIssuesSection from './components/DashboardIssuesSection.vue'
import { useDashboardLogic } from './useDashboardLogic'

const {
  targetUrl,
  selectedProfile,
  selectedPrinciple,
  selectedImpact,
  searchText,
  exporting,
  exportError,
  auditStore,
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
} = useDashboardLogic()
</script>

<style scoped>
.audit-page {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  gap: 2.5rem;
  padding: 0.5rem 0 4rem;
}

.page-hero {
  position: relative;
  background: linear-gradient(135deg, #0f172a 0%, #111827 100%);
  color: #e2e8f0;
  border: 1px solid #0b1220;
  border-radius: var(--radius);
  padding: 2.6rem;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 2rem;
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
  width: 360px;
  height: 360px;
  right: -140px;
  top: -120px;
  background: radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.45), transparent 70%);
}

.page-hero::after {
  width: 280px;
  height: 280px;
  left: -120px;
  bottom: -130px;
  background: radial-gradient(circle at 70% 70%, rgba(14, 165, 233, 0.35), transparent 70%);
}

.page-hero__content {
  position: relative;
  z-index: 1;
}

.page-hero__content h1 {
  font-size: clamp(2rem, 1.4rem + 2vw, 3rem);
  line-height: 1.1;
  margin: 0 0 0.8rem;
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
  margin: 0 0 1.2rem;
}

.hero-tags {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: #94a3b8;
}

.hero-tags span {
  border: 1px solid #1f2937;
  padding: 0.35rem 0.7rem;
  border-radius: var(--radius);
  background: rgba(15, 23, 42, 0.45);
}

.page-hero__card {
  position: relative;
  z-index: 1;
  background: #ffffff;
  color: #0f172a;
  border-radius: var(--radius);
  padding: 1.2rem 1.4rem;
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
  margin: 0.8rem 0 0;
  padding-left: 1.1rem;
  color: #475569;
  display: grid;
  gap: 0.4rem;
}

.hero-card-meta {
  margin-top: 0.8rem;
  font-size: 0.82rem;
  color: #64748b;
}

.hero-mockup {
  background: #0b1220;
  border-radius: var(--radius);
  border: 1px solid #1f2937;
  padding: 1.1rem 1.2rem;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.55);
  color: #e2e8f0;
}

.mockup-header {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.9rem;
}

.mockup-title {
  font-weight: 600;
}

.mockup-pill {
  font-size: 0.68rem;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius);
  border: 1px solid #334155;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.8);
}

.mockup-score {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.7rem;
  align-items: center;
  margin-bottom: 0.9rem;
}

.score-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #0b1220;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  box-shadow: 0 8px 18px rgba(22, 163, 74, 0.35);
}

.score-meta strong {
  color: #e2e8f0;
}

.score-meta span {
  display: block;
  color: #94a3b8;
  font-size: 0.8rem;
}

.mockup-bars {
  display: grid;
  gap: 0.65rem;
}

.bar {
  display: grid;
  gap: 0.3rem;
  font-size: 0.72rem;
  color: #94a3b8;
}

.bar-track {
  height: 7px;
  background: #111827;
  border-radius: var(--radius);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: var(--radius);
}

.bar-fill.critical {
  width: 72%;
  background: linear-gradient(90deg, #ef4444, #b91c1c);
}

.bar-fill.moderate {
  width: 55%;
  background: linear-gradient(90deg, #f59e0b, #b45309);
}

.bar-fill.minor {
  width: 35%;
  background: linear-gradient(90deg, #38bdf8, #0284c7);
}

.report-preview {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 2rem;
  align-items: center;
  padding: 1.8rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
}

.report-preview__copy h2 {
  margin: 0.2rem 0 0.6rem;
  font-size: clamp(1.4rem, 1.1rem + 1vw, 2rem);
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.8rem;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
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

.audit-history .btn-filter-clear {
  height: auto;
}

.history-actions {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.history-list {
  display: grid;
  gap: 0.9rem;
}

.history-card {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 0.9rem 1.1rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface-2);
}

.history-card.is-active {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  background: #ffffff;
}

.history-meta strong {
  display: block;
  color: #0f172a;
}

.history-sub {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.history-sub .pill {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #ffffff;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.history-stats {
  display: flex;
  gap: 0.8rem;
  margin-top: 0.4rem;
  font-size: 0.85rem;
  color: var(--text-muted);
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

.form-grid {
  display: grid;
  gap: 1.5rem;
}

.field {
  display: grid;
  gap: 0.6rem;
}

.field--actions {
  align-self: end;
}

.field--actions .btn {
  width: 100%;
}

.field-label {
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 700;
}

.field-control {
  width: 100%;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  padding: 0.65rem 0.8rem;
  font-size: 0.95rem;
  background: #ffffff;
  color: #0f172a;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field-control:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
}

.field-hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.form-error {
  padding: 0.75rem 0.9rem;
  border-radius: var(--radius);
  border: 1px solid rgba(185, 28, 28, 0.25);
  background: rgba(185, 28, 28, 0.08);
  color: #7f1d1d;
  font-size: 0.9rem;
}

.profile-toggle {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.profile-option {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  align-items: start;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.profile-option input {
  margin-top: 0.25rem;
  accent-color: #2563eb;
}

.profile-option .sub {
  display: block;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.profile-option.is-selected {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.audit-page .btn {
  border-radius: var(--radius);
  font-weight: 600;
  padding: 0.65rem 1.5rem;
}

.audit-page .btn-sm {
  padding: 0.45rem 0.9rem;
  font-size: 0.8rem;
}

.audit-page .btn-primary {
  background: linear-gradient(135deg, var(--brand), #1e40af);
  border: none;
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(29, 78, 216, 0.3);
}

.audit-page .btn-primary:disabled {
  box-shadow: none;
  opacity: 0.6;
}

.audit-page .btn-outline {
  border: 1px solid var(--border);
  background: transparent;
  color: #0f172a;
}

.audit-page .btn-outline:hover {
  background: var(--surface-2);
}

.audit-page .btn .spinner-border {
  margin-right: 0.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.stat-card {
  border: 1px solid transparent;
  border-radius: var(--radius);
  padding: 1.2rem 1.3rem;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
  display: grid;
  gap: 0.35rem;
  color: #0f172a;
}

.stat-label {
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 700;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
}

.stat-meta {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.stat-card.stat-critical {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(185, 28, 28, 0.1));
  border-color: rgba(185, 28, 28, 0.25);
}

.stat-card.stat-moderate {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(180, 83, 9, 0.12));
  border-color: rgba(180, 83, 9, 0.25);
}

.stat-card.stat-minor {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(2, 132, 199, 0.12));
  border-color: rgba(2, 132, 199, 0.25);
}

.stat-card.stat-critical .stat-value,
.stat-card.stat-moderate .stat-value,
.stat-card.stat-minor .stat-value {
  color: #0f172a;
}

.stat-card.stat-critical .stat-label,
.stat-card.stat-critical .stat-meta {
  color: #7f1d1d;
}

.stat-card.stat-moderate .stat-label,
.stat-card.stat-moderate .stat-meta {
  color: #7c2d12;
}

.stat-card.stat-minor .stat-label,
.stat-card.stat-minor .stat-meta {
  color: #075985;
}

.filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.2rem;
  align-items: end;
}

.btn-filter-clear {
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: #0f172a;
  box-shadow: none;
  height: 44px;
}

.btn-filter-clear:hover {
  background: #e2e8f0;
}

.btn-export {
  background: linear-gradient(135deg, var(--brand), #1e40af);
  border: none;
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(29, 78, 216, 0.3);
  height: 44px;
}

.btn-export:hover {
  filter: brightness(1.05);
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(29, 78, 216, 0.35);
}

.btn-filter-clear:disabled,
.btn-export:disabled {
  opacity: 0.6;
  box-shadow: none;
}

.issue-list {
  display: grid;
  border-top: 1px solid var(--border);
  margin-top: 1rem;
}

.issue-card {
  padding: 1.25rem 0;
  border-bottom: 1px solid var(--border);
  display: grid;
  gap: 0.6rem;
}

.issue-card.impact-critical {
  border-left: 4px solid var(--danger);
  padding-left: 1rem;
}

.issue-card.impact-serious {
  border-left: 4px solid #c2410c;
  padding-left: 1rem;
}

.issue-card.impact-moderate {
  border-left: 4px solid var(--warning);
  padding-left: 1rem;
}

.issue-card.impact-minor {
  border-left: 4px solid var(--info);
  padding-left: 1rem;
}

.issue-card:last-child {
  border-bottom: 0;
}

.issue-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
}

.issue-title {
  margin: 0;
  font-weight: 700;
  color: #0f172a;
}

.issue-card.impact-critical .issue-title {
  color: var(--danger);
}

.issue-card.impact-serious .issue-title {
  color: #c2410c;
}

.issue-card.impact-moderate .issue-title {
  color: var(--warning);
}

.issue-card.impact-minor .issue-title {
  color: var(--info);
}

.issue-desc {
  margin: 0;
  color: var(--text-muted);
}

.issue-meta {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.issue-count {
  color: var(--text-muted);
}

.issue-details {
  margin-top: 0.4rem;
  padding: 0.9rem 1rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface-2);
  font-size: 0.85rem;
  color: #475569;
  display: grid;
  gap: 0.6rem;
}

.empty-inline {
  color: var(--text-muted);
}

.node-detail {
  display: grid;
  gap: 0.3rem;
}

.node-code code,
.issue-details code {
  background: #0f172a;
  color: #e2e8f0;
  padding: 0.2rem 0.35rem;
  border-radius: var(--radius);
}

.node-note {
  color: #64748b;
}

.node-more {
  color: var(--text-muted);
}

.impact-pill {
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  font-weight: 700;
  padding: 0.35rem 0.55rem;
  border-radius: var(--radius);
  min-width: 7rem;
  text-align: center;
  background: rgba(15, 23, 42, 0.06);
  color: #0f172a;
  border: 1px solid var(--border);
}

.impact-pill.impact-critical {
  color: var(--danger);
  background: rgba(185, 28, 28, 0.12);
  border-color: rgba(185, 28, 28, 0.35);
}

.impact-pill.impact-serious {
  color: #9a3412;
  background: rgba(194, 65, 12, 0.12);
  border-color: rgba(194, 65, 12, 0.35);
}

.impact-pill.impact-moderate {
  color: var(--warning);
  background: rgba(180, 83, 9, 0.14);
  border-color: rgba(180, 83, 9, 0.35);
}

.impact-pill.impact-minor {
  color: var(--info);
  background: rgba(2, 132, 199, 0.14);
  border-color: rgba(2, 132, 199, 0.35);
}

.empty-state {
  padding: 2rem 0;
  text-align: center;
  color: var(--text-muted);
}

.empty-state--hint {
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  padding: 1.5rem;
}

@media (max-width: 1100px) {
  .page-hero {
    grid-template-columns: 1fr;
  }

  .page-hero__card {
    width: 100%;
  }

  .report-preview {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 980px) {
  .stats-grid,
  .filters {
    grid-template-columns: 1fr;
  }

  .issue-header {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .history-card {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .page-hero {
    padding: 2rem 1.6rem;
  }

  .panel {
    padding: 1.4rem;
  }

  .input-row {
    grid-template-columns: 1fr;
  }
}
</style>


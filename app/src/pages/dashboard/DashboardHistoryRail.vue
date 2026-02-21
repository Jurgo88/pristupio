<template>
  <aside class="workspace-rail mobile-pane mobile-pane--history">
    <section class="panel audit-history">
      <div class="panel-head panel-head--tight">
        <div>
          <p class="kicker">História</p>
          <h2>História auditov</h2>
        </div>
        <div class="history-actions">
          <button
            class="btn btn-sm btn-filter-clear"
            @click="$emit('openLatestAudit')"
            :disabled="historyLoading || historyLoadingMore || !latestAudit"
          >
            Zobraziť posledný audit
          </button>
          <button
            class="btn btn-sm btn-filter-clear"
            @click="$emit('refreshHistory')"
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
          :load-more-history="loadMoreHistory"
        />
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import type { AuditHistoryItem, DashboardReportSummary } from './dashboard.types'
import DashboardAuditHistoryList from './DashboardAuditHistoryList.vue'

type FormatDateFn = (value?: string) => string
type IssueSummaryFn = (summary: DashboardReportSummary | null | undefined) => number
type SelectAuditFn = (auditId: string) => void | Promise<void>
type RunMonitoringFn = (audit: AuditHistoryItem) => void | Promise<void>
type LoadMoreHistoryFn = () => void | Promise<void>

defineProps<{
  historyLoading: boolean
  historyLoadingMore: boolean
  latestAudit: AuditHistoryItem | null
  historyError: string
  monitoringLoadingAction: boolean
  monitoringHasAccess: boolean
  monitoringActiveTargetUrls: string[]
  monitoringCanAddTarget: boolean
  monitoringDomainsLimit: number
  historyHasMore: boolean
  auditHistory: AuditHistoryItem[]
  selectedAuditId: string | null
  formatDate: FormatDateFn
  issueTotal: IssueSummaryFn
  issueHigh: IssueSummaryFn
  selectAudit: SelectAuditFn
  runMonitoringForAudit: RunMonitoringFn
  loadMoreHistory: LoadMoreHistoryFn
}>()

defineEmits<{
  (event: 'openLatestAudit'): void
  (event: 'refreshHistory'): void
}>()
</script>

<style scoped>
.workspace-rail {
  display: grid;
  gap: 1rem;
  position: sticky;
  top: var(--dashboard-sticky-offset);
  max-height: calc(100vh - var(--dashboard-sticky-offset) - 0.5rem);
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.8rem;
  box-shadow: var(--shadow-sm);
}

.audit-history {
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

.kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 700;
  margin: 0 0 0.4rem;
}

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

@media (max-width: 980px) {
  .workspace-rail {
    position: static;
    max-height: none;
  }

  .audit-history {
    grid-template-rows: auto;
    max-height: none;
    min-height: 0;
    overflow: visible;
  }

  .history-scroll {
    overflow: auto;
    padding-right: 0;
  }
}

@media (max-width: 640px) {
  .panel {
    padding: 1.4rem;
  }
}
</style>

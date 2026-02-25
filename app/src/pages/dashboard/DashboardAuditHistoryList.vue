<template>
  <div v-if="historyError" class="status-alert status-alert--danger">{{ historyError }}</div>

  <div v-if="historyLoading" class="status-state status-state--loading">{{ copy.loading }}</div>

  <div v-else-if="auditHistory.length === 0" class="status-state">{{ copy.empty }}</div>

  <div v-else class="history-list">
    <article
      v-for="(audit, index) in auditHistory"
      :key="audit.id"
      class="history-card"
      :class="{ 'is-active': selectedAuditId === audit.id }"
    >
      <div class="history-meta">
        <strong>{{ audit.url }}</strong>
        <div class="history-sub">
          <span>{{ formatDate(audit.created_at) }}</span>
          <span class="pill">{{ auditPillLabel(audit) }}</span>
        </div>
        <div class="history-stats">
          <span>{{ copy.statsTotal }}: {{ issueTotal(audit.summary) }}</span>
          <span>{{ copy.statsHigh }}: {{ issueHigh(audit.summary) }}</span>
        </div>
        <div v-if="compareWithPrevious(index)" class="history-delta">
          <span class="history-delta__label">{{ copy.deltaLabel }}</span>
          <span class="history-delta__pill" :class="deltaClass(compareWithPrevious(index)!.total)">
            {{ copy.deltaTotal }}: {{ formatDelta(compareWithPrevious(index)!.total) }}
          </span>
          <span class="history-delta__pill" :class="deltaClass(compareWithPrevious(index)!.high)">
            {{ copy.deltaHigh }}: {{ formatDelta(compareWithPrevious(index)!.high) }}
          </span>
        </div>
      </div>
      <div class="history-card-actions">
        <button class="btn btn-sm btn-primary history-card-btn history-card-btn--primary" @click="selectAudit(audit.id)">
          {{ copy.openAudit }}
        </button>
        <span
          class="history-card-btn-wrap"
          :class="{ 'has-tooltip': !!monitorButtonTitle(audit) }"
          :title="monitorButtonTitle(audit)"
        >
          <button
            class="btn btn-sm btn-outline history-card-btn history-card-btn--monitor"
            :class="{ 'is-active': isMonitoringAudit(audit) }"
            :disabled="monitoringLoadingAction || !canMonitorAudit(audit)"
            @click="handleRunMonitoringForAudit(audit)"
          >
            {{ isPendingAudit(audit) ? copy.monitorPending : isMonitoringAudit(audit) ? copy.monitorActive : copy.monitorIdle }}
          </button>
        </span>
        <small v-if="monitorButtonTitle(audit)" class="history-monitor-hint">{{ monitorButtonTitle(audit) }}</small>
      </div>
    </article>

    <div v-if="historyHasMore" class="history-load-more">
      <div ref="historySentinel" class="history-sentinel" aria-hidden="true"></div>
      <button class="btn btn-sm btn-outline" :disabled="historyLoadingMore" @click="loadMoreHistory">
        {{ historyLoadingMore ? copy.loadMoreLoading : copy.loadMoreIdle }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { AuditHistoryItem, DashboardReportSummary } from './dashboard.types'
import { DASHBOARD_HISTORY_TEXT } from './dashboard.copy'

const copy = DASHBOARD_HISTORY_TEXT

type FormatDateFn = (value?: string) => string
type IssueSummaryFn = (summary: DashboardReportSummary | null | undefined) => number
type SelectAuditFn = (auditId: string) => void | Promise<void>
type RunMonitoringFn = (audit: AuditHistoryItem) => void | Promise<void>

const props = defineProps<{
  historyError: string
  historyLoading: boolean
  historyLoadingMore: boolean
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
  loadMoreHistory: () => void | Promise<void>
}>()

const historySentinel = ref<HTMLElement | null>(null)
const pendingMonitoringAuditId = ref<string | null>(null)
let observer: IntersectionObserver | null = null

const normalizeUrl = (value?: string) => (value || '').trim().replace(/\/+$/, '').toLowerCase()

const isMonitoringAudit = (audit: AuditHistoryItem) => {
  const normalizedAuditUrl = normalizeUrl(audit.url)
  if (!normalizedAuditUrl) return false
  return (props.monitoringActiveTargetUrls || [])
    .map((value) => normalizeUrl(value))
    .includes(normalizedAuditUrl)
}

const canMonitorAudit = (audit: AuditHistoryItem) => {
  if (!props.monitoringHasAccess) return false
  if (isMonitoringAudit(audit)) return false
  return props.monitoringCanAddTarget
}

const monitorButtonTitle = (audit: AuditHistoryItem) => {
  if (!props.monitoringHasAccess) return copy.monitorTooltipNoAccess
  if (isMonitoringAudit(audit)) return copy.monitorTooltipAlreadyActive
  if (!isMonitoringAudit(audit) && !props.monitoringCanAddTarget) {
    return copy.monitorTooltipLimit(props.monitoringDomainsLimit)
  }
  return ''
}

const isPendingAudit = (audit: AuditHistoryItem) => {
  return props.monitoringLoadingAction && pendingMonitoringAuditId.value === audit.id
}

const auditPillLabel = (audit: AuditHistoryItem) => {
  if (audit.scope === 'site') return copy.pillSite
  return audit.audit_kind === 'paid' ? copy.pillPaid : copy.pillFree
}

const compareWithPrevious = (index: number) => {
  const current = props.auditHistory[index]
  const previous = props.auditHistory[index + 1]
  if (!current || !previous) return null

  return {
    total: props.issueTotal(current.summary) - props.issueTotal(previous.summary),
    high: props.issueHigh(current.summary) - props.issueHigh(previous.summary)
  }
}

const formatDelta = (value: number) => {
  if (value > 0) return `+${value}`
  return `${value}`
}

const deltaClass = (value: number) => {
  if (value > 0) return 'is-worse'
  if (value < 0) return 'is-better'
  return 'is-neutral'
}

const handleRunMonitoringForAudit = async (audit: AuditHistoryItem) => {
  pendingMonitoringAuditId.value = audit.id
  try {
    await props.runMonitoringForAudit(audit)
  } finally {
    pendingMonitoringAuditId.value = null
  }
}

const tryLoadMore = () => {
  if (!props.historyHasMore || props.historyLoading || props.historyLoadingMore) return
  void props.loadMoreHistory()
}

onMounted(() => {
  const sentinel = historySentinel.value
  if (!sentinel || typeof IntersectionObserver === 'undefined') return

  const scrollRoot = sentinel.closest('.history-scroll') as HTMLElement | null
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry?.isIntersecting) {
        tryLoadMore()
      }
    },
    {
      root: scrollRoot,
      rootMargin: '120px 0px',
      threshold: 0.01
    }
  )
  observer.observe(sentinel)
})

watch(
  () => [props.historyHasMore, props.historyLoading, props.historyLoadingMore, props.auditHistory.length],
  () => {
    tryLoadMore()
  }
)

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<style scoped>
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
  min-width: 0;
}

.history-card.is-active {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  background: #ffffff;
}

.history-meta strong {
  display: block;
  color: #0f172a;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.history-meta {
  min-width: 0;
  flex: 1 1 auto;
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
  flex-wrap: wrap;
  gap: 0.8rem;
  margin-top: 0.4rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.history-delta {
  margin-top: 0.45rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.45rem;
  align-items: center;
}

.history-delta__label {
  font-size: 0.72rem;
  color: #64748b;
}

.history-delta__pill {
  display: inline-flex;
  align-items: center;
  padding: 0.14rem 0.45rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #ffffff;
  font-size: 0.72rem;
  font-weight: 600;
}

.history-delta__pill.is-worse {
  color: #991b1b;
  border-color: rgba(220, 38, 38, 0.35);
  background: rgba(239, 68, 68, 0.12);
}

.history-delta__pill.is-better {
  color: #166534;
  border-color: rgba(22, 163, 74, 0.34);
  background: rgba(34, 197, 94, 0.14);
}

.history-delta__pill.is-neutral {
  color: #334155;
}

.history-card-actions {
  display: grid;
  gap: 0.35rem;
  align-items: start;
  justify-items: stretch;
  width: min(170px, 100%);
  min-width: 140px;
  flex: 0 1 170px;
}

.history-card-btn {
  width: 100%;
  justify-content: center;
}

.history-card-btn--primary {
  box-shadow: 0 10px 20px rgba(29, 78, 216, 0.22);
}

.history-card-btn--monitor.is-active {
  border-color: rgba(22, 163, 74, 0.42);
  color: #166534;
  background: rgba(22, 163, 74, 0.1);
}

.history-card-btn-wrap {
  display: block;
  width: 100%;
}

.history-card-btn-wrap.has-tooltip {
  cursor: help;
}

.history-monitor-hint {
  display: block;
  margin-top: 0.05rem;
  color: #64748b;
  font-size: 0.73rem;
  line-height: 1.3;
}

.history-load-more {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  justify-content: center;
  align-items: center;
  padding-top: 0.2rem;
}

.history-sentinel {
  width: 100%;
  height: 1px;
}

[data-theme='dark'] .history-card {
  background: #13233c;
  border-color: #2b3d5a;
}

[data-theme='dark'] .history-card.is-active {
  background: linear-gradient(140deg, rgba(37, 99, 235, 0.28), rgba(14, 116, 144, 0.2));
  border-color: rgba(96, 165, 250, 0.72);
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
}

[data-theme='dark'] .history-meta strong {
  color: #e2e8f0;
}

[data-theme='dark'] .history-sub {
  color: #a7b6cb;
}

[data-theme='dark'] .history-sub .pill {
  background: #0f1c31;
  border-color: #334862;
  color: #bfdbfe;
}

[data-theme='dark'] .history-stats {
  color: #9eb1c9;
}

[data-theme='dark'] .history-delta__label {
  color: #9eb1c9;
}

[data-theme='dark'] .history-delta__pill {
  background: #0f1c31;
  border-color: #334862;
  color: #dbe7fb;
}

[data-theme='dark'] .history-delta__pill.is-worse {
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.45);
  background: rgba(185, 28, 28, 0.28);
}

[data-theme='dark'] .history-delta__pill.is-better {
  color: #bbf7d0;
  border-color: rgba(74, 222, 128, 0.42);
  background: rgba(22, 163, 74, 0.24);
}

[data-theme='dark'] .history-card-btn--monitor.is-active {
  border-color: rgba(74, 222, 128, 0.45);
  color: #bbf7d0;
  background: rgba(22, 163, 74, 0.18);
}

[data-theme='dark'] .history-monitor-hint {
  color: #9eb1c9;
}

@media (max-width: 980px) {
  .history-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .history-card-actions {
    width: 100%;
    flex-basis: auto;
  }
}
</style>

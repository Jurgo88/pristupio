<template>
  <div v-if="historyError" class="status-alert status-alert--danger">{{ historyError }}</div>

  <div v-if="historyLoading" class="status-state status-state--loading">Načítavam históriu...</div>

  <div v-else-if="auditHistory.length === 0" class="status-state">Zatiaľ nemáte žiadne audity.</div>

  <div v-else class="history-list">
    <article
      v-for="audit in auditHistory"
      :key="audit.id"
      class="history-card"
      :class="{ 'is-active': selectedAuditId === audit.id }"
    >
      <div class="history-meta">
        <strong>{{ audit.url }}</strong>
        <div class="history-sub">
          <span>{{ formatDate(audit.created_at) }}</span>
          <span class="pill">{{ audit.audit_kind === 'paid' ? 'Základný audit' : 'Free audit' }}</span>
        </div>
        <div class="history-stats">
          <span>Spolu: {{ issueTotal(audit.summary) }}</span>
          <span>Kritické: {{ issueHigh(audit.summary) }}</span>
        </div>
      </div>
      <div class="history-card-actions">
        <button class="btn btn-sm btn-outline history-card-btn" @click="selectAudit(audit.id)">
          Zobraziť audit
        </button>
        <span
          class="history-card-btn-wrap"
          :class="{ 'has-tooltip': !!monitorButtonTitle(audit) }"
          :title="monitorButtonTitle(audit)"
        >
          <button
            class="btn btn-sm history-card-btn"
            :class="isMonitoringAudit(audit) ? 'btn-success' : 'btn-primary'"
            :disabled="monitoringLoadingAction || !canMonitorAudit(audit)"
            @click="handleRunMonitoringForAudit(audit)"
          >
            {{ isPendingAudit(audit) ? 'Nastavujem...' : isMonitoringAudit(audit) ? 'Monitorujem' : 'Monitoruj' }}
          </button>
        </span>
      </div>
    </article>

    <div v-if="historyHasMore" class="history-load-more">
      <div ref="historySentinel" class="history-sentinel" aria-hidden="true"></div>
      <button class="btn btn-sm btn-outline" :disabled="historyLoadingMore" @click="loadMoreHistory">
        {{ historyLoadingMore ? 'Načítavam ďalšie...' : 'Načítať ďalšie' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { AuditHistoryItem, DashboardReportSummary } from './dashboard.types'

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
  if (isMonitoringAudit(audit)) return true
  return props.monitoringCanAddTarget
}

const monitorButtonTitle = (audit: AuditHistoryItem) => {
  if (!props.monitoringHasAccess) return 'Pre monitoring si treba zakupit predplatne.'
  if (!isMonitoringAudit(audit) && !props.monitoringCanAddTarget) {
    return `Dosiahli ste limit monitorovanych domen (${props.monitoringDomainsLimit}).`
  }
  return ''
}

const isPendingAudit = (audit: AuditHistoryItem) => {
  return props.monitoringLoadingAction && pendingMonitoringAuditId.value === audit.id
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

.history-card-actions {
  display: grid;
  gap: 0.45rem;
  align-items: start;
  justify-items: stretch;
  width: 150px;
  flex: 0 0 150px;
}

.history-card-btn {
  width: 100%;
  justify-content: center;
}

.history-card-btn-wrap {
  display: block;
  width: 100%;
}

.history-card-btn-wrap.has-tooltip {
  cursor: help;
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

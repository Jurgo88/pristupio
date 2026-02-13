<template>
  <div v-if="historyError" class="form-error">{{ historyError }}</div>

  <div v-if="historyLoading" class="empty-state">Načítavam históriu...</div>

  <div v-else-if="auditHistory.length === 0" class="empty-state">Zatiaľ nemáte žiadne audity.</div>

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
      <button class="btn btn-sm btn-outline" @click="selectAudit(audit.id)">Zobraziť audit</button>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { AuditHistoryItem, DashboardReportSummary } from './dashboard.types'

type FormatDateFn = (value?: string) => string
type IssueSummaryFn = (summary: DashboardReportSummary | null | undefined) => number
type SelectAuditFn = (auditId: string) => void | Promise<void>

defineProps<{
  historyError: string
  historyLoading: boolean
  auditHistory: AuditHistoryItem[]
  selectedAuditId: string | null
  formatDate: FormatDateFn
  issueTotal: IssueSummaryFn
  issueHigh: IssueSummaryFn
  selectAudit: SelectAuditFn
}>()
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

.empty-state {
  padding: 2rem 0;
  text-align: center;
  color: var(--text-muted);
}

.form-error {
  padding: 0.75rem 0.9rem;
  border-radius: var(--radius);
  border: 1px solid rgba(185, 28, 28, 0.25);
  background: rgba(185, 28, 28, 0.08);
  color: #7f1d1d;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

@media (max-width: 980px) {
  .history-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

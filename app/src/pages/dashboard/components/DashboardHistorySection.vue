<script setup lang="ts">
type AuditHistoryItem = {
  id: string
  url: string
  audit_kind: 'free' | 'paid'
  summary: any
  created_at: string
}

defineProps<{
  historyLoading: boolean
  historyError: string
  auditHistory: AuditHistoryItem[]
  selectedAuditId: string | null
  latestAudit: AuditHistoryItem | null
  formatDate: (value?: string) => string
  issueTotal: (summary: any) => number
  issueHigh: (summary: any) => number
}>()

const emit = defineEmits<{
  (e: 'open-latest-audit'): void
  (e: 'reload-history'): void
  (e: 'select-audit', auditId: string): void
}>()
</script>

<template>
  <section class="panel audit-history">
    <div class="panel-head panel-head--tight">
      <div>
        <p class="kicker">História</p>
        <h2>História auditov</h2>
      </div>
      <div class="history-actions">
        <button
          class="btn btn-sm btn-filter-clear"
          @click="emit('open-latest-audit')"
          :disabled="historyLoading || !latestAudit"
        >
          Zobraziť posledný audit
        </button>
        <button class="btn btn-sm btn-filter-clear" @click="emit('reload-history')" :disabled="historyLoading">
          {{ historyLoading ? 'Načítavam...' : 'Obnoviť' }}
        </button>
      </div>
    </div>

    <div v-if="historyError" class="form-error">{{ historyError }}</div>

    <div v-if="historyLoading" class="empty-state">Načítavam históriu...</div>

    <div v-else-if="auditHistory.length === 0" class="empty-state">
      Zatiaľ nemáte žiadne audity.
    </div>

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
        <button class="btn btn-sm btn-outline" @click="emit('select-audit', audit.id)">
          Zobraziť audit
        </button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.8rem;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
}

.kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 700;
  margin: 0 0 0.4rem;
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

.btn {
  border-radius: var(--radius);
  font-weight: 600;
  padding: 0.65rem 1.5rem;
}

.btn-sm {
  padding: 0.45rem 0.9rem;
  font-size: 0.8rem;
}

.btn-filter-clear {
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: #0f172a;
  box-shadow: none;
  height: 44px;
}

.btn-outline {
  border: 1px solid var(--border);
  background: transparent;
  color: #0f172a;
}

.form-error {
  padding: 0.75rem 0.9rem;
  border-radius: var(--radius);
  border: 1px solid rgba(185, 28, 28, 0.25);
  background: rgba(185, 28, 28, 0.08);
  color: #7f1d1d;
  font-size: 0.9rem;
}

.empty-state {
  padding: 2rem 0;
  text-align: center;
  color: var(--text-muted);
}

@media (max-width: 980px) {
  .history-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

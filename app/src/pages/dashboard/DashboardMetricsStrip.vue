<template>
  <section class="metrics-strip" :aria-label="copy.ariaLabel">
    <article class="metric-card">
      <span>{{ copy.scoreTitle }}</span>
      <strong>{{ hasReport ? `${auditScore}%` : '--' }}</strong>
      <small>{{ scoreStateLabel }}</small>
    </article>
    <button
      type="button"
      class="metric-card metric-card--interactive"
      :disabled="!hasReport"
      @click="$emit('focusHighIssues')"
    >
      <span>{{ copy.highIssuesTitle }}</span>
      <strong>{{ hasReport ? highCount : '--' }}</strong>
      <small>{{ copy.highIssuesMeta }}</small>
    </button>
    <button
      type="button"
      class="metric-card metric-card--interactive"
      :disabled="!hasReport"
      @click="$emit('focusAllIssues')"
    >
      <span>{{ copy.allIssuesTitle }}</span>
      <strong>{{ hasReport ? totalIssuesCount : '--' }}</strong>
      <small>
        {{ hasReport ? `${copy.filteredIssuesPrefix}: ${filteredIssuesCount}` : copy.allIssuesFallback }}
      </small>
    </button>
    <button
      type="button"
      class="metric-card metric-card--interactive"
      :disabled="!hasLatestAudit"
      @click="$emit('openLatestAudit')"
    >
      <span>{{ copy.latestAuditTitle }}</span>
      <strong>{{ lastAuditLabel || '--' }}</strong>
      <small>{{ hasLatestAudit ? copy.latestAuditWithHistory : copy.latestAuditEmpty }}</small>
    </button>
  </section>
</template>

<script setup lang="ts">
import { DASHBOARD_METRICS_TEXT } from './dashboard.copy'

const copy = DASHBOARD_METRICS_TEXT

defineProps<{
  hasReport: boolean
  auditScore: number
  scoreStateLabel: string
  highCount: number
  totalIssuesCount: number
  filteredIssuesCount: number
  lastAuditLabel: string
  hasLatestAudit: boolean
}>()

defineEmits<{
  (event: 'focusHighIssues'): void
  (event: 'focusAllIssues'): void
  (event: 'openLatestAudit'): void
}>()
</script>

<style scoped>
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

.metric-card--interactive {
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.metric-card--interactive:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.45);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.1);
}

.metric-card--interactive:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.metric-card--interactive:disabled {
  cursor: default;
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

@media (max-width: 1100px) {
  .metrics-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .metrics-strip {
    grid-template-columns: 1fr;
  }
}
</style>

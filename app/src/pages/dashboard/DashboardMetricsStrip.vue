<template>
  <section class="metrics-strip" aria-label="Klucove metriky">
    <article class="metric-card">
      <span>Skore pripravenosti</span>
      <strong>{{ hasReport ? `${auditScore}%` : '--' }}</strong>
      <small>{{ scoreStateLabel }}</small>
    </article>
    <article class="metric-card">
      <span>Kriticke nalezy</span>
      <strong>{{ hasReport ? highCount : '--' }}</strong>
      <small>Priorita pre najblizsi sprint</small>
    </article>
    <article class="metric-card">
      <span>Vsetky nalezy</span>
      <strong>{{ hasReport ? totalIssuesCount : '--' }}</strong>
      <small>{{ hasReport ? `Filtrovatelnych: ${filteredIssuesCount}` : 'Po audite sa doplni' }}</small>
    </article>
    <article class="metric-card">
      <span>Posledny audit</span>
      <strong>{{ lastAuditLabel || '--' }}</strong>
      <small>{{ hasLatestAudit ? 'Audit historia je aktivna' : 'Po prvom audite uvidite historiu' }}</small>
    </article>
  </section>
</template>

<script setup lang="ts">
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

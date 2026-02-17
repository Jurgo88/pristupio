<template>
  <section class="stats-grid">
    <article class="stat-card stat-critical">
      <div class="stat-label">{{ DASHBOARD_IMPACT_TEXT.high }}</div>
      <div class="stat-value">{{ highCount }}</div>
      <div class="stat-meta">{{ DASHBOARD_STATS_TEXT.highMeta }}</div>
    </article>
    <article class="stat-card stat-moderate">
      <div class="stat-label">{{ DASHBOARD_IMPACT_TEXT.moderate }}</div>
      <div class="stat-value">{{ medCount }}</div>
      <div class="stat-meta">{{ DASHBOARD_STATS_TEXT.moderateMeta }}</div>
    </article>
    <article class="stat-card stat-minor">
      <div class="stat-label">{{ DASHBOARD_IMPACT_TEXT.minor }}</div>
      <div class="stat-value">{{ lowCount }}</div>
      <div class="stat-meta">{{ DASHBOARD_STATS_TEXT.minorMeta }}</div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { DASHBOARD_IMPACT_TEXT, DASHBOARD_STATS_TEXT } from './dashboard.constants'

defineProps<{
  highCount: number
  medCount: number
  lowCount: number
}>()
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.stat-card {
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  padding: 1.2rem 1.3rem;
  box-shadow: var(--shadow-sm);
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
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(127, 29, 29, 0.08));
  border-color: rgba(185, 28, 28, 0.25);
}

.stat-card.stat-moderate {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(180, 83, 9, 0.1));
  border-color: rgba(180, 83, 9, 0.25);
}

.stat-card.stat-minor {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.16), rgba(2, 132, 199, 0.1));
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

[data-theme='dark'] .stat-card {
  color: #e2e8f0;
  border-color: #2d3f5e;
  box-shadow: var(--shadow-sm);
}

[data-theme='dark'] .stat-card.stat-critical {
  background: linear-gradient(135deg, rgba(127, 29, 29, 0.58), rgba(69, 10, 10, 0.52));
  border-color: rgba(248, 113, 113, 0.45);
}

[data-theme='dark'] .stat-card.stat-moderate {
  background: linear-gradient(135deg, rgba(146, 64, 14, 0.5), rgba(120, 53, 15, 0.44));
  border-color: rgba(251, 191, 36, 0.42);
}

[data-theme='dark'] .stat-card.stat-minor {
  background: linear-gradient(135deg, rgba(12, 74, 110, 0.56), rgba(8, 47, 73, 0.5));
  border-color: rgba(56, 189, 248, 0.42);
}

[data-theme='dark'] .stat-card .stat-value,
[data-theme='dark'] .stat-card .stat-label,
[data-theme='dark'] .stat-card .stat-meta {
  color: #e2e8f0;
}

[data-theme='dark'] .stat-card .stat-label {
  opacity: 0.92;
}

[data-theme='dark'] .stat-card .stat-meta {
  opacity: 0.86;
}

@media (max-width: 980px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>

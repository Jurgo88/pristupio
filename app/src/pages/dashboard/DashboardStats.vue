<template>
  <section class="stats-grid">
    <article class="stat-card stat-critical">
      <div class="stat-label">Critical & Serious</div>
      <div class="stat-value">{{ highCount }}</div>
      <div class="stat-meta">Najvyššia priorita</div>
    </article>
    <article class="stat-card stat-moderate">
      <div class="stat-label">Moderate</div>
      <div class="stat-value">{{ medCount }}</div>
      <div class="stat-meta">Vyžaduje plán opráv</div>
    </article>
    <article class="stat-card stat-minor">
      <div class="stat-label">Minor</div>
      <div class="stat-value">{{ lowCount }}</div>
      <div class="stat-meta">Nižší dopad</div>
    </article>
  </section>
</template>

<script setup lang="ts">
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

@media (max-width: 980px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>

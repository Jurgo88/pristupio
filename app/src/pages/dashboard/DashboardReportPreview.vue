<template>
  <section class="report-preview">
    <div class="report-preview__copy">
      <p class="kicker">Prehľad reportu</p>
      <h2>Index pripravenosti</h2>
      <p class="lead">
        Skóre vychádza z pomeru závažností problémov. Čím menej kritických nálezov, tým vyššia
        pripravenosť.
      </p>
    </div>
    <div class="hero-mockup">
      <div class="mockup-header">
        <div class="mockup-title">Audit report</div>
        <div class="mockup-pill">WCAG 2.1 AA</div>
      </div>
      <div class="mockup-score">
        <div class="score-circle">{{ auditScore }}</div>
        <div class="score-meta">
          <strong>Prístupnosť</strong>
          <span>Index pripravenosti</span>
        </div>
      </div>
      <div class="mockup-bars">
        <div class="bar">
          <span>Critical & Serious</span>
          <div class="bar-track">
            <div class="bar-fill critical" :style="{ width: criticalPercent + '%' }"></div>
          </div>
          <small>{{ highCount }} problémov</small>
        </div>
        <div class="bar">
          <span>Moderate</span>
          <div class="bar-track">
            <div class="bar-fill moderate" :style="{ width: moderatePercent + '%' }"></div>
          </div>
          <small>{{ medCount }} problémov</small>
        </div>
        <div class="bar">
          <span>Minor</span>
          <div class="bar-track">
            <div class="bar-fill minor" :style="{ width: minorPercent + '%' }"></div>
          </div>
          <small>{{ lowCount }} problémov</small>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  auditScore: number
  highCount: number
  medCount: number
  lowCount: number
  criticalPercent: number
  moderatePercent: number
  minorPercent: number
}>()
</script>

<style scoped>
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
  background: linear-gradient(90deg, #ef4444, #b91c1c);
}

.bar-fill.moderate {
  background: linear-gradient(90deg, #f59e0b, #b45309);
}

.bar-fill.minor {
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

@media (max-width: 1100px) {
  .report-preview {
    grid-template-columns: 1fr;
  }
}
</style>

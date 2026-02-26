<template>
  <section class="report-preview" aria-labelledby="report-preview-title">
    <div class="report-preview__copy">
      <p class="kicker">{{ DASHBOARD_REPORT_PREVIEW_TEXT.kicker }}</p>
      <h2 id="report-preview-title">{{ DASHBOARD_REPORT_PREVIEW_TEXT.title }}</h2>
      <p class="lead">{{ DASHBOARD_REPORT_PREVIEW_TEXT.lead }}</p>
    </div>

    <div class="hero-mockup" aria-hidden="true">
      <div class="mockup-header">
        <div class="mockup-title">Audit report</div>
        <div class="mockup-pill">WCAG 2.1 AA</div>
      </div>

      <div class="mockup-score-wrap">
        <div class="score-circle" :class="scoreColorClass">
          <span class="score-value">{{ auditScore }}</span>
        </div>
        <div class="score-meta">
          <strong>{{ DASHBOARD_REPORT_PREVIEW_TEXT.accessibilityLabel }}</strong>
          <span>{{ DASHBOARD_REPORT_PREVIEW_TEXT.title }}</span>
        </div>
      </div>

      <div class="mockup-bars">
        <div v-for="bar in barData" :key="bar.label" class="bar-item">
          <div class="bar-info">
            <span class="bar-label">{{ bar.label }}</span>
            <span class="bar-count">{{ bar.count }} {{ DASHBOARD_REPORT_PREVIEW_TEXT.issuesSuffix }}</span>
          </div>
          <div class="bar-track" role="progressbar" :aria-valuenow="bar.percent" aria-valuemin="0" aria-valuemax="100">
            <div 
              class="bar-fill" 
              :class="bar.class" 
              :style="{ width: bar.percent + '%' }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DASHBOARD_IMPACT_TEXT, DASHBOARD_REPORT_PREVIEW_TEXT } from './dashboard.copy'

const props = defineProps<{
  auditScore: number
  highCount: number
  medCount: number
  lowCount: number
  criticalPercent: number
  moderatePercent: number
  minorPercent: number
}>()

// Dynamická farba skóre - kľúčové pre UX
const scoreColorClass = computed(() => {
  if (props.auditScore >= 80) return 'score--excellent'
  if (props.auditScore >= 50) return 'score--average'
  return 'score--poor'
})

// Dáta pre cyklus - čistí template od duplicity
const barData = computed(() => [
  { label: DASHBOARD_IMPACT_TEXT.high, count: props.highCount, percent: props.criticalPercent, class: 'critical' },
  { label: DASHBOARD_IMPACT_TEXT.moderate, count: props.medCount, percent: props.moderatePercent, class: 'moderate' },
  { label: DASHBOARD_IMPACT_TEXT.minor, count: props.lowCount, percent: props.minorPercent, class: 'minor' }
])
</script>

<style scoped>

.report-preview {
  --score-green: #22c55e;
  --score-orange: #f59e0b;
  --score-red: #ef4444;
  --score-blue: #38bdf8;
  
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 400px);
  gap: 3rem;
  align-items: center;
  padding: 2.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 1.25rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.kicker {
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.report-preview__copy h2 {
  font-size: clamp(1.5rem, 2vw, 2.25rem);
  /* font-weight: 800; */
  margin-bottom: 1rem;
  line-height: 1.2;
}

.lead {
  color: #64748b;
  font-size: 1.1rem;
  line-height: 1.6;
}

.hero-mockup {
  background: #0f172a;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  position: relative;
  overflow: hidden;
}

.mockup-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 1rem;
}

.mockup-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #f8fafc;
}

.mockup-pill {
  font-size: 0.7rem;
  padding: 0.25rem 0.6rem;
  background: rgba(56, 189, 248, 0.1);
  color: #7dd3fc;
  border-radius: 2rem;
  border: 1px solid rgba(56, 189, 248, 0.2);
}

.mockup-score-wrap {
  display: flex;
  gap: 1.25rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.score-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
  transition: all 0.5s ease;
}

.score-value {
  color: #0f172a;
}

/* Dynamické stavy skóre */
.score--excellent { background: var(--score-green); box-shadow: 0 0 20px rgba(34, 197, 94, 0.3); }
.score--average { background: var(--score-orange); box-shadow: 0 0 20px rgba(245, 158, 11, 0.3); }
.score--poor { background: var(--score-red); box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); }

.score-meta strong { display: block; color: #f8fafc; font-size: 1rem; }
.score-meta span { color: #94a3b8; font-size: 0.85rem; }

/* Progress bary */
.mockup-bars { display: grid; gap: 1rem; }
.bar-info { display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.4rem; }
.bar-label { color: #cbd5e1; font-weight: 500; }
.bar-count { color: #94a3b8; }

.bar-track {
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1); /* "Springy" animácia */
}

.bar-fill.critical { background: var(--score-red); }
.bar-fill.moderate { background: var(--score-orange); }
.bar-fill.minor { background: var(--score-blue); }

/* Dark mode overrides */
[data-theme='dark'] .report-preview {
  background: #111827;
  border-color: rgba(255, 255, 255, 0.05);
}

/* Responzivita */
@media (max-width: 1024px) {
  .report-preview {
    grid-template-columns: 1fr;
    padding: 2rem;
  }
  .hero-mockup { max-width: 450px; margin: 0 auto; }
}
</style>
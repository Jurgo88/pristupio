<template>
  <section class="page-hero">
    <div class="page-hero__content">
      <span class="kicker">{{ copy.kicker }}</span>
      <h1>{{ copy.title }}</h1>
      <p class="lead">{{ copy.lead }}</p>
      <div class="hero-tags">
        <span v-for="tag in copy.tags" :key="tag">{{ tag }}</span>
      </div>
    </div>
    <div class="page-hero__aside">
      <div class="page-hero__card">
        <div class="hero-card-title">{{ copy.workflowTitle }}</div>
        <ul>
          <li v-for="step in copy.workflowSteps" :key="step">{{ step }}</li>
        </ul>
        <div class="hero-card-meta">{{ copy.workflowMeta }}</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { DASHBOARD_HERO_TEXT } from './dashboard.copy'

const copy = DASHBOARD_HERO_TEXT
</script>

<style scoped>
.page-hero {
  position: relative;
  background: linear-gradient(125deg, #0f172a 0%, #111827 56%, #0b274f 100%);
  color: #e2e8f0;
  border: 1px solid #0b1220;
  border-radius: var(--radius-lg);
  padding: 2rem 2.2rem;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 1.4rem;
  align-items: center;
}

.page-hero::before,
.page-hero::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  opacity: 0.6;
  z-index: 0;
}

.page-hero::before {
  width: 260px;
  height: 260px;
  right: -100px;
  top: -100px;
  background: radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.45), transparent 70%);
}

.page-hero::after {
  width: 220px;
  height: 220px;
  left: -90px;
  bottom: -100px;
  background: radial-gradient(circle at 70% 70%, rgba(14, 165, 233, 0.35), transparent 70%);
}

.page-hero__content {
  position: relative;
  z-index: 1;
}

.page-hero__content h1 {
  font-size: clamp(1.7rem, 1.28rem + 1.45vw, 2.45rem);
  line-height: 1.1;
  margin: 0 0 0.5rem;
  color: #f8fafc;
}

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

.page-hero__content .lead {
  color: #cbd5f5;
  margin: 0 0 0.8rem;
  font-size: 0.94rem;
}

.page-hero .kicker {
  color: #93c5fd;
}

.hero-tags {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  font-size: 0.78rem;
  color: #cbd5e1;
}

.hero-tags span {
  border: 1px solid #1f2937;
  padding: 0.28rem 0.62rem;
  border-radius: var(--radius-pill);
  background: rgba(15, 23, 42, 0.45);
}

.page-hero__card {
  position: relative;
  z-index: 1;
  background: #ffffff;
  color: #0f172a;
  border-radius: var(--radius-md);
  padding: 1.05rem 1.1rem;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
  border: 1px solid rgba(226, 232, 240, 0.7);
}

.page-hero__aside {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 1rem;
}

.hero-card-title {
  font-weight: 700;
  font-size: 0.95rem;
}

.page-hero__card ul {
  margin: 0.55rem 0 0;
  padding-left: 1.1rem;
  color: #475569;
  display: grid;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.hero-card-meta {
  margin-top: 0.5rem;
  font-size: 0.76rem;
  color: #64748b;
}

@media (max-width: 1100px) {
  .page-hero {
    grid-template-columns: 1fr;
    padding: 1.6rem 1.5rem;
  }

  .page-hero__card {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .page-hero {
    padding: 2rem 1.6rem;
  }
}
</style>

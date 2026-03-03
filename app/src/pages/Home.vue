<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { buildLemonCheckoutUrl } from '@/utils/lemon'
import { HOME_COPY, type HomeLocale } from '@/pages/home.copy'

const auth = useAuthStore()

type PricingMode = 'audit' | 'monitoring'
type CheckoutType = PricingMode
type CheckoutTier = 'basic' | 'pro'

type PlanCardLocalized = {
  title: string
  price: string
  subtitle: string
  features: string[]
  ctaLabel: string
  ctaClass: string
  badge?: string
  featured?: boolean
}

type PlanCard = PlanCardLocalized & {
  href: string | null
  to: string
}

const locale = ref<HomeLocale>('sk')

const copy = computed(() => HOME_COPY[locale.value])
const startLink = computed(() => (auth.isLoggedIn ? '/dashboard' : '/login'))
const auditCheckoutBasicBase =
  import.meta.env.VITE_LEMON_AUDIT_CHECKOUT_URL_BASIC ||
  import.meta.env.VITE_LEMON_AUDIT_CHECKOUT_URL ||
  ''
const auditCheckoutProBase = import.meta.env.VITE_LEMON_AUDIT_CHECKOUT_URL_PRO || ''
const monitoringCheckoutBasicBase =
  import.meta.env.VITE_LEMON_MONITORING_CHECKOUT_URL_BASIC ||
  import.meta.env.VITE_LEMON_MONITORING_CHECKOUT_URL ||
  ''
const monitoringCheckoutProBase = import.meta.env.VITE_LEMON_MONITORING_CHECKOUT_URL_PRO || ''

const buildCheckout = (baseUrl: string, purchaseType: CheckoutType, tier: CheckoutTier) => {
  if (!auth.user || !baseUrl) return ''
  return buildLemonCheckoutUrl({
    baseUrl,
    userId: auth.user.id,
    email: auth.user.email,
    customData: {
      purchase_type: purchaseType,
      purchase_tier: tier
    }
  })
}

const auditCheckoutBasicUrl = computed(() => buildCheckout(auditCheckoutBasicBase, 'audit', 'basic'))
const auditCheckoutProUrl = computed(() => buildCheckout(auditCheckoutProBase, 'audit', 'pro'))
const monitoringCheckoutBasicUrl = computed(() =>
  buildCheckout(monitoringCheckoutBasicBase, 'monitoring', 'basic')
)
const monitoringCheckoutProUrl = computed(() =>
  buildCheckout(monitoringCheckoutProBase, 'monitoring', 'pro')
)
const pricingMode = ref<PricingMode>('audit')

const heroMeta = computed(() => copy.value.hero.meta)
const heroProof = computed(() => copy.value.hero.proof)
const benefitCards = computed(() => copy.value.benefits.cards)
const valueCards = computed(() => copy.value.value.cards)
const workflowSteps = computed(() => copy.value.workflow.steps)
const complianceSectors = computed(() => copy.value.compliance.sectors)

const resolvePlanCard = (plan: PlanCardLocalized, checkoutUrl?: string): PlanCard => ({
  title: plan.title,
  price: plan.price,
  subtitle: plan.subtitle,
  features: plan.features,
  ctaLabel: plan.ctaLabel,
  ctaClass: plan.ctaClass,
  badge: plan.badge,
  featured: plan.featured,
  href: auth.isLoggedIn && checkoutUrl ? checkoutUrl : null,
  to: startLink.value
})

const auditPlanCards = computed<PlanCard[]>(() => {
  const checkouts = ['', auditCheckoutBasicUrl.value, auditCheckoutProUrl.value, '', '']
  return copy.value.pricing.auditPlans.map((plan, index) => resolvePlanCard(plan, checkouts[index]))
})

const monitoringPlanCards = computed<PlanCard[]>(() => {
  const checkouts = [monitoringCheckoutBasicUrl.value, monitoringCheckoutProUrl.value, '']
  return copy.value.pricing.monitoringPlans.map((plan, index) => resolvePlanCard(plan, checkouts[index]))
})

const auditCompareMobilePlans = computed(() => copy.value.pricing.compareAuditMobile)
const monitoringCompareMobilePlans = computed(() => copy.value.pricing.compareMonitoringMobile)
let observer: IntersectionObserver | null = null

onMounted(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const revealEls = Array.from(document.querySelectorAll<HTMLElement>('.reveal'))

  if (prefersReduced || revealEls.length === 0) {
    revealEls.forEach((el) => el.classList.add('in-view'))
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view')
          observer?.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
  )

  revealEls.forEach((el) => observer?.observe(el))
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <div class="home">
    <section class="hero reveal">
      <div class="hero-inner">
        <div class="hero-copy">
          <span class="eyebrow">{{ copy.hero.eyebrow }}</span>
          <h1>{{ copy.hero.title }}</h1>
          <p>{{ copy.hero.lead }}</p>
          <div class="hero-actions">
            <router-link :to="startLink" class="btn btn-primary">{{ copy.hero.primaryCta }}</router-link>
            <a href="#pricing" class="btn btn-outline-light btn-ghost">{{ copy.hero.secondaryCta }}</a>
          </div>
          <p class="hero-note">{{ copy.hero.note }}</p>
          <div class="hero-meta">
            <span v-for="label in heroMeta" :key="label">{{ label }}</span>
          </div>
          <div class="hero-proof">
            <div v-for="item in heroProof" :key="item.title" class="proof-item">
              <strong>{{ item.title }}</strong>
              <span>{{ item.text }}</span>
            </div>
          </div>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <svg class="hero-orbits" viewBox="0 0 360 360" aria-hidden="true">
            <circle cx="180" cy="180" r="140" />
            <circle cx="180" cy="180" r="100" />
            <circle cx="180" cy="180" r="60" />
            <path d="M60 210c40-50 110-70 170-50 50 17 80 55 110 90" />
          </svg>
          <div class="mockup">
            <div class="mockup-header">
              <div class="mockup-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div class="mockup-title">{{ copy.hero.mockup.title }}</div>
              <div class="mockup-pill">{{ copy.hero.mockup.pill }}</div>
            </div>
            <div class="mockup-body">
              <div class="mockup-score">
                <div class="score-circle">82</div>
                <div class="score-meta">
                  <strong>{{ copy.hero.mockup.scoreLabel }}</strong>
                  <span>{{ copy.hero.mockup.scoreSubLabel }}</span>
                </div>
              </div>
              <div class="mockup-bars">
                <div v-for="(bar, index) in copy.hero.mockup.bars" :key="bar.label" class="bar">
                  <span>{{ bar.label }}</span>
                  <div class="bar-track">
                    <div class="bar-fill" :class="index === 0 ? 'critical' : index === 1 ? 'moderate' : 'minor'"></div>
                  </div>
                  <small>{{ bar.count }}</small>
                </div>
              </div>
              <div class="mockup-list">
                <div v-for="(finding, index) in copy.hero.mockup.findings" :key="finding.title" class="mockup-item">
                  <span class="dot" :class="index === 0 ? 'critical' : index === 1 ? 'moderate' : 'minor'"></span>
                  <div>
                    <strong>{{ finding.title }}</strong>
                    <span>{{ finding.wcag }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="floating-card">
            <div class="floating-title">{{ copy.hero.floatingCard.title }}</div>
            <ul>
              <li v-for="item in copy.hero.floatingCard.items" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="benefits reveal">
      <div class="section-head">
        <p class="kicker">{{ copy.benefits.kicker }}</p>
        <h2>{{ copy.benefits.title }}</h2>
        <p class="lead">{{ copy.benefits.lead }}</p>
      </div>
      <div class="benefits-grid">
        <article v-for="card in benefitCards" :key="card.title" class="benefit-card">
          <div class="benefit-title">{{ card.title }}</div>
          <ul>
            <li v-for="item in card.items" :key="item">{{ item }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section id="features" class="value reveal">
      <div class="section-head">
        <p class="kicker">{{ copy.value.kicker }}</p>
        <h2>{{ copy.value.title }}</h2>
        <p class="lead">{{ copy.value.lead }}</p>
      </div>
      <div class="value-grid">
        <article v-for="card in valueCards" :key="card.title" class="value-card">
          <div class="value-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path v-for="(path, idx) in card.iconPaths" :key="`${card.title}-${idx}`" :d="path" />
            </svg>
          </div>
          <h3>{{ card.title }}</h3>
          <p>{{ card.text }}</p>
        </article>
      </div>
    </section>

    <section id="how" class="workflow reveal">
      <div class="section-head">
        <p class="kicker">{{ copy.workflow.kicker }}</p>
        <h2>{{ copy.workflow.title }}</h2>
      </div>
      <div class="workflow-steps">
        <article v-for="step in workflowSteps" :key="step.number" class="step-card">
          <span class="step-num">{{ step.number }}</span>
          <h3>{{ step.title }}</h3>
          <p>{{ step.text }}</p>
        </article>
      </div>
    </section>

    <section id="pricing" class="pricing reveal">
      <div class="section-head">
        <p class="kicker">{{ copy.pricing.kicker }}</p>
        <h2>{{ copy.pricing.title }}</h2>
        <p class="lead">{{ copy.pricing.lead }}</p>
      </div>
      <div class="pricing-switch" role="tablist" :aria-label="copy.pricing.ariaLabel">
        <button type="button" class="pricing-switch-btn" :class="{ 'is-active': pricingMode === 'audit' }" @click="pricingMode = 'audit'">
          {{ copy.pricing.switchAudit }}
        </button>
        <button type="button" class="pricing-switch-btn" :class="{ 'is-active': pricingMode === 'monitoring' }" @click="pricingMode = 'monitoring'">
          {{ copy.pricing.switchMonitoring }}
        </button>
      </div>

      <h3 class="pricing-subhead">{{ pricingMode === 'audit' ? copy.pricing.subheadAudit : copy.pricing.subheadMonitoring }}</h3>

      <div v-if="pricingMode === 'audit'" class="pricing-grid pricing-grid--audit">
        <article v-for="plan in auditPlanCards" :key="plan.title" class="pricing-card" :class="{ featured: plan.featured }">
          <div v-if="plan.badge" class="pricing-badge">{{ plan.badge }}</div>
          <div class="pricing-header">
            <p class="pricing-title">{{ plan.title }}</p>
            <p class="pricing-price">{{ plan.price }}</p>
            <p class="pricing-subtitle">{{ plan.subtitle }}</p>
          </div>
          <ul class="pricing-list">
            <li v-for="feature in plan.features" :key="feature">{{ feature }}</li>
          </ul>
          <a v-if="plan.href" :href="plan.href" :class="plan.ctaClass">{{ plan.ctaLabel }}</a>
          <router-link v-else :to="plan.to" :class="plan.ctaClass">{{ plan.ctaLabel }}</router-link>
        </article>
      </div>

      <div v-else class="pricing-grid pricing-grid--monitoring">
        <article v-for="plan in monitoringPlanCards" :key="plan.title" class="pricing-card" :class="{ featured: plan.featured }">
          <div v-if="plan.badge" class="pricing-badge">{{ plan.badge }}</div>
          <div class="pricing-header">
            <p class="pricing-title">{{ plan.title }}</p>
            <p class="pricing-price">{{ plan.price }}</p>
            <p class="pricing-subtitle">{{ plan.subtitle }}</p>
          </div>
          <ul class="pricing-list">
            <li v-for="feature in plan.features" :key="feature">{{ feature }}</li>
          </ul>
          <a v-if="plan.href" :href="plan.href" :class="plan.ctaClass">{{ plan.ctaLabel }}</a>
          <router-link v-else :to="plan.to" :class="plan.ctaClass">{{ plan.ctaLabel }}</router-link>
        </article>
      </div>

      <div v-if="pricingMode === 'audit'" class="pricing-compare">
        <div class="compare-row compare-row--audit compare-head">
          <div v-for="(column, index) in copy.pricing.compareAudit.columns" :key="`audit-col-${index}`" class="compare-cell" :class="{ 'compare-col-featured': index === 3 }">{{ column }}</div>
        </div>
        <div v-for="(row, rowIndex) in copy.pricing.compareAudit.rows" :key="`audit-row-${rowIndex}`" class="compare-row compare-row--audit">
          <div v-for="(cell, cellIndex) in row" :key="`audit-cell-${rowIndex}-${cellIndex}`" class="compare-cell" :class="{ 'compare-col-featured': cellIndex === 3 }">
            <span v-if="cell === '✓'" class="compare-yes">{{ cell }}</span>
            <span v-else-if="cell === '—'" class="compare-no">{{ cell }}</span>
            <template v-else>{{ cell }}</template>
          </div>
        </div>
      </div>

      <div v-else class="pricing-compare">
        <div class="compare-row compare-row--three compare-head">
          <div v-for="(column, index) in copy.pricing.compareMonitoring.columns" :key="`monitoring-col-${index}`" class="compare-cell" :class="{ 'compare-col-featured': index === 2 }">{{ column }}</div>
        </div>
        <div v-for="(row, rowIndex) in copy.pricing.compareMonitoring.rows" :key="`monitoring-row-${rowIndex}`" class="compare-row compare-row--three">
          <div v-for="(cell, cellIndex) in row" :key="`monitoring-cell-${rowIndex}-${cellIndex}`" class="compare-cell" :class="{ 'compare-col-featured': cellIndex === 2 }">
            <span v-if="cell === '✓'" class="compare-yes">{{ cell }}</span>
            <span v-else-if="cell === '—'" class="compare-no">{{ cell }}</span>
            <template v-else>{{ cell }}</template>
          </div>
        </div>
      </div>

      <div v-if="pricingMode === 'audit'" class="pricing-compare-mobile">
        <article v-for="plan in auditCompareMobilePlans" :key="plan.name" class="compare-plan-card" :class="{ featured: plan.featured }">
          <div class="compare-plan-head">
            <p class="compare-plan-name">{{ plan.name }}</p>
            <p class="compare-plan-price">{{ plan.price }}</p>
          </div>
          <ul class="compare-plan-list">
            <li v-for="item in plan.items" :key="item">{{ item }}</li>
          </ul>
        </article>
      </div>

      <div v-else class="pricing-compare-mobile">
        <article v-for="plan in monitoringCompareMobilePlans" :key="plan.name" class="compare-plan-card" :class="{ featured: plan.featured }">
          <div class="compare-plan-head">
            <p class="compare-plan-name">{{ plan.name }}</p>
            <p class="compare-plan-price">{{ plan.price }}</p>
          </div>
          <ul class="compare-plan-list">
            <li v-for="item in plan.items" :key="item">{{ item }}</li>
          </ul>
        </article>
      </div>

      <div class="pricing-summary">
        <p>{{ copy.pricing.summary }}</p>
      </div>
    </section>

    <section class="compliance reveal">
      <div class="compliance-inner">
        <div>
          <p class="kicker">{{ copy.compliance.kicker }}</p>
          <h2>{{ copy.compliance.title }}</h2>
          <p class="lead">{{ copy.compliance.lead }}</p>
        </div>
        <div class="compliance-grid" aria-hidden="true">
          <div v-for="sector in complianceSectors" :key="sector" class="compliance-card">{{ sector }}</div>
        </div>
      </div>
    </section>

    <section id="faq" class="faq reveal">
      <div class="section-head">
        <p class="kicker">{{ copy.faq.kicker }}</p>
        <h2>{{ copy.faq.title }}</h2>
        <p class="lead">{{ copy.faq.lead }}</p>
      </div>
      <div class="faq-grid">
        <details v-for="item in copy.faq.items" :key="item.question" class="faq-item">
          <summary>{{ item.question }}</summary>
          <p>{{ item.answer }}</p>
        </details>
        <details class="faq-item">
          <summary>{{ copy.faq.legalLinksQuestion }}</summary>
          <p>
            <template v-for="link in copy.faq.legalLinks" :key="link.href">
              {{ link.label }}: <a :href="link.href">{{ link.source }}</a>.
            </template>
          </p>
        </details>
      </div>
    </section>

    <section class="cta reveal">
      <div class="cta-inner">
        <div>
          <h2>{{ copy.cta.title }}</h2>
          <p>{{ copy.cta.lead }}</p>
        </div>
        <router-link :to="startLink" class="btn btn-light">{{ copy.cta.button }}</router-link>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  padding: 1.5rem 0 4.5rem;
  display: grid;
  gap: 4rem;
}

.reveal {
  opacity: 0;
  transform: translateY(22px);
  transition:
    opacity var(--motion-slow) var(--ease-standard),
    transform var(--motion-slow) var(--ease-standard);
  will-change: opacity, transform;
}

.reveal.in-view {
  opacity: 1;
  transform: translateY(0);
}

.hero {
  position: relative;
  background: linear-gradient(135deg, #0f172a 0%, #111827 100%);
  color: #e5e7eb;
  border: 1px solid #0b1220;
  border-radius: var(--radius);
  padding: 3rem;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
}

.hero::before,
.hero::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  filter: blur(0px);
  opacity: 0.6;
  z-index: 0;
}

.hero::before {
  width: 420px;
  height: 420px;
  right: -140px;
  top: -120px;
  background: radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.45), transparent 70%);
}

.hero::after {
  width: 320px;
  height: 320px;
  left: -140px;
  bottom: -140px;
  background: radial-gradient(circle at 70% 70%, rgba(14, 165, 233, 0.35), transparent 70%);
}

.hero-inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 2.75rem;
  align-items: center;
}

.eyebrow {
  display: inline-block;
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 0.7rem;
}

.hero-copy h1 {
  font-size: clamp(2.2rem, 1.6rem + 2.2vw, 3.4rem);
  line-height: 1.1;
  margin-bottom: 1rem;
  color: #f8fafc;
}

.hero-copy p {
  font-size: 1.05rem;
  color: #cbd5f5;
  margin-bottom: 1.6rem;
  max-width: 38rem;
}

.hero-note {
  margin: 1rem 0 0;
  font-size: 0.9rem;
  color: #94a3b8;
}

.hero-actions {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.hero-actions .btn {
  border-radius: var(--radius);
  padding: 0.65rem 1.5rem;
  font-weight: 600;
}

.hero-actions .btn-primary {
  background: linear-gradient(135deg, #1d4ed8, #1e40af);
  border: none;
  box-shadow: 0 12px 24px rgba(30, 64, 175, 0.35);
}

.btn-ghost {
  border-color: rgba(226, 232, 240, 0.35);
  color: #e2e8f0;
}

.btn-ghost:hover {
  background: rgba(148, 163, 184, 0.18);
  color: #f8fafc;
}

.hero-meta {
  margin-top: 1.4rem;
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: #94a3b8;
}

.hero-meta span {
  border: 1px solid #1f2937;
  padding: 0.35rem 0.7rem;
  border-radius: var(--radius);
  background: rgba(15, 23, 42, 0.45);
}

.hero-proof {
  margin-top: 1.6rem;
  display: grid;
  gap: 0.9rem;
}

.proof-item {
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid #1f2937;
  border-radius: var(--radius);
  padding: 0.8rem 1rem;
  display: grid;
  gap: 0.25rem;
}

.proof-item strong {
  color: #f8fafc;
  font-size: 0.95rem;
}

.proof-item span {
  color: #94a3b8;
  font-size: 0.85rem;
}

.hero-visual {
  position: relative;
}

.hero-orbits {
  position: absolute;
  inset: -40px -40px auto auto;
  width: 320px;
  height: 320px;
  stroke: rgba(148, 163, 184, 0.25);
  stroke-width: 1.2;
  fill: none;
  opacity: 0.6;
}

.mockup {
  background: #0b1220;
  border-radius: var(--radius);
  border: 1px solid #1f2937;
  padding: 1.2rem 1.4rem 1.3rem;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.55);
  animation: floatCard 9s ease-in-out infinite;
}

.mockup-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.mockup-dots {
  display: flex;
  gap: 0.35rem;
}

.mockup-dots span {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: #334155;
}

.mockup-title {
  color: #e2e8f0;
  font-weight: 600;
}

.mockup-pill {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius);
  border: 1px solid #334155;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.8);
}

.mockup-score {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.8rem;
  align-items: center;
  margin-bottom: 1rem;
}

.score-circle {
  width: 56px;
  height: 56px;
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
  font-size: 0.85rem;
}

.mockup-bars {
  display: grid;
  gap: 0.7rem;
  margin-bottom: 1.1rem;
}

.bar {
  display: grid;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: #94a3b8;
}

.bar-track {
  height: 8px;
  background: #111827;
  border-radius: var(--radius);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: var(--radius);
}

.bar-fill.critical {
  width: 72%;
  background: linear-gradient(90deg, #ef4444, #b91c1c);
}

.bar-fill.moderate {
  width: 55%;
  background: linear-gradient(90deg, #f59e0b, #b45309);
}

.bar-fill.minor {
  width: 35%;
  background: linear-gradient(90deg, #38bdf8, #0284c7);
}

.mockup-list {
  display: grid;
  gap: 0.75rem;
}

.mockup-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.6rem;
  align-items: start;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid #1f2937;
  border-radius: var(--radius);
  padding: 0.6rem 0.7rem;
}

.mockup-item strong {
  color: #e2e8f0;
  font-size: 0.82rem;
}

.mockup-item span {
  color: #94a3b8;
  font-size: 0.75rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius);
  margin-top: 0.35rem;
}

.dot.critical {
  background: #ef4444;
}

.dot.moderate {
  background: #f59e0b;
}

.dot.minor {
  background: #38bdf8;
}

.floating-card {
  position: absolute;
  right: -12px;
  bottom: -24px;
  background: #ffffff;
  color: #0f172a;
  border-radius: var(--radius);
  padding: 0.9rem 1rem;
  width: 220px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
  border: 1px solid rgba(226, 232, 240, 0.7);
  animation: floatCard 8s ease-in-out infinite 0.8s;
}

.floating-title {
  font-weight: 700;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.floating-card ul {
  margin: 0;
  padding-left: 1rem;
  color: #475569;
  font-size: 0.8rem;
}

.section-head {
  display: grid;
  gap: 0.5rem;
}

.benefits {
  display: grid;
  gap: 2rem;
}

.benefits-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
}

.benefit-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.4rem;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.benefit-title {
  font-weight: 700;
  margin-bottom: 0.8rem;
  color: #0f172a;
}

.benefit-card ul {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--text-muted);
  display: grid;
  gap: 0.5rem;
}

.kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 700;
}

.section-head h2 {
  font-size: clamp(1.7rem, 1.2rem + 1.4vw, 2.4rem);
  margin: 0;
}

.lead {
  color: #64748b;
  font-size: 1.02rem;
}

.value {
  display: grid;
  gap: 2rem;
}

.value-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
}

.value-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.4rem;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 0.75rem;
  transition:
    transform var(--motion-base) var(--ease-standard),
    box-shadow var(--motion-base) var(--ease-standard);
}

.value-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.14);
}

.value-card h3 {
  margin: 0;
  font-size: 1.05rem;
}

.value-card p {
  color: var(--text-muted);
  margin: 0;
}

.value-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius);
  background: rgba(29, 78, 216, 0.1);
  display: grid;
  place-items: center;
}

.value-icon svg {
  width: 22px;
  height: 22px;
  stroke: #1d4ed8;
  stroke-width: 2;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.workflow {
  display: grid;
  gap: 2rem;
}

.workflow-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
}

.pricing {
  display: grid;
  gap: 2rem;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.5rem;
}

.pricing-grid--audit {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.pricing-grid--monitoring {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.pricing-switch {
  display: inline-flex;
  gap: 0.45rem;
  background: var(--surface-2);
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 999px;
  padding: 0.38rem;
  justify-self: center;
  margin: 0 auto;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.12);
}

.pricing-switch-btn {
  border: 0;
  background: transparent;
  color: #475569;
  font-weight: 700;
  font-size: 0.98rem;
  border-radius: 999px;
  padding: 0.58rem 1.2rem;
  min-width: 140px;
}

.pricing-switch-btn.is-active {
  background: #0f172a;
  color: #f8fafc;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.28);
}

.pricing-subhead {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
}

.pricing-summary {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 1rem 1.1rem;
  color: var(--text-muted);
}

.pricing-compare {
  margin-top: 1.8rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  overflow: hidden;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.compare-row {
  display: grid;
  grid-template-columns: 1.4fr repeat(4, minmax(0, 1fr));
  align-items: center;
  border-top: 1px solid var(--border);
}

.compare-row--audit {
  grid-template-columns: 1.4fr repeat(5, minmax(0, 1fr));
}

.compare-row--three {
  grid-template-columns: 1.4fr repeat(3, minmax(0, 1fr));
}

.compare-row:first-child {
  border-top: none;
}

.compare-cell {
  padding: 0.9rem 1rem;
  font-size: 0.92rem;
  color: var(--text-muted);
}

.compare-head .compare-cell {
  font-weight: 700;
  color: #0f172a;
  background: var(--surface-2);
}

.compare-row .compare-cell:not(:first-child) {
  text-align: center;
}

.compare-col-featured {
  background: rgba(29, 78, 216, 0.08);
}

.compare-yes {
  color: #16a34a;
  font-weight: 700;
  font-size: 1.05rem;
}

.compare-no {
  color: #94a3b8;
  font-weight: 600;
  font-size: 1rem;
}

.pricing-compare-mobile {
  display: none;
}

.compare-plan-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.4rem;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 0.9rem;
}

.compare-plan-card.featured {
  border-color: rgba(29, 78, 216, 0.6);
  box-shadow: 0 18px 40px rgba(29, 78, 216, 0.18);
}

.compare-plan-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}

.compare-plan-name {
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.compare-plan-price {
  margin: 0;
  color: #475569;
  font-size: 0.95rem;
  font-weight: 600;
}

.compare-plan-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.55rem;
  color: var(--text-muted);
  font-size: 0.92rem;
}

.compare-plan-list li {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem;
  align-items: start;
}

.compare-plan-list li::before {
  content: '?';
  color: #16a34a;
  font-weight: 700;
  line-height: 1.2;
}

.pricing-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.6rem;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 1.2rem;
  position: relative;
}

.pricing-card.featured {
  border-color: rgba(29, 78, 216, 0.6);
  box-shadow: 0 20px 44px rgba(29, 78, 216, 0.18);
}

.pricing-badge {
  position: absolute;
  top: -12px;
  right: 16px;
  background: #1d4ed8;
  color: #fff;
  padding: 0.3rem 0.7rem;
  font-size: 0.7rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
}

.pricing-header {
  display: grid;
  gap: 0.35rem;
}

.pricing-title {
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.pricing-price {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
}

.pricing-subtitle {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

.pricing-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
  color: var(--text-muted);
  font-size: 0.92rem;
}

.pricing-card .btn {
  justify-self: start;
  padding: 0.6rem 1.3rem;
  border-radius: var(--radius);
  font-weight: 600;
}

.btn-outline-dark {
  border: 1px solid #1f2937;
  color: #0f172a;
  background: transparent;
}

.btn-outline-dark:hover {
  background: #0f172a;
  color: #f8fafc;
}

[data-theme='dark'] .pricing-card .btn-outline-dark {
  border-color: #3b4f6e;
  color: #dbe7fb;
  background: rgba(2, 6, 23, 0.28);
}

[data-theme='dark'] .pricing-card .btn-outline-dark:hover {
  border-color: #5476a3;
  background: #17243a;
  color: #f8fafc;
}

[data-theme='dark'] .pricing-card .btn-primary {
  color: #f8fafc;
}

[data-theme='dark'] .pricing-subhead {
  color: #e2e8f0;
}

[data-theme='dark'] .pricing-switch {
  background: #0f1c31;
  border-color: #334862;
}

[data-theme='dark'] .pricing-switch-btn {
  color: #94a3b8;
}

[data-theme='dark'] .pricing-switch-btn.is-active {
  background: #1d4ed8;
  color: #f8fafc;
}

.step-card {
  background: #0f172a;
  color: #e2e8f0;
  border-radius: var(--radius);
  padding: 1.6rem;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.2);
  transition: transform var(--motion-base) var(--ease-standard);
}
.step-card h3 {
  color: inherit
}

.step-card:hover {
  transform: translateY(-6px);
}

.step-card p {
  color: #94a3b8;
}

.step-num {
  display: inline-block;
  font-weight: 700;
  color: #38bdf8;
  letter-spacing: 0.18em;
  margin-bottom: 0.6rem;
}

.compliance {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2.5rem;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
}

.compliance-inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr);
  gap: 2rem;
  align-items: center;
}

.compliance-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.compliance-card {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.75rem 0.9rem;
  text-align: center;
  font-size: 0.9rem;
  color: #475569;
  transition:
    transform var(--motion-base) var(--ease-standard),
    box-shadow var(--motion-base) var(--ease-standard);
}

.compliance-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
}

.faq {
  display: grid;
  gap: 2rem;
}

.faq-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.faq-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.1rem 1.2rem;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.faq-item summary {
  font-weight: 700;
  color: #0f172a;
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.faq-item summary::after {
  content: '';
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--border);
  display: inline-block;
  background:
    linear-gradient(#1d4ed8, #1d4ed8) center/12px 2px no-repeat,
    linear-gradient(#1d4ed8, #1d4ed8) center/2px 12px no-repeat;
  transition: transform var(--motion-fast) var(--ease-standard);
}

.faq-item[open] summary::after {
  background:
    linear-gradient(#1d4ed8, #1d4ed8) center/12px 2px no-repeat;
  transform: rotate(180deg);
}

.faq-item p {
  margin: 0.8rem 0 0;
  color: var(--text-muted);
  line-height: 1.6;
}

.cta {
  background: linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%);
  border-radius: var(--radius);
  padding: 2.5rem 2.8rem;
  color: #f8fafc;
  box-shadow: 0 20px 40px rgba(14, 116, 144, 0.3);
}

.cta-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.cta h2 {
  margin: 0 0 0.6rem;
  color: #f8fafc;
}

.cta p {
  margin: 0;
  color: rgba(248, 250, 252, 0.85);
}

.cta .btn-light {
  border-radius: var(--radius);
  padding: 0.7rem 1.6rem;
  font-weight: 700;
}

[data-theme='dark'] .hero-copy h1,
[data-theme='dark'] .cta h2 {
  color: #f8fafc;
}


@keyframes floatCard {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal,
  .mockup,
  .floating-card,
  .value-card,
  .step-card,
  .compliance-card {
    animation: none !important;
    transition: none !important;
  }

  .reveal {
    opacity: 1;
    transform: none;
  }
}

@media (max-width: 1100px) {
  .hero-inner {
    grid-template-columns: 1fr;
  }

  .hero {
    padding: 2.2rem;
  }

  .floating-card {
    position: static;
    margin-top: 1.5rem;
    width: 100%;
  }

  .hero-orbits {
    right: -60px;
    top: -40px;
  }
}

@media (max-width: 980px) {
  .benefits-grid,
  .value-grid,
  .workflow-steps,
  .pricing-grid,
  .compliance-inner,
  .faq-grid {
    grid-template-columns: 1fr;
  }

  .pricing-compare {
    display: none;
  }

  .pricing-compare-mobile {
    display: grid;
    gap: 1rem;
  }

  .compliance-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero {
    padding: 1.6rem;
  }

  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .cta {
    padding: 2rem 1.6rem;
  }
}
</style>




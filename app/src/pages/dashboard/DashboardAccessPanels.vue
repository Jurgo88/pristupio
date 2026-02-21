<template>
  <section v-if="showPreview" class="panel preview-banner">
    <p class="kicker">{{ copy.preview.kicker }}</p>
    <h2>{{ copy.preview.title }}</h2>
    <p class="lead">{{ copy.preview.lead }}</p>
  </section>

  <section v-if="paymentNotice" class="panel payment-banner">
    <p class="kicker">{{ copy.payment.kicker }}</p>
    <h2>{{ copy.payment.title }}</h2>
    <p class="lead">{{ copy.payment.lead }}</p>
    <div class="upgrade-actions">
      <button class="btn btn-outline" @click="$emit('refreshPlan')" :disabled="refreshPlanLoading">
        {{ refreshPlanLoading ? copy.payment.refreshLoading : copy.payment.refreshIdle }}
      </button>
    </div>
  </section>

  <section v-if="showUpgrade" class="panel upgrade-panel">
    <div>
      <p class="kicker">{{ copy.upgrade.kicker }}</p>
      <h2>{{ copy.upgrade.title }}</h2>
      <p class="lead">{{ copy.upgrade.lead }}</p>
    </div>
    <div class="upgrade-actions">
      <a v-if="auditCheckoutBasicUrl" :href="auditCheckoutBasicUrl" class="btn btn-primary">
        {{ copy.upgrade.basicCta }}
      </a>
      <a v-if="auditCheckoutProUrl" :href="auditCheckoutProUrl" class="btn btn-outline">
        {{ copy.upgrade.proCta }}
      </a>
      <button class="btn btn-outline" @click="$emit('refreshPlan')" :disabled="refreshPlanLoading">
        {{ refreshPlanLoading ? copy.payment.refreshLoading : copy.payment.refreshIdle }}
      </button>
    </div>
  </section>

  <section
    v-if="showPaidStatus"
    class="panel paid-banner"
    :class="{ 'is-empty-credit': paidCredits <= 0 }"
  >
    <div class="paid-banner__copy">
      <p class="kicker">{{ copy.paid.kicker }}</p>
      <h2 v-if="paidCredits <= 0">{{ copy.paid.titleNoCredits }}</h2>
      <h2 v-else>{{ copy.paid.titleWithCredits }}</h2>
      <p class="lead" v-if="paidCredits <= 0">{{ copy.paid.leadNoCredits }}</p>
      <p class="lead" v-else>{{ copy.paid.leadWithCredits }}</p>
    </div>

    <div class="paid-banner__meta">
      <div class="paid-banner__credits">
        <span>{{ copy.paid.creditsLabel }}</span>
        <strong>{{ paidCredits }}</strong>
      </div>
      <div class="paid-banner__actions">
        <a
          v-if="auditCheckoutBasicUrl"
          :href="auditCheckoutBasicUrl"
          class="btn btn-primary paid-banner__cta"
        >
          {{ copy.paid.addFiveCredits }}
        </a>
        <a v-if="auditCheckoutProUrl" :href="auditCheckoutProUrl" class="btn btn-outline paid-banner__cta">
          {{ copy.paid.addFifteenCredits }}
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { DASHBOARD_ACCESS_TEXT } from './dashboard.copy'

const copy = DASHBOARD_ACCESS_TEXT

defineProps<{
  showPreview: boolean
  paymentNotice: boolean
  refreshPlanLoading: boolean
  showUpgrade: boolean
  showPaidStatus: boolean
  paidCredits: number
  auditCheckoutBasicUrl: string
  auditCheckoutProUrl: string
}>()

defineEmits<{
  (event: 'refreshPlan'): void
}>()
</script>

<style scoped>
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.8rem;
  box-shadow: var(--shadow-sm);
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

.preview-banner {
  background: linear-gradient(135deg, rgba(30, 64, 175, 0.1), rgba(14, 165, 233, 0.08));
  border-color: rgba(37, 99, 235, 0.35);
}

.preview-banner h2 {
  margin: 0.2rem 0 0.6rem;
}

.payment-banner {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(34, 197, 94, 0.08));
  border-color: rgba(16, 185, 129, 0.4);
}

.paid-banner {
  background: linear-gradient(135deg, rgba(2, 132, 199, 0.12), rgba(14, 116, 144, 0.08));
  border-color: rgba(14, 116, 144, 0.35);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem 1rem;
  align-items: center;
  padding: 1.25rem 1.35rem;
}

.paid-banner.is-empty-credit {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(185, 28, 28, 0.1));
  border-color: rgba(180, 83, 9, 0.38);
}

.paid-banner__copy {
  min-width: 0;
}

.paid-banner h2 {
  margin: 0.15rem 0 0.45rem;
  font-size: clamp(1.15rem, 1rem + 0.55vw, 1.45rem);
}

.paid-banner .lead {
  font-size: 0.94rem;
  line-height: 1.4;
}

.paid-banner__meta {
  display: grid;
  gap: 0.55rem;
  justify-items: end;
  align-content: center;
}

.paid-banner__credits {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.34rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(14, 116, 144, 0.4);
  background: rgba(255, 255, 255, 0.82);
  color: #0f172a;
  font-size: 0.8rem;
  font-weight: 600;
}

.paid-banner__credits strong {
  color: #0c4a6e;
  font-size: 0.95rem;
  line-height: 1;
}

.paid-banner.is-empty-credit .paid-banner__credits {
  border-color: rgba(180, 83, 9, 0.42);
  background: rgba(255, 251, 235, 0.9);
}

.paid-banner.is-empty-credit .paid-banner__credits strong {
  color: #9a3412;
}

.paid-banner__actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.paid-banner__cta {
  padding: 0.5rem 0.95rem;
  box-shadow: 0 10px 18px rgba(29, 78, 216, 0.25);
  white-space: nowrap;
}

[data-theme='dark'] .paid-banner {
  background: linear-gradient(135deg, rgba(8, 47, 73, 0.55), rgba(14, 116, 144, 0.34));
  border-color: rgba(56, 189, 248, 0.38);
}

[data-theme='dark'] .paid-banner.is-empty-credit {
  background: linear-gradient(135deg, rgba(120, 53, 15, 0.54), rgba(127, 29, 29, 0.38));
  border-color: rgba(251, 191, 36, 0.42);
}

[data-theme='dark'] .paid-banner__credits {
  background: rgba(15, 23, 42, 0.88);
  border-color: rgba(148, 163, 184, 0.42);
  color: #cbd5e1;
}

[data-theme='dark'] .paid-banner__credits strong {
  color: #e2e8f0;
}

[data-theme='dark'] .paid-banner.is-empty-credit .paid-banner__credits {
  background: rgba(69, 26, 3, 0.55);
  border-color: rgba(251, 191, 36, 0.46);
}

[data-theme='dark'] .paid-banner.is-empty-credit .paid-banner__credits strong {
  color: #fde68a;
}

.upgrade-panel {
  display: grid;
  gap: 1.2rem;
}

.upgrade-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  align-items: center;
}

@media (max-width: 1100px) {
  .paid-banner {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .paid-banner__meta,
  .paid-banner__actions {
    justify-items: start;
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .panel {
    padding: 1.4rem;
  }

  .upgrade-actions,
  .paid-banner__actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .upgrade-actions .btn,
  .paid-banner__actions .btn {
    width: 100%;
  }
}
</style>

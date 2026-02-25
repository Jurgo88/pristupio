<template>
  <section
    v-if="panelVariant"
    class="panel access-context-panel"
    :class="[
      `access-context-panel--${panelVariant}`,
      { 'is-empty-credit': panelVariant === 'paid' && paidCredits <= 0 }
    ]"
  >
    <div class="access-context-panel__copy">
      <p class="kicker">{{ panelCopy.kicker }}</p>
      <h2>{{ panelCopy.title }}</h2>
      <p class="lead">{{ panelCopy.lead }}</p>
    </div>

    <div class="access-context-panel__meta">
      <div v-if="panelVariant === 'paid'" class="credits-pill">
        <span>{{ copy.paid.creditsLabel }}</span>
        <strong>{{ paidCredits }}</strong>
      </div>

      <div class="access-context-panel__actions">
        <a
          v-if="showPrimaryCheckout"
          :href="auditCheckoutBasicUrl"
          class="btn btn-primary"
        >
          {{ panelVariant === 'paid' ? copy.paid.addFiveCredits : copy.upgrade.basicCta }}
        </a>
        <a
          v-if="showSecondaryCheckout"
          :href="auditCheckoutProUrl"
          class="btn btn-outline"
        >
          {{ panelVariant === 'paid' ? copy.paid.addFifteenCredits : copy.upgrade.proCta }}
        </a>
        <button
          v-if="showRefreshAction"
          class="btn btn-outline"
          @click="$emit('refreshPlan')"
          :disabled="refreshPlanLoading"
        >
          {{ refreshPlanLoading ? copy.payment.refreshLoading : copy.payment.refreshIdle }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DASHBOARD_ACCESS_TEXT } from './dashboard.copy'

const copy = DASHBOARD_ACCESS_TEXT

const props = defineProps<{
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

type PanelVariant = 'payment' | 'upgrade' | 'paid' | 'preview' | null

const panelVariant = computed<PanelVariant>(() => {
  if (props.paymentNotice) return 'payment'
  if (props.showUpgrade) return 'upgrade'
  if (props.showPaidStatus) return 'paid'
  if (props.showPreview) return 'preview'
  return null
})

const panelCopy = computed(() => {
  if (panelVariant.value === 'payment') return copy.payment
  if (panelVariant.value === 'upgrade') return copy.upgrade
  if (panelVariant.value === 'paid') {
    return props.paidCredits <= 0
      ? { kicker: copy.paid.kicker, title: copy.paid.titleNoCredits, lead: copy.paid.leadNoCredits }
      : { kicker: copy.paid.kicker, title: copy.paid.titleWithCredits, lead: copy.paid.leadWithCredits }
  }
  return copy.preview
})

const showRefreshAction = computed(
  () => panelVariant.value === 'payment' || panelVariant.value === 'upgrade'
)
const showPrimaryCheckout = computed(
  () =>
    !!props.auditCheckoutBasicUrl &&
    (panelVariant.value === 'upgrade' || panelVariant.value === 'paid')
)
const showSecondaryCheckout = computed(
  () =>
    !!props.auditCheckoutProUrl &&
    (panelVariant.value === 'upgrade' || panelVariant.value === 'paid')
)
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

.access-context-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem 1rem;
  align-items: center;
  padding: 1.25rem 1.35rem;
}

.access-context-panel__copy {
  min-width: 0;
}

.access-context-panel h2 {
  margin: 0.15rem 0 0.45rem;
  font-size: clamp(1.15rem, 1rem + 0.55vw, 1.45rem);
}

.access-context-panel .lead {
  font-size: 0.94rem;
  line-height: 1.4;
}

.access-context-panel__meta {
  display: grid;
  gap: 0.55rem;
  justify-items: end;
  align-content: center;
}

.access-context-panel__actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.access-context-panel__actions .btn {
  white-space: nowrap;
}

.access-context-panel--preview {
  background: linear-gradient(135deg, rgba(30, 64, 175, 0.1), rgba(14, 165, 233, 0.08));
  border-color: rgba(37, 99, 235, 0.35);
}

.access-context-panel--payment {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(34, 197, 94, 0.08));
  border-color: rgba(16, 185, 129, 0.4);
}

.access-context-panel--upgrade {
  background: linear-gradient(135deg, rgba(30, 64, 175, 0.1), rgba(14, 165, 233, 0.08));
  border-color: rgba(37, 99, 235, 0.35);
}

.access-context-panel--paid {
  background: linear-gradient(135deg, rgba(2, 132, 199, 0.12), rgba(14, 116, 144, 0.08));
  border-color: rgba(14, 116, 144, 0.35);
}

.access-context-panel--paid.is-empty-credit {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(185, 28, 28, 0.1));
  border-color: rgba(180, 83, 9, 0.38);
}

.credits-pill {
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

.credits-pill strong {
  color: #0c4a6e;
  font-size: 0.95rem;
  line-height: 1;
}

.access-context-panel--paid.is-empty-credit .credits-pill {
  border-color: rgba(180, 83, 9, 0.42);
  background: rgba(255, 251, 235, 0.9);
}

.access-context-panel--paid.is-empty-credit .credits-pill strong {
  color: #9a3412;
}

[data-theme='dark'] .access-context-panel--paid {
  background: linear-gradient(135deg, rgba(8, 47, 73, 0.55), rgba(14, 116, 144, 0.34));
  border-color: rgba(56, 189, 248, 0.38);
}

[data-theme='dark'] .access-context-panel--paid.is-empty-credit {
  background: linear-gradient(135deg, rgba(120, 53, 15, 0.54), rgba(127, 29, 29, 0.38));
  border-color: rgba(251, 191, 36, 0.42);
}

[data-theme='dark'] .credits-pill {
  background: rgba(15, 23, 42, 0.88);
  border-color: rgba(148, 163, 184, 0.42);
  color: #cbd5e1;
}

[data-theme='dark'] .credits-pill strong {
  color: #e2e8f0;
}

[data-theme='dark'] .access-context-panel--paid.is-empty-credit .credits-pill {
  background: rgba(69, 26, 3, 0.55);
  border-color: rgba(251, 191, 36, 0.46);
}

[data-theme='dark'] .access-context-panel--paid.is-empty-credit .credits-pill strong {
  color: #fde68a;
}

@media (max-width: 1100px) {
  .access-context-panel {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .access-context-panel__meta,
  .access-context-panel__actions {
    justify-items: start;
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .panel {
    padding: 1.4rem;
  }

  .access-context-panel__actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .access-context-panel__actions .btn {
    width: 100%;
  }
}
</style>

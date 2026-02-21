<template>
  <section v-if="isLoggedIn" class="panel monitoring-panel">
    <div class="panel-head panel-head--tight">
      <div>
        <p class="kicker">{{ copy.kicker }}</p>
        <h2>{{ copy.title }}</h2>
      </div>
      <div class="monitoring-head-status">
        <span class="status-badge" :class="monitoringStatusBadgeClass">
          {{ monitoringStatusLabel }}
        </span>
        <span class="monitoring-head-usage">
          {{ isAdmin ? `${monitoringConfiguredCount} domén` : `${monitoringConfiguredCount}/${monitoringDomainsLimit} domén` }}
        </span>
      </div>
    </div>

    <div v-if="monitoringPanelState === 'loading'" class="status-state status-state--loading">
      {{ copy.loading }}
    </div>

    <template v-else-if="monitoringPanelState === 'active' || monitoringPanelState === 'empty'">
      <div class="monitoring-grid">
        <div class="monitoring-topline">
          <div class="monitoring-summary">
            <span class="monitoring-summary__label">{{ copy.summaryFrequency }}</span>
            <strong>{{ monitoringDefaultCadenceLabel }}</strong>
          </div>
          <div v-if="showInlineUpgrade" class="monitoring-buy-actions monitoring-buy-actions--inline">
            <a :href="monitoringCheckoutProUrl" class="btn btn-outline">
              {{ copy.upgradeToPro }}
            </a>
          </div>
        </div>

        <div v-if="monitoringPanelState === 'empty'" class="status-state">
          {{ copy.emptyWithAccess }}
        </div>

        <div v-else class="monitoring-targets">
          <article
            v-for="target in monitoringTargets"
            :key="target.id"
            class="monitoring-target-card"
            :class="{ 'is-inactive': !target.active }"
          >
            <div class="monitoring-target-card__main">
              <a
                :href="target.default_url"
                target="_blank"
                rel="noopener noreferrer"
                :title="target.default_url"
              >
                {{ target.default_url }}
              </a>
              <div class="monitoring-target-card__meta">
                <span class="pill">{{ target.active ? copy.targetStatusActive : copy.targetStatusPaused }}</span>
                <span>{{ copy.nextAudit }}: {{ formatDateTime(target.next_run_at) || '--' }}</span>
                <span>{{ copy.lastAudit }}: {{ formatDateTime(target.last_run_at) || '--' }}</span>
              </div>
              <div class="monitoring-target-card__diff" v-if="monitoringDiffLabel(target.id)">
                <span :class="monitoringDiffClass(target.id)">{{ monitoringDiffLabel(target.id) }}</span>
              </div>
            </div>
            <div class="monitoring-target-card__actions">
              <button
                class="btn btn-sm btn-outline"
                @click="emit('remove-target', target.id)"
                :disabled="monitoringLoadingAction"
              >
                {{ monitoringLoadingAction ? copy.removeLoading : copy.removeTarget }}
              </button>
            </div>
          </article>
        </div>
      </div>

    </template>

    <div v-else class="monitoring-empty">
      <p v-if="monitoringPanelState === 'upsell'" class="status-state">
        {{ copy.upsellNotice }}
      </p>
      <p v-else class="status-state">
        {{ copy.blockedNotice }}
      </p>
      <div v-if="monitoringPanelState === 'upsell'" class="monitoring-buy-actions">
        <a v-if="monitoringCheckoutBasicUrl" :href="monitoringCheckoutBasicUrl" class="btn btn-primary">
          {{ copy.basicCta }}
        </a>
        <a v-if="monitoringCheckoutProUrl" :href="monitoringCheckoutProUrl" class="btn btn-outline">
          {{ copy.proCta }}
        </a>
        <button v-if="!hasMonitoringCheckoutOptions" class="btn btn-outline" disabled>
          {{ copy.missingCheckout }}
        </button>
      </div>
    </div>

    <p v-if="showMonitoringAlerts && monitoringMessage" class="status-alert status-alert--success">
      {{ monitoringMessage }}
    </p>
    <p v-if="showMonitoringAlerts && monitoringWorseningNotice" class="status-alert status-alert--warning">
      {{ monitoringWorseningNotice }}
    </p>
    <p v-if="showMonitoringAlerts && (monitoringError || monitoringStoreError)" class="status-alert status-alert--danger">
      {{ monitoringError || monitoringStoreError }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DASHBOARD_MONITORING_TEXT } from './dashboard.copy'

type MonitoringTargetItem = {
  id: string
  default_url: string
  active: boolean
  next_run_at?: string | null
  last_run_at?: string | null
}

type FormatDateTimeFn = (value?: string | null) => string
type MonitoringDiffFn = (targetId: string) => string
type MonitoringPanelState = 'loading' | 'upsell' | 'blocked' | 'empty' | 'active'

const copy = DASHBOARD_MONITORING_TEXT

const props = defineProps<{
  isLoggedIn: boolean
  isAdmin: boolean
  monitoringIsActive: boolean
  monitoringConfiguredCount: number
  monitoringDomainsLimit: number
  monitoringLoadingStatus: boolean
  monitoringHasAccess: boolean
  canBuyMonitoring: boolean
  monitoringTier: string
  monitoringDefaultCadenceLabel: string
  monitoringTargets: MonitoringTargetItem[]
  monitoringCheckoutBasicUrl: string
  monitoringCheckoutProUrl: string
  monitoringLoadingAction: boolean
  monitoringMessage: string
  monitoringWorseningNotice: string
  monitoringError: string
  monitoringStoreError: string | null
  formatDateTime: FormatDateTimeFn
  monitoringDiffLabel: MonitoringDiffFn
  monitoringDiffClass: MonitoringDiffFn
}>()

const monitoringPanelState = computed<MonitoringPanelState>(() => {
  if (props.monitoringLoadingStatus) return 'loading'
  if (!props.monitoringHasAccess) return props.canBuyMonitoring ? 'upsell' : 'blocked'
  if (props.monitoringTargets.length === 0) return 'empty'
  return 'active'
})

const monitoringStatusBadgeClass = computed(() => {
  if (monitoringPanelState.value === 'loading') return 'status-badge--info'
  if (monitoringPanelState.value === 'upsell') return 'status-badge--warning'
  if (monitoringPanelState.value === 'blocked') return 'status-badge--info'
  return props.monitoringIsActive ? 'status-badge--success' : 'status-badge--warning'
})

const monitoringStatusLabel = computed(() => {
  if (monitoringPanelState.value === 'loading') return copy.badgeLoading
  if (monitoringPanelState.value === 'upsell') return copy.badgeUpsell
  if (monitoringPanelState.value === 'blocked') return copy.badgeBlocked
  return props.monitoringIsActive ? copy.badgeActive : copy.badgePaused
})

const hasMonitoringCheckoutOptions = computed(
  () => !!props.monitoringCheckoutBasicUrl || !!props.monitoringCheckoutProUrl
)

const showInlineUpgrade = computed(
  () => props.monitoringHasAccess && props.monitoringTier === 'basic' && !!props.monitoringCheckoutProUrl
)

const showMonitoringAlerts = computed(() => monitoringPanelState.value !== 'loading')

const emit = defineEmits<{
  (event: 'remove-target', targetId: string): void
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

.monitoring-panel {
  display: grid;
  gap: 0.75rem;
}

.kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 700;
  margin: 0 0 0.4rem;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.4rem;
}

.panel-head--tight {
  margin-bottom: 1rem;
}

.panel-head h2 {
  margin: 0.2rem 0 0;
  font-size: clamp(1.4rem, 1.1rem + 1vw, 2rem);
}

.monitoring-head-status {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.monitoring-head-usage {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 600;
}

.monitoring-grid {
  display: grid;
  gap: 0.6rem;
}

.monitoring-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.monitoring-summary {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  min-width: 0;
}

.monitoring-summary__label {
  color: #64748b;
  font-size: 0.82rem;
  white-space: nowrap;
}

.monitoring-summary strong {
  color: #0f172a;
  font-size: 0.88rem;
  line-height: 1.25;
  word-break: break-word;
}

.monitoring-targets {
  display: grid;
  gap: 0.7rem;
}

.monitoring-target-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.7rem 1rem;
  border: 1px solid var(--border);
  background: var(--surface-2);
  border-radius: var(--radius);
  padding: 0.75rem 0.85rem;
}

.monitoring-target-card.is-inactive {
  opacity: 0.9;
}

.monitoring-target-card__main {
  min-width: 0;
  display: grid;
  gap: 0.4rem;
}

.monitoring-target-card__main a {
  color: #0f172a;
  font-size: 0.9rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.monitoring-target-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.7rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.monitoring-target-card__meta .pill {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.52rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #ffffff;
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.monitoring-target-card__diff {
  font-size: 0.8rem;
  color: #334155;
}

.diff-pill {
  display: inline-flex;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 600;
}

.diff-pill--worsening {
  background: rgba(220, 38, 38, 0.12);
  color: #991b1b;
  border-color: rgba(220, 38, 38, 0.25);
}

.diff-pill--improving {
  background: rgba(22, 163, 74, 0.12);
  color: #166534;
  border-color: rgba(22, 163, 74, 0.24);
}

.diff-pill--neutral {
  background: rgba(71, 85, 105, 0.1);
  color: #334155;
  border-color: rgba(100, 116, 139, 0.3);
}

.status-alert--warning {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(217, 119, 6, 0.38);
  color: #92400e;
}

.monitoring-target-card__actions {
  display: grid;
  gap: 0.45rem;
  width: 128px;
}

.monitoring-empty {
  display: grid;
  gap: 0.7rem;
}

.monitoring-buy-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.monitoring-buy-actions--inline {
  justify-content: flex-end;
  margin-left: auto;
}

[data-theme='dark'] .monitoring-target-card {
  background: #13233c;
  border-color: #2b3d5a;
}

[data-theme='dark'] .monitoring-target-card__main a,
[data-theme='dark'] .monitoring-summary strong {
  color: #dbe7fb;
}

[data-theme='dark'] .monitoring-target-card__meta {
  color: #a7b6cb;
}

[data-theme='dark'] .monitoring-target-card__meta .pill {
  background: #0f1c31;
  border-color: #334862;
  color: #bfdbfe;
}

[data-theme='dark'] .monitoring-target-card__diff {
  color: #cbd5e1;
}

[data-theme='dark'] .diff-pill--worsening {
  background: rgba(220, 38, 38, 0.2);
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.4);
}

[data-theme='dark'] .diff-pill--improving {
  background: rgba(22, 163, 74, 0.22);
  color: #bbf7d0;
  border-color: rgba(74, 222, 128, 0.35);
}

[data-theme='dark'] .diff-pill--neutral {
  background: rgba(51, 65, 85, 0.45);
  color: #e2e8f0;
  border-color: rgba(148, 163, 184, 0.36);
}

[data-theme='dark'] .status-alert--warning {
  background: rgba(245, 158, 11, 0.2);
  border-color: rgba(251, 191, 36, 0.45);
  color: #fde68a;
}

@media (max-width: 1100px) {
  .monitoring-target-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 980px) {
  .monitoring-target-card__actions {
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .monitoring-topline {
    align-items: stretch;
    flex-direction: column;
  }

  .monitoring-buy-actions--inline {
    margin-left: 0;
    justify-content: flex-start;
    width: 100%;
  }
}

@media (max-width: 720px) {
  .panel-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.8rem;
  }

  .monitoring-head-status {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 520px) {
  .monitoring-buy-actions {
    width: 100%;
    flex-direction: column;
  }

  .monitoring-buy-actions .btn {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .panel {
    padding: 1.4rem;
  }
}
</style>

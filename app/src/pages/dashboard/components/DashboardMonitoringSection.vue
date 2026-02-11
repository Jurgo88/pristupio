<script setup lang="ts">
import type { MonitoringTarget, MonitoringTrendPoint } from '@/stores/monitoring.store'

const props = defineProps<{
  canManage: boolean
  monitoringLoading: boolean
  monitoringTrendsLoading: boolean
  monitoringSaving: boolean
  monitoringError: string
  monitoringUrl: string
  monitoringFrequency: number
  canSaveMonitoring: boolean
  monitoringTargets: MonitoringTarget[]
  monitoringTrends: Record<string, MonitoringTrendPoint[]>
  formatDate: (value?: string | null) => string
}>()

const emit = defineEmits<{
  (e: 'update:monitoring-url', value: string): void
  (e: 'update:monitoring-frequency', value: number): void
  (e: 'save-target'): void
  (e: 'reload-targets'): void
  (e: 'toggle-target', payload: { targetId: string; active: boolean }): void
}>()

const onMonitoringUrlInput = (event: Event) => {
  const element = event.target as HTMLInputElement
  emit('update:monitoring-url', element.value)
}

const onMonitoringFrequencyInput = (event: Event) => {
  const element = event.target as HTMLSelectElement
  const parsed = Number(element.value)
  emit('update:monitoring-frequency', Number.isFinite(parsed) ? parsed : 14)
}

const statusLabel = (target: MonitoringTarget) => {
  if (target.latest_run?.status === 'success') return 'Posledny beh uspesny'
  if (target.latest_run?.status === 'failed') return 'Posledny beh zlyhal'
  if (target.last_status === 'disabled') return 'Vypnute (plan)'
  if (!target.active) return 'Pozastavene'
  return 'Caka na prvy beh'
}

const scoreLabel = (target: MonitoringTarget) => {
  if (target.latest_run?.score == null) return 'Skore: -'
  return `Skore: ${target.latest_run.score}`
}

const totalLabel = (target: MonitoringTarget) => {
  const total = target.latest_run?.summary?.total
  if (typeof total !== 'number') return 'Nalezy: -'
  return `Nalezy: ${total}`
}

const trendPoints = (targetId: string) => props.monitoringTrends?.[targetId] || []

const scoreTrendLabel = (targetId: string) => {
  const points = trendPoints(targetId)
  if (points.length < 2) return 'Trend skore: n/a'
  const first = points[0]?.score
  const last = points[points.length - 1]?.score
  if (typeof first !== 'number' || typeof last !== 'number') return 'Trend skore: n/a'
  const diff = last - first
  if (diff > 0) return `Trend skore: +${diff}`
  if (diff < 0) return `Trend skore: ${diff}`
  return 'Trend skore: bez zmeny'
}

const sparklinePath = (targetId: string) => {
  const width = 180
  const height = 54
  const points = trendPoints(targetId)
    .map((item) => item?.score)
    .filter((score): score is number => typeof score === 'number')

  if (points.length === 0) return ''
  if (points.length === 1) return `M 0 ${height - (points[0] / 100) * height} L ${width} ${height - (points[0] / 100) * height}`

  const step = width / (points.length - 1)
  return points
    .map((score, index) => {
      const x = Number((index * step).toFixed(2))
      const y = Number((height - (score / 100) * height).toFixed(2))
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
}
</script>

<template>
  <section class="panel monitoring-panel">
    <div class="panel-head panel-head--tight">
      <div>
        <p class="kicker">Monitoring</p>
        <h2>Pravidelny monitoring webu</h2>
        <p class="lead">Zapni periodicky scan a sleduj, ci sa stav webu zlepsuje alebo zhorsuje.</p>
      </div>
      <button class="btn btn-sm btn-filter-clear" @click="emit('reload-targets')" :disabled="monitoringLoading">
        {{ monitoringLoading ? 'Nacitavam...' : 'Obnovit' }}
      </button>
    </div>

    <div class="form-grid">
      <div class="field">
        <label class="field-label" for="monitoring-url">URL pre monitoring</label>
        <div class="input-row">
          <input
            id="monitoring-url"
            class="field-control"
            type="url"
            :value="monitoringUrl"
            :disabled="!canManage || monitoringSaving"
            placeholder="https://priklad.sk"
            @input="onMonitoringUrlInput"
            @keyup.enter="emit('save-target')"
          />
          <select
            class="field-control field-control--select"
            :value="monitoringFrequency"
            :disabled="!canManage || monitoringSaving"
            @change="onMonitoringFrequencyInput"
          >
            <option :value="7">Kazdych 7 dni</option>
            <option :value="14">Kazdych 14 dni</option>
            <option :value="30">Kazdych 30 dni</option>
          </select>
          <button class="btn btn-primary" :disabled="!canSaveMonitoring" @click="emit('save-target')">
            {{ monitoringSaving ? 'Ukladam...' : 'Zapnut monitoring' }}
          </button>
        </div>
        <p class="field-hint" v-if="!canManage">Monitoring je dostupny v platenom plane.</p>
      </div>

      <div v-if="monitoringError" class="form-error">{{ monitoringError }}</div>

      <div v-if="monitoringLoading || monitoringTrendsLoading" class="empty-state">Nacitavam monitoring...</div>
      <div v-else-if="monitoringTargets.length === 0" class="empty-state">
        Zatial nemate nastavene ziadne URL pre monitoring.
      </div>

      <div v-else class="targets-list">
        <article v-for="target in monitoringTargets" :key="target.id" class="target-card">
          <div class="target-meta">
            <strong>{{ target.url }}</strong>
            <div class="target-sub">
              <span>{{ statusLabel(target) }}</span>
              <span>{{ scoreLabel(target) }}</span>
              <span>{{ totalLabel(target) }}</span>
            </div>
            <div class="target-sub">
              <span>Frekvencia: {{ target.frequency_days }} dni</span>
              <span>Dalsi beh: {{ formatDate(target.next_run_at || undefined) || '-' }}</span>
            </div>
            <div class="target-sub target-sub--trend">
              <span>{{ scoreTrendLabel(target.id) }}</span>
            </div>
            <div class="sparkline-wrap" v-if="trendPoints(target.id).length > 0">
              <svg viewBox="0 0 180 54" preserveAspectRatio="none" role="img" aria-label="Trend skore">
                <path class="sparkline-track" d="M 0 53 L 180 53" />
                <path class="sparkline-line" :d="sparklinePath(target.id)" />
              </svg>
            </div>
            <div v-if="target.last_error" class="target-error">{{ target.last_error }}</div>
          </div>

          <button
            class="btn btn-sm btn-outline"
            :disabled="monitoringSaving"
            @click="emit('toggle-target', { targetId: target.id, active: !target.active })"
          >
            {{ target.active ? 'Pozastavit' : 'Znovu zapnut' }}
          </button>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.8rem;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
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

.form-grid {
  display: grid;
  gap: 1.2rem;
}

.field {
  display: grid;
  gap: 0.6rem;
}

.field-label {
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 700;
}

.field-control {
  width: 100%;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  padding: 0.65rem 0.8rem;
  font-size: 0.95rem;
  background: #ffffff;
  color: #0f172a;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field-control:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.field-control--select {
  max-width: 170px;
}

.input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 0.75rem;
  align-items: center;
}

.field-hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.targets-list {
  display: grid;
  gap: 0.9rem;
}

.target-card {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 0.9rem 1.1rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface-2);
}

.target-meta strong {
  display: block;
  color: #0f172a;
  word-break: break-word;
}

.target-sub {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  align-items: center;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 0.35rem;
}

.target-sub--trend {
  margin-top: 0.45rem;
}

.target-error {
  margin-top: 0.35rem;
  font-size: 0.83rem;
  color: #991b1b;
}

.sparkline-wrap {
  margin-top: 0.45rem;
  width: 180px;
  height: 54px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  padding: 4px;
}

.sparkline-wrap svg {
  width: 100%;
  height: 100%;
  display: block;
}

.sparkline-track {
  fill: none;
  stroke: #dbe3ef;
  stroke-width: 1;
}

.sparkline-line {
  fill: none;
  stroke: #2563eb;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.btn {
  border-radius: var(--radius);
  font-weight: 600;
  padding: 0.65rem 1.5rem;
}

.btn-sm {
  padding: 0.45rem 0.9rem;
  font-size: 0.8rem;
}

.btn-primary {
  background: linear-gradient(135deg, var(--brand), #1e40af);
  border: none;
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(29, 78, 216, 0.3);
}

.btn-outline {
  border: 1px solid var(--border);
  background: transparent;
  color: #0f172a;
}

.btn-filter-clear {
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: #0f172a;
  box-shadow: none;
  height: 44px;
}

.form-error {
  padding: 0.75rem 0.9rem;
  border-radius: var(--radius);
  border: 1px solid rgba(185, 28, 28, 0.25);
  background: rgba(185, 28, 28, 0.08);
  color: #7f1d1d;
  font-size: 0.9rem;
}

.empty-state {
  padding: 1rem 0;
  text-align: center;
  color: var(--text-muted);
}

@media (max-width: 980px) {
  .target-card {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 760px) {
  .input-row {
    grid-template-columns: 1fr;
  }

  .field-control--select {
    max-width: none;
  }
}
</style>

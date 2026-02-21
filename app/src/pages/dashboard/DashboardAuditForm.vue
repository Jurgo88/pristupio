<template>
  <section class="panel audit-form">
    <div class="panel-head">
      <div>
        <p class="kicker">{{ copy.kicker }}</p>
        <h2>{{ copy.title }}</h2>
        <p class="lead">{{ copy.lead }}</p>
      </div>
    </div>

    <div class="audit-flow">
      <article class="flow-step" :class="{ 'is-ready': hasTargetUrl }">
        <div class="flow-step__head">
          <span class="flow-index">1</span>
          <div>
            <label class="field-label" for="audit-url">{{ copy.stepTargetLabel }}</label>
            <p class="flow-copy">{{ copy.stepTargetCopy }}</p>
          </div>
        </div>

        <input
          id="audit-url"
          :value="targetUrl"
          type="url"
          class="field-control"
          :placeholder="copy.targetPlaceholder"
          :disabled="auditLocked"
          @input="onTargetUrlInput"
          @keyup.enter="$emit('startAudit')"
        />

        <p class="field-hint">{{ copy.targetHint }}</p>
      </article>

      <article class="flow-step" :class="{ 'is-ready': !!selectedProfile }">
        <div class="flow-step__head">
          <span class="flow-index">2</span>
          <div>
            <label class="field-label">{{ copy.stepProfileLabel }}</label>
            <p class="flow-copy">{{ copy.stepProfileCopy }}</p>
          </div>
        </div>

        <div class="profile-toggle">
          <label
            v-for="option in profileOptions"
            :key="option.value"
            class="profile-option"
            :class="{ 'is-selected': selectedProfile === option.value }"
          >
            <input
              type="radio"
              name="profile"
              :value="option.value"
              :checked="selectedProfile === option.value"
              :disabled="auditLocked"
              @change="onProfileChange(option.value)"
            />
            <span>
              <strong>{{ option.title }}</strong>
              <span class="sub">{{ option.subtitle }}</span>
            </span>
          </label>
        </div>
      </article>

      <article class="flow-step flow-step--cta" :class="{ 'is-ready': canRunAudit }">
        <div class="flow-step__head">
          <span class="flow-index">3</span>
          <div>
            <label class="field-label">{{ copy.stepRunLabel }}</label>
            <p class="flow-copy">{{ copy.stepRunCopy }}</p>
          </div>
        </div>

        <button class="btn btn-primary flow-cta" @click="$emit('startAudit')" :disabled="!canRunAudit">
          <span v-if="loading" class="spinner-border spinner-border-sm"></span>
          {{ loading ? copy.runLoading : copy.runIdle }}
        </button>

        <p class="field-hint">{{ copy.runHint }}</p>
      </article>
    </div>

    <div v-if="progressVisible" class="audit-progress">
      <div class="audit-progress__head">
        <span>{{ progressLabel }}</span>
        <strong>{{ Math.round(progress) }}%</strong>
      </div>
      <div
        class="audit-progress__track"
        role="progressbar"
        :aria-valuenow="Math.round(progress)"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="audit-progress__fill" :style="{ width: progress + '%' }"></div>
      </div>
    </div>

    <div v-if="errorMessage" class="status-alert status-alert--danger">{{ errorMessage }}</div>
    <div v-if="auditLockedMessage" class="status-alert status-alert--warning">{{ auditLockedMessage }}</div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { ProfileOption } from './dashboard.types'
import { DASHBOARD_AUDIT_FORM_TEXT } from './dashboard.copy'

const copy = DASHBOARD_AUDIT_FORM_TEXT

const props = defineProps<{
  targetUrl: string
  selectedProfile: 'wad' | 'eaa'
  profileOptions: ProfileOption[]
  canRunAudit: boolean
  auditLocked: boolean
  auditLockedMessage: string
  loading: boolean
  errorMessage: string
}>()

const emit = defineEmits<{
  (event: 'update:targetUrl', value: string): void
  (event: 'update:selectedProfile', value: 'wad' | 'eaa'): void
  (event: 'startAudit'): void
}>()

const progress = ref(0)
const progressVisible = ref(false)
const hasTargetUrl = computed(() => props.targetUrl.trim().length > 0)
let progressTimer: ReturnType<typeof setInterval> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

const clearTimers = () => {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

const startProgress = () => {
  clearTimers()
  progressVisible.value = true
  progress.value = Math.max(progress.value, 6)

  progressTimer = setInterval(() => {
    if (progress.value >= 92) return
    const remaining = 92 - progress.value
    const step = Math.max(0.5, remaining * 0.08)
    progress.value = Math.min(92, Number((progress.value + step).toFixed(1)))
  }, 450)
}

const finishProgress = () => {
  clearTimers()
  if (!progressVisible.value) return
  progress.value = 100
  hideTimer = setTimeout(() => {
    progressVisible.value = false
    progress.value = 0
    hideTimer = null
  }, 500)
}

const progressLabel = computed(() => {
  if (progress.value < 20) return copy.progressInit
  if (progress.value < 55) return copy.progressLoadingPage
  if (progress.value < 85) return copy.progressRules
  if (progress.value < 100) return copy.progressSaving
  return copy.progressDone
})

watch(
  () => props.loading,
  (loading) => {
    if (loading) startProgress()
    else finishProgress()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  clearTimers()
})

const onTargetUrlInput = (event: Event) => {
  const next = (event.target as HTMLInputElement | null)?.value || ''
  emit('update:targetUrl', next)
}

const onProfileChange = (value: 'wad' | 'eaa') => {
  emit('update:selectedProfile', value)
}
</script>

<style scoped>
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.audit-form {
  padding: 1.35rem 1.4rem;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.panel-head h2 {
  margin: 0.2rem 0 0;
  font-size: clamp(1.25rem, 1.05rem + 0.8vw, 1.68rem);
}

.kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.68rem;
  color: #64748b;
  font-weight: 700;
  margin: 0 0 0.4rem;
}

.lead {
  color: var(--text-muted);
  font-size: 0.92rem;
  line-height: 1.35;
  margin: 0;
}

.audit-flow {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.flow-step {
  display: grid;
  gap: 0.75rem;
  align-content: start;
  min-width: 0;
  padding: 0.9rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: var(--shadow-sm);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.flow-step:hover {
  transform: translateY(-1px);
}

.flow-step.is-ready {
  border-color: rgba(37, 99, 235, 0.48);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.11), var(--shadow-sm);
}

.flow-step__head {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: 0.62rem;
}

.flow-index {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.78rem;
  font-weight: 700;
  color: #0f172a;
  background: linear-gradient(135deg, #bfdbfe, #93c5fd);
  border: 1px solid rgba(37, 99, 235, 0.35);
}

.flow-copy {
  margin: 0.22rem 0 0;
  font-size: 0.79rem;
  color: var(--text-muted);
  line-height: 1.35;
}

.field-label {
  font-size: 0.74rem;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: #334155;
  font-weight: 700;
}

.field-control {
  width: 100%;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  padding: 0.68rem 0.8rem;
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

.field-hint {
  margin: 0;
  font-size: 0.79rem;
  color: var(--text-muted);
  line-height: 1.35;
}

.flow-step--cta {
  background: linear-gradient(180deg, rgba(219, 234, 254, 0.55), #ffffff 65%);
}

.flow-cta {
  width: 100%;
}

.profile-toggle {
  display: grid;
  gap: 0.55rem;
}

.profile-option {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.55rem;
  align-items: center;
  padding: 0.64rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.profile-option input {
  margin-top: 0;
  accent-color: #2563eb;
}

.profile-option strong {
  display: block;
  font-size: 0.88rem;
  line-height: 1.2;
}

.profile-option .sub {
  display: block;
  margin-top: 0.1rem;
  font-size: 0.75rem;
  line-height: 1.25;
  color: var(--text-muted);
}

.profile-option.is-selected {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.audit-progress {
  margin-top: 0.9rem;
  display: grid;
  gap: 0.3rem;
}

.audit-progress__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: #475569;
}

.audit-progress__track {
  width: 100%;
  height: 8px;
  border-radius: var(--radius-pill);
  overflow: hidden;
  background: #e2e8f0;
  border: 1px solid #cbd5e1;
}

.audit-progress__fill {
  height: 100%;
  border-radius: var(--radius-pill);
  background: linear-gradient(90deg, #2563eb, #0ea5e9);
  transition: width var(--motion-base) var(--ease-standard);
}

.status-alert {
  margin-top: 0.8rem;
}

@media (max-width: 1180px) {
  .audit-flow {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .panel {
    padding: 1.4rem;
  }
}
</style>

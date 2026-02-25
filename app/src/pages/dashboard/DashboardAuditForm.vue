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
          :disabled="auditLocked || loading"
          @input="onTargetUrlInput"
          @keyup.enter="onEnterKey"
        />

        <div class="mode-toggle">
          <label class="mode-option" :class="{ 'is-selected': auditMode === 'single' }">
            <input
              type="radio"
              name="audit-mode"
              value="single"
              :checked="auditMode === 'single'"
              :disabled="loading"
              @change="onAuditModeChange('single')"
            />
            <span>{{ copy.modeSingle }}</span>
          </label>
          <label class="mode-option" :class="{ 'is-selected': auditMode === 'site' }">
            <input
              type="radio"
              name="audit-mode"
              value="site"
              :checked="auditMode === 'site'"
              :disabled="loading"
              @change="onAuditModeChange('site')"
            />
            <span>{{ copy.modeSite }}</span>
          </label>
        </div>

        <p class="field-hint">{{ auditMode === 'site' ? copy.modeHintSite : copy.modeHintSingle }}</p>
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
          {{ loading ? loadingLabel : idleLabel }}
        </button>
        <button
          v-if="canCancelSiteAudit"
          type="button"
          class="btn btn-outline-secondary flow-cancel"
          @click="$emit('cancelSiteAudit')"
        >
          {{ copy.cancelSiteAudit }}
        </button>

        <p class="field-hint">{{ auditMode === 'site' ? copy.runHintSite : copy.runHint }}</p>
      </article>
    </div>

    <div v-if="progressVisible" class="audit-progress">
      <div class="audit-progress__head">
        <span>{{ progressLabel }}</span>
        <strong>{{ Math.round(effectiveProgress) }}%</strong>
      </div>
      <div
        class="audit-progress__track"
        role="progressbar"
        :aria-valuenow="Math.round(effectiveProgress)"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="audit-progress__fill" :style="{ width: effectiveProgress + '%' }"></div>
      </div>
      <p v-if="siteProgressLine" class="audit-progress__meta">{{ siteProgressLine }}</p>
      <p v-if="siteCurrentLine" class="audit-progress__meta">{{ siteCurrentLine }}</p>
      <p v-if="siteEtaLine" class="audit-progress__meta">{{ siteEtaLine }}</p>
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
  auditMode: 'single' | 'site'
  selectedProfile: 'wad' | 'eaa'
  profileOptions: ProfileOption[]
  canRunAudit: boolean
  auditLocked: boolean
  auditLockedMessage: string
  loading: boolean
  canCancelSiteAudit: boolean
  siteAuditJob?: {
    status?: string
    progress?: number
    pagesScanned?: number
    pagesQueued?: number
    pagesLimit?: number
    pagesFailed?: number
    currentUrl?: string | null
    currentDepth?: number | null
    startedAt?: string | null
  } | null
  errorMessage: string
}>()

const emit = defineEmits<{
  (event: 'update:targetUrl', value: string): void
  (event: 'update:auditMode', value: 'single' | 'site'): void
  (event: 'update:selectedProfile', value: 'wad' | 'eaa'): void
  (event: 'startAudit'): void
  (event: 'cancelSiteAudit'): void
}>()

const progress = ref(0)
const progressVisible = ref(false)
const hasTargetUrl = computed(() => props.targetUrl.trim().length > 0)
const sitePagesScanned = computed(() => Math.max(0, Number(props.siteAuditJob?.pagesScanned || 0)))
const sitePagesFailed = computed(() => Math.max(0, Number(props.siteAuditJob?.pagesFailed || 0)))
const sitePagesQueued = computed(() => Math.max(0, Number(props.siteAuditJob?.pagesQueued || 0)))
const sitePagesProcessed = computed(() => sitePagesScanned.value + sitePagesFailed.value)
const sitePagesDiscovered = computed(() => sitePagesProcessed.value + sitePagesQueued.value)
const sitePagesLimit = computed(() => Math.max(0, Number(props.siteAuditJob?.pagesLimit || 0)))
const siteProgress = computed(() => {
  const value = Number(props.siteAuditJob?.progress || 0)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
})
const effectiveProgress = computed(() => {
  if (props.auditMode === 'site' && props.siteAuditJob) {
    if (sitePagesProcessed.value > 0) return siteProgress.value
    return Math.max(3, progress.value)
  }
  return progress.value
})
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
  if (props.auditMode === 'site' && props.siteAuditJob) {
    if (props.siteAuditJob.status === 'queued') return copy.progressQueued
    if (props.siteAuditJob.status === 'running') {
      return copy.progressCrawling(sitePagesDiscovered.value || undefined)
    }
    if (props.siteAuditJob.status === 'completed') return copy.progressDone
  }

  if (progress.value < 20) return copy.progressInit
  if (progress.value < 55) return copy.progressLoadingPage
  if (progress.value < 85) return copy.progressRules
  if (progress.value < 100) return copy.progressSaving
  return copy.progressDone
})

const idleLabel = computed(() => (props.auditMode === 'site' ? copy.runIdleSite : copy.runIdle))
const loadingLabel = computed(() => (props.auditMode === 'site' ? copy.runLoadingSite : copy.runLoading))
const siteCurrentLine = computed(() => {
  if (props.auditMode !== 'site' || !props.siteAuditJob) return ''
  if (props.siteAuditJob.status !== 'running') return ''

  const raw = typeof props.siteAuditJob.currentUrl === 'string' ? props.siteAuditJob.currentUrl.trim() : ''
  if (!raw) return ''

  let display = raw
  try {
    const parsed = new URL(raw)
    const pathWithQuery = `${parsed.pathname || '/'}${parsed.search || ''}`
    display = `${parsed.host}${pathWithQuery}`
  } catch {
    // use raw value
  }

  if (display.length > 110) {
    display = `${display.slice(0, 107)}...`
  }

  const depth =
    Number.isFinite(Number(props.siteAuditJob.currentDepth)) && Number(props.siteAuditJob.currentDepth) >= 0
      ? Number(props.siteAuditJob.currentDepth)
      : null

  return depth === null ? `${copy.progressCurrent}: ${display}` : `${copy.progressCurrent}: ${display} (depth ${depth})`
})
const siteEtaLine = computed(() => {
  if (props.auditMode !== 'site' || !props.siteAuditJob) return ''
  if (props.siteAuditJob.status !== 'running') return ''

  const startedAtRaw = typeof props.siteAuditJob.startedAt === 'string' ? props.siteAuditJob.startedAt : ''
  const startedAtMs = startedAtRaw ? new Date(startedAtRaw).getTime() : NaN
  if (!Number.isFinite(startedAtMs) || startedAtMs <= 0) {
    return `${copy.progressEta}: ${copy.progressEtaUnknown}`
  }

  const elapsedMs = Date.now() - startedAtMs
  if (elapsedMs < 15_000 || sitePagesProcessed.value <= 0) {
    return `${copy.progressEta}: ${copy.progressEtaUnknown}`
  }

  const avgMsPerPage = elapsedMs / sitePagesProcessed.value
  if (!Number.isFinite(avgMsPerPage) || avgMsPerPage <= 0) {
    return `${copy.progressEta}: ${copy.progressEtaUnknown}`
  }

  let remainingPages = sitePagesQueued.value
  if (remainingPages <= 0 && sitePagesLimit.value > 0) {
    remainingPages = Math.max(0, sitePagesLimit.value - sitePagesProcessed.value)
  }
  if (remainingPages <= 0) return ''

  const etaMs = remainingPages * avgMsPerPage
  const etaMinutes = Math.round(etaMs / 60_000)
  if (etaMinutes <= 0) {
    return `${copy.progressEta}: ${copy.progressEtaSoon}`
  }
  if (etaMinutes < 60) {
    return `${copy.progressEta}: ~${etaMinutes} min`
  }

  const hours = Math.floor(etaMinutes / 60)
  const minutes = etaMinutes % 60
  if (minutes <= 0) {
    return `${copy.progressEta}: ~${hours} h`
  }
  return `${copy.progressEta}: ~${hours} h ${minutes} min`
})

const siteProgressLine = computed(() => {
  if (props.auditMode !== 'site' || !props.siteAuditJob) return ''

  const details: string[] = []
  if (sitePagesDiscovered.value > 0) {
    details.push(`${copy.progressDiscovered}: ${sitePagesDiscovered.value}`)
  }
  details.push(`${copy.progressProcessed}: ${sitePagesProcessed.value}`)
  if (sitePagesQueued.value > 0 || props.siteAuditJob.status === 'queued' || props.siteAuditJob.status === 'running') {
    details.push(`${copy.progressInQueue}: ${sitePagesQueued.value}`)
  }
  if (sitePagesLimit.value > 0) {
    details.push(`${copy.progressLimit}: ${sitePagesLimit.value}`)
  }
  details.push(`${copy.progressFailed}: ${sitePagesFailed.value}`)

  return details.join(' | ')
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

const onAuditModeChange = (value: 'single' | 'site') => {
  emit('update:auditMode', value)
}

const onEnterKey = () => {
  if (!props.canRunAudit || props.loading) return
  emit('startAudit')
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

.mode-toggle {
  display: grid;
  gap: 0.45rem;
}

.mode-option {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem;
  align-items: center;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.mode-option input {
  margin-top: 0;
  accent-color: #2563eb;
}

.mode-option span {
  font-size: 0.84rem;
  line-height: 1.25;
}

.mode-option.is-selected {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.flow-step--cta {
  background: linear-gradient(180deg, rgba(219, 234, 254, 0.55), #ffffff 65%);
}

.flow-cta {
  width: 100%;
}

.flow-cancel {
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

.audit-progress__meta {
  margin: 0;
  font-size: 0.75rem;
  color: #64748b;
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

<template>
  <section class="panel audit-form">
    <div class="panel-head">
      <div>
        <p class="kicker">Spustenie auditu</p>
        <h2>Spustiť nový WCAG audit</h2>
        <p class="lead">
          Vyhodnotíme váš web podľa WCAG 2.1 AA a pripravíme prioritizovaný zoznam problémov.
        </p>
      </div>
    </div>

    <div class="form-grid">
      <div class="field">
        <label class="field-label" for="audit-url">Webstránka na analýzu</label>
        <div class="input-row">
          <input
            id="audit-url"
            :value="targetUrl"
            type="url"
            class="field-control"
            placeholder="https://priklad.sk"
            :disabled="auditLocked"
            @input="onTargetUrlInput"
            @keyup.enter="$emit('startAudit')"
          />
          <button class="btn btn-primary" @click="$emit('startAudit')" :disabled="!canRunAudit">
            <span v-if="loading" class="spinner-border spinner-border-sm"></span>
            {{ loading ? 'Auditujem...' : 'Analyzovať web' }}
          </button>
        </div>
        <p class="field-hint">Vhodné pre weby, aplikácie a digitálne služby.</p>
      </div>

      <div class="field">
        <label class="field-label">Profil legislatívy</label>
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
      </div>

      <div v-if="errorMessage" class="form-error">{{ errorMessage }}</div>
      <div v-if="auditLockedMessage" class="form-error">{{ auditLockedMessage }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ProfileOption } from './dashboard.types'

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

const onTargetUrlInput = (event: Event) => {
  const next = (event.target as HTMLInputElement | null)?.value || ''
  emit('update:targetUrl', next)
}

const onProfileChange = (value: 'wad' | 'eaa') => {
  emit('update:selectedProfile', value)
}
</script>

<style scoped>
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.4rem;
}

.panel-head h2 {
  margin: 0.2rem 0 0;
  font-size: clamp(1.4rem, 1.1rem + 1vw, 2rem);
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

.form-grid {
  display: grid;
  gap: 1.5rem;
}

.input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
}

.field-hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.form-error {
  padding: 0.75rem 0.9rem;
  border-radius: var(--radius);
  border: 1px solid rgba(185, 28, 28, 0.25);
  background: rgba(185, 28, 28, 0.08);
  color: #7f1d1d;
  font-size: 0.9rem;
}

.profile-toggle {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.profile-option {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  align-items: start;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.profile-option input {
  margin-top: 0.25rem;
  accent-color: #2563eb;
}

.profile-option .sub {
  display: block;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.profile-option.is-selected {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

@media (max-width: 640px) {
  .input-row {
    grid-template-columns: 1fr;
  }
}
</style>

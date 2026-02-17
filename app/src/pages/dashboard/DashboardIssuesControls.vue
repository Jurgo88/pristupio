<template>
  <div>
    <div class="panel-head panel-head--tight">
      <div>
        <p class="kicker">{{ DASHBOARD_ISSUES_TEXT.kicker }}</p>
        <h2>{{ DASHBOARD_ISSUES_TEXT.title }}</h2>
      </div>
      <button class="btn btn-sm btn-export" :disabled="!hasReport || isExporting || isPreview" @click="$emit('exportPdf')">
        <span v-if="isExporting" class="spinner-border spinner-border-sm"></span>
        {{ isExporting ? DASHBOARD_ISSUES_TEXT.exportLoading : DASHBOARD_ISSUES_TEXT.exportIdle }}
      </button>
    </div>

    <div class="filters">
      <div class="field">
        <label class="field-label">{{ DASHBOARD_ISSUES_TEXT.principleLabel }}</label>
        <select :value="selectedPrinciple" class="field-control" :disabled="!hasReport || isPreview" @change="onPrincipleChange">
          <option value="">{{ DASHBOARD_ISSUES_TEXT.allOption }}</option>
          <option v-for="p in principleOptions" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label">{{ DASHBOARD_ISSUES_TEXT.impactLabel }}</label>
        <select :value="selectedImpact" class="field-control" :disabled="!hasReport || isPreview" @change="onImpactChange">
          <option value="">{{ DASHBOARD_ISSUES_TEXT.allOption }}</option>
          <option v-for="option in IMPACT_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
      <div class="field">
        <label class="field-label">{{ DASHBOARD_ISSUES_TEXT.searchLabel }}</label>
        <input
          :value="searchText"
          class="field-control"
          type="text"
          :placeholder="DASHBOARD_ISSUES_TEXT.searchPlaceholder"
          :disabled="!hasReport || isPreview"
          @input="onSearchInput"
        />
      </div>
      <div class="field field--actions">
        <button class="btn btn-sm btn-filter-clear" @click="$emit('clearFilters')" :disabled="!hasReport || isPreview">
          {{ DASHBOARD_ISSUES_TEXT.clearFilters }}
        </button>
      </div>
    </div>

    <div v-if="exportError" class="form-error">{{ exportError }}</div>
  </div>
</template>

<script setup lang="ts">
import { DASHBOARD_ISSUES_TEXT, IMPACT_OPTIONS } from './dashboard.constants'

defineProps<{
  hasReport: boolean
  isPreview: boolean
  isExporting: boolean
  selectedPrinciple: string
  selectedImpact: string
  searchText: string
  principleOptions: string[]
  exportError: string
}>()

const emit = defineEmits<{
  (event: 'update:selectedPrinciple', value: string): void
  (event: 'update:selectedImpact', value: string): void
  (event: 'update:searchText', value: string): void
  (event: 'clearFilters'): void
  (event: 'exportPdf'): void
}>()

const onPrincipleChange = (event: Event) => {
  emit('update:selectedPrinciple', (event.target as HTMLSelectElement | null)?.value || '')
}

const onImpactChange = (event: Event) => {
  emit('update:selectedImpact', (event.target as HTMLSelectElement | null)?.value || '')
}

const onSearchInput = (event: Event) => {
  emit('update:searchText', (event.target as HTMLInputElement | null)?.value || '')
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

.panel-head--tight {
  margin-bottom: 1rem;
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

.field--actions {
  align-self: end;
}

.field--actions .btn {
  width: 100%;
}

.filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.2rem;
  align-items: end;
}

.btn-filter-clear {
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: #0f172a;
  box-shadow: none;
  height: 44px;
}

.btn-filter-clear:hover {
  background: #e2e8f0;
}

.btn-export {
  background: linear-gradient(135deg, var(--brand), #1e40af);
  border: none;
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(29, 78, 216, 0.3);
  height: 44px;
}

.btn-export:hover {
  filter: brightness(1.05);
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(29, 78, 216, 0.35);
}

.btn-filter-clear:disabled,
.btn-export:disabled {
  opacity: 0.6;
  box-shadow: none;
}

.form-error {
  padding: 0.75rem 0.9rem;
  border-radius: var(--radius);
  border: 1px solid rgba(185, 28, 28, 0.25);
  background: rgba(185, 28, 28, 0.08);
  color: #7f1d1d;
  font-size: 0.9rem;
}

[data-theme='dark'] .btn-filter-clear {
  background: #101b2e;
  border-color: #3b4f6e;
  color: #dbe7fb;
}

[data-theme='dark'] .btn-filter-clear:hover {
  background: #17243a;
  border-color: #5476a3;
}

[data-theme='dark'] .btn-export {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.34);
}

[data-theme='dark'] .kicker {
  color: #93c5fd;
}

[data-theme='dark'] .panel-head h2 {
  color: #e2e8f0;
}

[data-theme='dark'] .form-error {
  border-color: rgba(248, 113, 113, 0.52);
  background: linear-gradient(140deg, rgba(127, 29, 29, 0.36), rgba(69, 10, 10, 0.3));
  color: #fecaca;
}

@media (max-width: 980px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <div class="issues-controls">
    <div class="panel-head">
      <div class="panel-head__titles">
        <p class="kicker">{{ DASHBOARD_ISSUES_TEXT.kicker }}</p>
        <h2>{{ DASHBOARD_ISSUES_TEXT.title }}</h2>
      </div>
      
      <button 
        class="btn btn-export" 
        :disabled="!hasReport || isExporting || isPreview" 
        @click="$emit('exportPdf')"
      >
        <span v-if="isExporting" class="spinner-loader"></span>
        {{ isExporting ? DASHBOARD_ISSUES_TEXT.exportLoading : DASHBOARD_ISSUES_TEXT.exportIdle }}
      </button>
    </div>

    <Transition name="slide-fade">
      <div v-if="isExporting || exportProgress > 0" class="export-status" role="status">
        <div class="export-status__info">
          <span>{{ exportStatus || DASHBOARD_ISSUES_TEXT.exportGenerating }}</span>
          <strong>{{ Math.round(exportProgress) }}%</strong>
        </div>
        <div class="export-status__track">
          <div class="export-status__fill" :style="{ width: `${Math.max(4, exportProgress)}%` }"></div>
        </div>
      </div>
    </Transition>

    <div class="quick-filters">
      <span class="quick-filters__label">{{ DASHBOARD_ISSUES_TEXT.quickFiltersLabel }}</span>
      <div class="quick-filters__list">
        <button
          v-for="chip in quickFilterOptions"
          :key="chip.value"
          type="button"
          class="quick-filter-chip"
          :class="{ 'is-active': selectedImpact === chip.value }"
          :disabled="!hasReport || isPreview"
          @click="$emit('update:selectedImpact', chip.value)"
        >
          {{ chip.label }}
          <span v-if="chip.count !== undefined" class="chip-count">({{ chip.count }})</span>
        </button>
      </div>
    </div>

    <div class="filter-grid">
      <div class="field">
        <label class="field-label">{{ DASHBOARD_ISSUES_TEXT.principleLabel }}</label>
        <select 
          :value="selectedPrinciple" 
          class="field-control" 
          :disabled="!hasReport || isPreview"
          @change="emitUpdate('selectedPrinciple', $event)"
        >
          <option value="">{{ DASHBOARD_ISSUES_TEXT.allOption }}</option>
          <option v-for="p in principleOptions" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>

      <div class="field">
        <label class="field-label">{{ DASHBOARD_ISSUES_TEXT.impactLabel }}</label>
        <select 
          :value="selectedImpact" 
          class="field-control" 
          :disabled="!hasReport || isPreview"
          @change="emitUpdate('selectedImpact', $event)"
        >
          <option value="">{{ DASHBOARD_ISSUES_TEXT.allOption }}</option>
          <option v-for="opt in IMPACT_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <div class="field field--search">
        <label class="field-label">{{ DASHBOARD_ISSUES_TEXT.searchLabel }}</label>
        <input
          :value="searchText"
          class="field-control"
          type="text"
          :placeholder="DASHBOARD_ISSUES_TEXT.searchPlaceholder"
          :disabled="!hasReport || isPreview"
          @input="emitUpdate('searchText', $event)"
        />
      </div>

      <div class="filter-actions">
        <button 
          class="btn btn-filter-clear" 
          :disabled="!hasReport || isPreview"
          @click="$emit('clearFilters')"
        >
          {{ DASHBOARD_ISSUES_TEXT.clearFilters }}
        </button>
        
        <div class="button-group">
          <button 
            class="btn btn-outline-sm" 
            :disabled="!canExpandDetails" 
            @click="$emit('expandDetails')"
            title="Rozbaliť všetko"
          >
            {{ DASHBOARD_ISSUES_TEXT.expandDetails }}
          </button>
          <button 
            class="btn btn-outline-sm" 
            :disabled="!canCollapseDetails" 
            @click="$emit('collapseDetails')"
            title="Zbaliť všetko"
          >
            {{ DASHBOARD_ISSUES_TEXT.collapseDetails }}
          </button>
        </div>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="exportError" class="status-alert status-alert--danger">
        {{ exportError }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DASHBOARD_ISSUES_TEXT, IMPACT_OPTIONS } from './dashboard.copy'

const props = defineProps<{
  hasReport: boolean
  isPreview: boolean
  isExporting: boolean
  exportProgress: number
  exportStatus: string
  selectedPrinciple: string
  selectedImpact: string
  searchText: string
  principleOptions: string[]
  exportError: string
  totalIssuesCount: number
  highCount: number
  canExpandDetails: boolean
  canCollapseDetails: boolean
}>()

const emit = defineEmits<{
  (e: 'update:selectedPrinciple', val: string): void
  (e: 'update:selectedImpact', val: string): void
  (e: 'update:searchText', val: string): void
  (e: 'clearFilters'): void
  (e: 'expandDetails'): void
  (e: 'collapseDetails'): void
  (e: 'exportPdf'): void
}>()

// Helper pre čistejší template
const emitUpdate = (key: 'selectedPrinciple' | 'selectedImpact' | 'searchText', event: Event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement
  emit(`update:${key}` as any, target.value)
}

// Dynamické dáta pre čipy (Quick Filters)
const quickFilterOptions = computed(() => [
  { label: DASHBOARD_ISSUES_TEXT.quickFilterAll, value: '', count: props.totalIssuesCount },
  { label: DASHBOARD_ISSUES_TEXT.quickFilterHigh, value: 'high', count: props.highCount },
  { label: DASHBOARD_ISSUES_TEXT.quickFilterCritical, value: 'critical' },
  { label: DASHBOARD_ISSUES_TEXT.quickFilterSerious, value: 'serious' },
  { label: DASHBOARD_ISSUES_TEXT.quickFilterModerate, value: 'moderate' },
  { label: DASHBOARD_ISSUES_TEXT.quickFilterMinor, value: 'minor' },
])
</script>

<style scoped>
.issues-controls {
  --primary: #2563eb;
  --primary-dark: #1e40af;
  --border-color: var(--border, #e2e8f0);
}

/* Panel Header */
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 700;
  margin: 0 0 0.4rem;
}

.panel-head h2 {
  margin: 0;
  font-size: clamp(1.4rem, 1.1rem + 1vw, 2rem);
  /* font-weight: 800; */
}

/* Export Button & Progress */
.btn-export {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  transition: all 0.2s;
  box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
}

.btn-export:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.1);
}

.spinner-loader {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 10px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.export-status {
  background: var(--surface-2, #f8fafc);
  border: 1px solid var(--border-color);
  padding: 1rem;
  border-radius: 1rem;
  margin-bottom: 1.5rem;
}

.export-status__info {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.export-status__track {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.export-status__fill {
  height: 100%;
  background: var(--primary);
  transition: width 0.4s ease;
}

/* Quick Filters */
.quick-filters {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.quick-filters__label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  white-space: nowrap;
}

.quick-filters__list {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.quick-filter-chip {
  padding: 0.4rem 0.8rem;
  border-radius: 2rem;
  border: 1px solid var(--border-color);
  background: white;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-filter-chip:hover:not(:disabled) {
  background: #f1f5f9;
}

.quick-filter-chip.is-active {
  background: rgba(37, 99, 235, 0.1);
  border-color: var(--primary);
  color: var(--primary-dark);
}

.chip-count {
  opacity: 0.6;
  font-weight: 400;
  margin-left: 2px;
}

/* Filter Grid */
.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.5fr auto;
  gap: 1.25rem;
  align-items: flex-end;
  background: var(--surface, #fff);
  padding: 1.25rem;
  border: 1px solid var(--border-color);
  border-radius: 1rem;
}

.field { display: flex; flex-direction: column; gap: 0.5rem; }
.field-label { font-size: 0.75rem; font-weight: 700; color: #475569; }
.field-control {
  height: 42px;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
  padding: 0 0.75rem;
  font-size: 0.9rem;
}

.filter-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.btn-filter-clear {
  height: 42px;
  padding: 0 1rem;
  background: #f1f5f9;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.button-group {
  display: flex;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  overflow: hidden;
}

.button-group .btn {
  height: 40px;
  border: none;
  background: white;
  padding: 0 0.75rem;
  font-size: 0.8rem;
  border-right: 1px solid var(--border-color);
}

.button-group .btn:last-child { border-right: none; }
.button-group .btn:hover:not(:disabled) { background: #f8fafc; }

/* Transitions */
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s ease-out; }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateY(-10px); opacity: 0; }

/* Dark Mode Overrides */
[data-theme='dark'] .filter-grid { background: #111827; border-color: #334155; }
[data-theme='dark'] .field-control { background: #1e293b; color: white; border-color: #334155; }
[data-theme='dark'] .quick-filter-chip { background: #1e293b; color: #cbd5e1; border-color: #334155; }
[data-theme='dark'] .btn-filter-clear { background: #1e293b; color: #cbd5e1; border-color: #334155; }
[data-theme='dark'] .button-group .btn { background: #1e293b; color: #cbd5e1; }

@media (max-width: 1024px) {
  .filter-grid { grid-template-columns: 1fr 1fr; }
  .field--search, .filter-actions { grid-column: span 2; }
}
</style>
<template>
  <div>
    <div class="panel-head panel-head--tight">
      <div>
        <p class="kicker">Nálezy</p>
        <h2>Nájdené problémy (WCAG 2.1)</h2>
      </div>
      <button class="btn btn-sm btn-export" :disabled="!hasReport || isExporting || isPreview" @click="$emit('exportPdf')">
        <span v-if="isExporting" class="spinner-border spinner-border-sm"></span>
        {{ isExporting ? 'Exportujem...' : 'Export PDF' }}
      </button>
    </div>

    <div class="filters">
      <div class="field">
        <label class="field-label">Princíp</label>
        <select :value="selectedPrinciple" class="field-control" :disabled="!hasReport || isPreview" @change="onPrincipleChange">
          <option value="">Všetky</option>
          <option v-for="p in principleOptions" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label">Závažnosť</label>
        <select :value="selectedImpact" class="field-control" :disabled="!hasReport || isPreview" @change="onImpactChange">
          <option value="">Všetky</option>
          <option value="critical">Critical</option>
          <option value="serious">Serious</option>
          <option value="moderate">Moderate</option>
          <option value="minor">Minor</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label">Hľadať</label>
        <input
          :value="searchText"
          class="field-control"
          type="text"
          placeholder="Napr. kontrast, tlačidlo, aria"
          :disabled="!hasReport || isPreview"
          @input="onSearchInput"
        />
      </div>
      <div class="field field--actions">
        <button class="btn btn-sm btn-filter-clear" @click="$emit('clearFilters')" :disabled="!hasReport || isPreview">
          Zrušiť filtre
        </button>
      </div>
    </div>

    <div v-if="currentExportError" class="form-error">{{ currentExportError }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  hasReport: boolean
  isPreview: boolean
  isExporting: boolean
  selectedPrinciple: string
  selectedImpact: string
  searchText: string
  principleOptions: string[]
  currentExportError: string
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

@media (max-width: 980px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>

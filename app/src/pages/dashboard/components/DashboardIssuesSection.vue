<script setup lang="ts">
type IssueNode = {
  target: string[]
  html?: string
  failureSummary?: string
}

type Issue = {
  id?: string
  impact: string
  title?: string
  description?: string
  recommendation?: string
  wcag?: string
  wcagLevel?: string
  principle?: string
  nodesCount?: number
  nodes?: IssueNode[]
}

defineProps<{
  hasReport: boolean
  isPreview: boolean
  exporting: boolean
  exportError: string
  selectedPrinciple: string
  selectedImpact: string
  searchText: string
  principleOptions: string[]
  filteredIssues: Issue[]
  impactClass: (impact: string) => string
  violationKey: (violation: Issue, index: number) => string
  isOpen: (key: string) => boolean
  formatTarget: (target: string[]) => string
  describeTarget: (target: string[]) => string
}>()

const emit = defineEmits<{
  (e: 'export-pdf'): void
  (e: 'clear-filters'): void
  (e: 'toggle-details', key: string): void
  (e: 'update:selected-principle', value: string): void
  (e: 'update:selected-impact', value: string): void
  (e: 'update:search-text', value: string): void
}>()

const onSelectedPrincipleInput = (event: Event) => {
  const element = event.target as HTMLSelectElement
  emit('update:selected-principle', element.value)
}

const onSelectedImpactInput = (event: Event) => {
  const element = event.target as HTMLSelectElement
  emit('update:selected-impact', element.value)
}

const onSearchTextInput = (event: Event) => {
  const element = event.target as HTMLInputElement
  emit('update:search-text', element.value)
}
</script>

<template>
  <section class="panel issues-panel">
    <div class="panel-head panel-head--tight">
      <div>
        <p class="kicker">Nálezy</p>
        <h2>Nájdené problémy (WCAG 2.1)</h2>
      </div>
      <button class="btn btn-sm btn-export" :disabled="!hasReport || exporting || isPreview" @click="emit('export-pdf')">
        <span v-if="exporting" class="spinner-border spinner-border-sm"></span>
        {{ exporting ? 'Exportujem...' : 'Export PDF' }}
      </button>
    </div>

    <div class="filters">
      <div class="field">
        <label class="field-label">Princíp</label>
        <select :value="selectedPrinciple" @input="onSelectedPrincipleInput" class="field-control" :disabled="!hasReport || isPreview">
          <option value="">Všetky</option>
          <option v-for="p in principleOptions" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label">Závažnosť</label>
        <select :value="selectedImpact" @input="onSelectedImpactInput" class="field-control" :disabled="!hasReport || isPreview">
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
          @input="onSearchTextInput"
          class="field-control"
          type="text"
          placeholder="Napr. kontrast, tlačidlo, aria"
          :disabled="!hasReport || isPreview"
        />
      </div>
      <div class="field field--actions">
        <button class="btn btn-sm btn-filter-clear" @click="emit('clear-filters')" :disabled="!hasReport || isPreview">
          Zrušiť filtre
        </button>
      </div>
    </div>

    <div v-if="exportError" class="form-error">{{ exportError }}</div>

    <div v-if="!hasReport" class="empty-state empty-state--hint">
      Spustite audit, aby sa zobrazili nálezy a detailné odporúčania.
    </div>

    <div v-else-if="filteredIssues.length === 0" class="empty-state">
      Žiadne chyby pre vybrané filtre.
    </div>

    <div v-else class="issue-list">
      <article v-for="(violation, index) in filteredIssues" :key="index" class="issue-card" :class="impactClass(violation.impact)">
        <div class="issue-header">
          <div class="impact-pill" :class="impactClass(violation.impact)">
            {{ violation.impact }}
          </div>
          <h6 class="issue-title">{{ violation.title }}</h6>
          <button
            v-if="!isPreview"
            class="btn btn-outline btn-sm"
            @click="emit('toggle-details', violationKey(violation, index))"
          >
            {{ isOpen(violationKey(violation, index)) ? 'Skryť detail' : 'Zobraziť detail' }}
          </button>
        </div>
        <p class="issue-desc">{{ violation.description }}</p>
        <div class="issue-meta">
          <strong>WCAG:</strong> {{ violation.wcag || 'Neurčené' }} |
          <strong>Úroveň:</strong> {{ violation.wcagLevel || 'Neurčené' }} |
          <strong>Princíp:</strong> {{ violation.principle || 'Neurčené' }}
        </div>
        <div v-if="!isPreview" class="issue-meta">
          <strong>Odporúčanie:</strong>
          {{
            violation.recommendation ||
            'Skontrolujte problém manuálne a upravte HTML tak, aby spĺňalo WCAG.'
          }}
        </div>
        <small class="issue-count">Zasiahnutých elementov: {{ violation.nodesCount ?? 0 }}</small>

        <div v-if="!isPreview && isOpen(violationKey(violation, index))" class="issue-details">
          <div v-if="violation.nodesCount === 0" class="empty-inline">Nenašli sa konkrétne prvky.</div>
          <div v-for="(node, nIndex) in violation.nodes?.slice(0, 3) || []" :key="nIndex" class="node-detail">
            <div>{{ describeTarget(node.target) }}</div>
            <div class="node-code">
              <code>{{ formatTarget(node.target) }}</code>
            </div>
            <div v-if="node.failureSummary" class="node-note">
              {{ node.failureSummary }}
            </div>
            <div v-if="node.html" class="node-note">
              HTML: <code>{{ node.html }}</code>
            </div>
          </div>
          <div v-if="(violation.nodesCount || 0) > 3" class="node-more">
            + ďalšie {{ (violation.nodesCount || 0) - 3 }} elementy
          </div>
        </div>
      </article>
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

.field {
  display: grid;
  gap: 0.6rem;
}

.field--actions {
  align-self: end;
}

.field--actions .btn {
  width: 100%;
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

.filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.2rem;
  align-items: end;
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

.btn-filter-clear {
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: #0f172a;
  box-shadow: none;
  height: 44px;
}

.btn-export {
  background: linear-gradient(135deg, var(--brand), #1e40af);
  border: none;
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(29, 78, 216, 0.3);
  height: 44px;
}

.btn-filter-clear:disabled,
.btn-export:disabled {
  opacity: 0.6;
  box-shadow: none;
}

.btn .spinner-border {
  margin-right: 0.5rem;
}

.btn-outline {
  border: 1px solid var(--border);
  background: transparent;
  color: #0f172a;
}

.issue-list {
  display: grid;
  border-top: 1px solid var(--border);
  margin-top: 1rem;
}

.issue-card {
  padding: 1.25rem 0;
  border-bottom: 1px solid var(--border);
  display: grid;
  gap: 0.6rem;
}

.issue-card.impact-critical {
  border-left: 4px solid var(--danger);
  padding-left: 1rem;
}

.issue-card.impact-serious {
  border-left: 4px solid #c2410c;
  padding-left: 1rem;
}

.issue-card.impact-moderate {
  border-left: 4px solid var(--warning);
  padding-left: 1rem;
}

.issue-card.impact-minor {
  border-left: 4px solid var(--info);
  padding-left: 1rem;
}

.issue-card:last-child {
  border-bottom: 0;
}

.issue-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
}

.issue-title {
  margin: 0;
  font-weight: 700;
  color: #0f172a;
}

.issue-card.impact-critical .issue-title {
  color: var(--danger);
}

.issue-card.impact-serious .issue-title {
  color: #c2410c;
}

.issue-card.impact-moderate .issue-title {
  color: var(--warning);
}

.issue-card.impact-minor .issue-title {
  color: var(--info);
}

.issue-desc {
  margin: 0;
  color: var(--text-muted);
}

.issue-meta {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.issue-count {
  color: var(--text-muted);
}

.issue-details {
  margin-top: 0.4rem;
  padding: 0.9rem 1rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface-2);
  font-size: 0.85rem;
  color: #475569;
  display: grid;
  gap: 0.6rem;
}

.empty-inline {
  color: var(--text-muted);
}

.node-detail {
  display: grid;
  gap: 0.3rem;
}

.node-code code,
.issue-details code {
  background: #0f172a;
  color: #e2e8f0;
  padding: 0.2rem 0.35rem;
  border-radius: var(--radius);
}

.node-note {
  color: #64748b;
}

.node-more {
  color: var(--text-muted);
}

.impact-pill {
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  font-weight: 700;
  padding: 0.35rem 0.55rem;
  border-radius: var(--radius);
  min-width: 7rem;
  text-align: center;
  background: rgba(15, 23, 42, 0.06);
  color: #0f172a;
  border: 1px solid var(--border);
}

.impact-pill.impact-critical {
  color: var(--danger);
  background: rgba(185, 28, 28, 0.12);
  border-color: rgba(185, 28, 28, 0.35);
}

.impact-pill.impact-serious {
  color: #9a3412;
  background: rgba(194, 65, 12, 0.12);
  border-color: rgba(194, 65, 12, 0.35);
}

.impact-pill.impact-moderate {
  color: var(--warning);
  background: rgba(180, 83, 9, 0.14);
  border-color: rgba(180, 83, 9, 0.35);
}

.impact-pill.impact-minor {
  color: var(--info);
  background: rgba(2, 132, 199, 0.14);
  border-color: rgba(2, 132, 199, 0.35);
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
  padding: 2rem 0;
  text-align: center;
  color: var(--text-muted);
}

.empty-state--hint {
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  padding: 1.5rem;
}

@media (max-width: 980px) {
  .filters {
    grid-template-columns: 1fr;
  }

  .issue-header {
    grid-template-columns: 1fr;
    align-items: start;
  }
}
</style>

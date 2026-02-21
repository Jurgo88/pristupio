<template>
  <section class="panel issues-panel mobile-pane mobile-pane--issues">
    <div class="issues-toolbar">
      <DashboardIssuesControls
        :has-report="hasReport"
        :is-preview="isPreview"
        :is-exporting="isExporting"
        :export-progress="exportProgress"
        :export-status="exportStatus"
        :selected-principle="selectedPrinciple"
        :selected-impact="selectedImpact"
        :search-text="searchText"
        :principle-options="principleOptions"
        :export-error="exportError"
        @update:selected-principle="emit('update:selectedPrinciple', $event)"
        @update:selected-impact="emit('update:selectedImpact', $event)"
        @update:search-text="emit('update:searchText', $event)"
        @clear-filters="emit('clearFilters')"
        @export-pdf="emit('exportPdf')"
      />
    </div>

    <p v-if="hasReport" class="issues-meta">
      {{ DASHBOARD_ISSUES_TEXT.shownFindings }}: <strong>{{ visibleIssues.length }}</strong> / {{ filteredIssues.length }}
      <span class="issues-meta-total"> ({{ DASHBOARD_ISSUES_TEXT.totalPrefix }} {{ reportIssuesCount }})</span>
    </p>

    <div v-if="!hasReport" class="status-state">
      {{ DASHBOARD_ISSUES_TEXT.emptyNoReport }}
    </div>

    <div v-else-if="reportIssuesCount === 0" class="status-state">
      {{ DASHBOARD_ISSUES_TEXT.emptyNoIssues }}
    </div>

    <div v-else-if="filteredIssues.length === 0" class="status-state">
      {{ DASHBOARD_ISSUES_TEXT.emptyNoFilteredIssues }}
    </div>

    <DashboardIssueList
      v-else
      :filtered-issues="visibleIssues"
      :is-preview="isPreview"
      :impact-class="impactClass"
      :violation-key="violationKey"
      :is-open="isOpen"
      :toggle-details="toggleDetails"
    />

    <div v-if="hasMoreIssues" class="issues-load-more">
      <button class="btn btn-outline" @click="emit('loadMoreIssues')">{{ DASHBOARD_ISSUES_TEXT.loadMoreFindings }}</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { DashboardIssue } from './dashboard.types'
import { DASHBOARD_ISSUES_TEXT } from './dashboard.copy'
import DashboardIssueList from './DashboardIssueList.vue'
import DashboardIssuesControls from './DashboardIssuesControls.vue'

type ImpactClassFn = (impact: string) => string
type ViolationKeyFn = (violation: DashboardIssue, index: number) => string
type IsOpenFn = (key: string) => boolean
type ToggleDetailsFn = (key: string) => void

defineProps<{
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
  visibleIssues: DashboardIssue[]
  filteredIssues: DashboardIssue[]
  reportIssuesCount: number
  hasMoreIssues: boolean
  impactClass: ImpactClassFn
  violationKey: ViolationKeyFn
  isOpen: IsOpenFn
  toggleDetails: ToggleDetailsFn
}>()

const emit = defineEmits<{
  (event: 'update:selectedPrinciple', value: string): void
  (event: 'update:selectedImpact', value: string): void
  (event: 'update:searchText', value: string): void
  (event: 'clearFilters'): void
  (event: 'exportPdf'): void
  (event: 'loadMoreIssues'): void
}>()
</script>

<style scoped>
.issues-panel {
  display: grid;
  gap: 0.8rem;
  align-content: start;
}

.issues-toolbar {
  position: sticky;
  top: var(--dashboard-sticky-offset);
  z-index: 4;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.75rem;
}

.issues-meta {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.issues-meta-total {
  color: #64748b;
}

.issues-load-more {
  display: flex;
  justify-content: center;
  padding-top: 0.35rem;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.8rem;
  box-shadow: var(--shadow-sm);
}

@media (max-width: 980px) {
  .issues-toolbar {
    position: static;
    border-bottom: 0;
    padding-bottom: 0;
  }
}

@media (max-width: 640px) {
  .panel {
    padding: 1.4rem;
  }
}
</style>

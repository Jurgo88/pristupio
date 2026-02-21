<template>
  <section class="workspace-overview mobile-pane mobile-pane--overview">
    <DashboardStats
      v-if="hasReport"
      :high-count="highCount"
      :med-count="medCount"
      :low-count="lowCount"
    />

    <DashboardReportPreview
      v-if="hasReport"
      :audit-score="auditScore"
      :high-count="highCount"
      :med-count="medCount"
      :low-count="lowCount"
      :critical-percent="criticalPercent"
      :moderate-percent="moderatePercent"
      :minor-percent="minorPercent"
    />

    <section v-if="!hasReport" class="panel overview-empty">
      {{ copy.emptyState }}
    </section>
  </section>
</template>

<script setup lang="ts">
import DashboardReportPreview from './DashboardReportPreview.vue'
import DashboardStats from './DashboardStats.vue'
import { DASHBOARD_OVERVIEW_TEXT } from './dashboard.copy'

const copy = DASHBOARD_OVERVIEW_TEXT

defineProps<{
  hasReport: boolean
  highCount: number
  medCount: number
  lowCount: number
  auditScore: number
  criticalPercent: number
  moderatePercent: number
  minorPercent: number
}>()
</script>

<style scoped>
.workspace-overview {
  display: grid;
  gap: 1rem;
}

.overview-empty {
  color: var(--text-muted);
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.8rem;
  box-shadow: var(--shadow-sm);
}

@media (max-width: 640px) {
  .panel {
    padding: 1.4rem;
  }
}
</style>

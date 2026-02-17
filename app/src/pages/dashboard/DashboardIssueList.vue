<template>
  <div class="issue-list">
    <article
      v-for="(violation, index) in filteredIssues"
      :key="violationKey(violation, index)"
      class="issue-card"
      :class="impactClass(violation.impact || '')"
    >
      <div class="issue-header">
        <div class="impact-pill" :class="impactClass(violation.impact || '')">
          {{ getImpactLabel(violation.impact) }}
        </div>
        <h6 class="issue-title">{{ violation.title }}</h6>
        <button
          v-if="!isPreview"
          class="btn btn-outline btn-sm"
          @click="toggleDetails(violationKey(violation, index))"
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
</template>

<script setup lang="ts">
import type { DashboardIssue } from './dashboard.types'
import { IMPACT_LABELS } from './dashboard.constants'
import { describeTarget, formatTarget } from './useDashboardTargets'

type ImpactClassFn = (impact: string) => string
type ViolationKeyFn = (violation: DashboardIssue, index: number) => string
type IsOpenFn = (key: string) => boolean
type ToggleDetailsFn = (key: string) => void

const getImpactLabel = (impact?: string) => {
  if (!impact) return 'Neurčené'
  return IMPACT_LABELS[impact as keyof typeof IMPACT_LABELS] || impact
}

defineProps<{
  filteredIssues: DashboardIssue[]
  isPreview: boolean
  impactClass: ImpactClassFn
  violationKey: ViolationKeyFn
  isOpen: IsOpenFn
  toggleDetails: ToggleDetailsFn
}>()
</script>

<style scoped>
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

[data-theme='dark'] .issue-list {
  border-top-color: #2c3b55;
}

[data-theme='dark'] .issue-card {
  border-bottom-color: #2c3b55;
  padding: 1rem 1rem 1rem 1.1rem;
  border-radius: var(--radius-sm);
  background: #0f1a2d;
}

[data-theme='dark'] .issue-card.impact-critical {
  border-left-color: #f87171;
  background: linear-gradient(100deg, rgba(127, 29, 29, 0.44), rgba(15, 23, 42, 0.96) 65%);
}

[data-theme='dark'] .issue-card.impact-serious {
  border-left-color: #fb923c;
  background: linear-gradient(100deg, rgba(154, 52, 18, 0.4), rgba(15, 23, 42, 0.96) 65%);
}

[data-theme='dark'] .issue-card.impact-moderate {
  border-left-color: #fbbf24;
  background: linear-gradient(100deg, rgba(120, 53, 15, 0.35), rgba(15, 23, 42, 0.96) 65%);
}

[data-theme='dark'] .issue-card.impact-minor {
  border-left-color: #38bdf8;
  background: linear-gradient(100deg, rgba(8, 47, 73, 0.42), rgba(15, 23, 42, 0.96) 65%);
}

[data-theme='dark'] .issue-title {
  color: #e2e8f0;
}

[data-theme='dark'] .issue-card.impact-critical .issue-title,
[data-theme='dark'] .issue-card.impact-serious .issue-title,
[data-theme='dark'] .issue-card.impact-moderate .issue-title,
[data-theme='dark'] .issue-card.impact-minor .issue-title {
  color: #f8fafc;
}

[data-theme='dark'] .issue-desc,
[data-theme='dark'] .issue-meta,
[data-theme='dark'] .issue-count,
[data-theme='dark'] .node-note,
[data-theme='dark'] .node-more,
[data-theme='dark'] .empty-inline {
  color: #b8c7dc;
}

[data-theme='dark'] .issue-details {
  background: #101d32;
  border-color: #334862;
  color: #c8d7ea;
}

[data-theme='dark'] .node-code code,
[data-theme='dark'] .issue-details code {
  background: #020617;
  color: #bfdbfe;
  border: 1px solid #334862;
}

[data-theme='dark'] .impact-pill {
  background: rgba(148, 163, 184, 0.15);
  color: #dbe7fb;
  border-color: rgba(148, 163, 184, 0.4);
}

[data-theme='dark'] .impact-pill.impact-critical {
  color: #fecaca;
  background: rgba(185, 28, 28, 0.3);
  border-color: rgba(248, 113, 113, 0.55);
}

[data-theme='dark'] .impact-pill.impact-serious {
  color: #fed7aa;
  background: rgba(154, 52, 18, 0.28);
  border-color: rgba(251, 146, 60, 0.55);
}

[data-theme='dark'] .impact-pill.impact-moderate {
  color: #fde68a;
  background: rgba(146, 64, 14, 0.28);
  border-color: rgba(251, 191, 36, 0.55);
}

[data-theme='dark'] .impact-pill.impact-minor {
  color: #bae6fd;
  background: rgba(12, 74, 110, 0.34);
  border-color: rgba(56, 189, 248, 0.55);
}

@media (max-width: 980px) {
  .issue-header {
    grid-template-columns: 1fr;
    align-items: start;
  }
}
</style>

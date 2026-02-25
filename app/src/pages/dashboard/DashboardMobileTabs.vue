<template>
  <nav class="mobile-tabs" aria-label="Sekcie dashboardu">
    <button
      type="button"
      class="mobile-tab"
      :class="{ 'is-active': activeTab === 'overview' }"
      @click="$emit('update:activeTab', 'overview')"
    >
      <span>Prehľad</span>
    </button>
    <button
      type="button"
      class="mobile-tab"
      :class="{ 'is-active': activeTab === 'issues' }"
      @click="$emit('update:activeTab', 'issues')"
    >
      <span>Nálezy</span>
      <small v-if="issuesCount > 0" class="mobile-tab__count">{{ issuesCount }}</small>
    </button>
    <button
      type="button"
      class="mobile-tab"
      :class="{ 'is-active': activeTab === 'history' }"
      @click="$emit('update:activeTab', 'history')"
    >
      <span>História</span>
      <small v-if="historyCount > 0" class="mobile-tab__count">{{ historyCount }}</small>
    </button>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  activeTab: 'overview' | 'issues' | 'history'
  issuesCount: number
  historyCount: number
}>()

defineEmits<{
  (event: 'update:activeTab', value: 'overview' | 'issues' | 'history'): void
}>()
</script>

<style scoped>
.mobile-tabs {
  display: none;
}

.mobile-tab {
  border: 1px solid var(--border);
  background: var(--surface);
  color: #0f172a;
  border-radius: var(--radius);
  padding: 0.65rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
}

.mobile-tab.is-active {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  background: #ffffff;
}

.mobile-tab__count {
  min-width: 1.2rem;
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  color: #334155;
  font-size: 0.72rem;
  line-height: 1.2;
}

.mobile-tab.is-active .mobile-tab__count {
  background: rgba(37, 99, 235, 0.15);
  color: #1e40af;
}

@media (max-width: 980px) {
  .mobile-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.6rem;
    position: sticky;
    top: var(--dashboard-sticky-offset);
    z-index: 2;
    background: #f8fafc;
    padding-bottom: 0.35rem;
  }
}
</style>

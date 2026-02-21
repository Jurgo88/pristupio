<template>
  <nav class="mobile-tabs" aria-label="Sekcie dashboardu">
    <button
      type="button"
      class="mobile-tab"
      :class="{ 'is-active': activeTab === 'overview' }"
      @click="$emit('update:activeTab', 'overview')"
    >
      Prehľad
    </button>
    <button
      type="button"
      class="mobile-tab"
      :class="{ 'is-active': activeTab === 'issues' }"
      @click="$emit('update:activeTab', 'issues')"
    >
      Nálezy
    </button>
    <button
      type="button"
      class="mobile-tab"
      :class="{ 'is-active': activeTab === 'history' }"
      @click="$emit('update:activeTab', 'history')"
    >
      História
    </button>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  activeTab: 'overview' | 'issues' | 'history'
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
}

.mobile-tab.is-active {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  background: #ffffff;
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

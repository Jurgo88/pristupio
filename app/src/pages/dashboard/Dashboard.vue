<template>
  <div class="container py-4">
    <div class="card mb-5 shadow-sm">
      <div class="card-body">
        <h4 class="card-title mb-3 text-primary">Spustiť nový WCAG audit</h4>
        <div class="input-group mb-3">
          <input v-model="targetUrl" type="url" class="form-control" placeholder="https://priklad.sk" />
          <button @click="handleStartAudit" class="btn btn-primary" :disabled="auditStore.loading">
            <span v-if="auditStore.loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ auditStore.loading ? 'Auditujem...' : 'Analyzovať web' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="auditStore.currentAudit" class="row mb-4 text-center">
      <div class="col-md-4">
        <div class="card bg-danger text-white p-3 shadow">
          <h5>HIGH / CRITICAL</h5>
          <h2>{{ highCount }}</h2>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card bg-warning text-dark p-3 shadow">
          <h5>MEDIUM / MODERATE</h5>
          <h2>{{ medCount }}</h2>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card bg-info text-dark p-3 shadow">
          <h5>LOW / MINOR</h5>
          <h2>{{ lowCount }}</h2>
        </div>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="card-header bg-dark text-white d-flex justify-content-between">
        <strong>Nájdené problémy (WCAG 2.1)</strong>
        <button class="btn btn-sm btn-outline-light" :disabled="!auditStore.currentAudit">Export PDF</button>
      </div>
      <div class="list-group list-group-flush">
        <div v-for="(violation, index) in auditStore.currentAudit?.violations" :key="index" class="list-group-item p-3">
          <div class="d-flex w-100 justify-content-between align-items-center">
            <h6 class="mb-1 fw-bold text-danger">{{ violation.help }}</h6>
            <span :class="getBadgeClass(violation.impact)">{{ violation.impact }}</span>
          </div>
          <p class="mb-1 small text-muted">{{ violation.description }}</p>
          <small class="text-secondary">Zasiahnutých elementov: {{ violation.nodes }}</small>
        </div>

        <div v-if="auditStore.currentAudit && auditStore.currentAudit.violations.length === 0" class="p-5 text-center">
          🎉 Nenašli sa žiadne prístupnostné chyby!
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuditStore } from '@/stores/audit.store';

const targetUrl = ref('');
const auditStore = useAuditStore();

const handleStartAudit = async () => {
  if (!targetUrl.value) return;
  // Voláme funkciu v store, ktorú sme premenovali podľa potreby
  await auditStore.runManualAudit(targetUrl.value);
};

// Computed vlastnosti na počítanie chýb z poľa 'violations'
const highCount = computed(() => {
  return auditStore.currentAudit?.violations?.filter((v: any) => v.impact === 'critical' || v.impact === 'serious').length || 0;
});

const medCount = computed(() => {
  return auditStore.currentAudit?.violations?.filter((v: any) => v.impact === 'moderate').length || 0;
});

const lowCount = computed(() => {
  return auditStore.currentAudit?.violations?.filter((v: any) => v.impact === 'minor').length || 0;
});

// Pomocná funkcia pre farbu štítkov
const getBadgeClass = (impact: string) => {
  if (impact === 'critical' || impact === 'serious') return 'badge bg-danger';
  if (impact === 'moderate') return 'badge bg-warning text-dark';
  return 'badge bg-info text-dark';
};
</script>
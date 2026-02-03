<template>
  <div class="container py-4 audit-page">
    <div class="card mb-5 shadow-sm">
      <div class="card-body">
        <h4 class="card-title mb-3 text-primary">Spustit novy WCAG audit</h4>
        <div class="input-group mb-3">
          <input v-model="targetUrl" type="url" class="form-control" placeholder="https://priklad.sk" />
          <button @click="handleStartAudit" class="btn btn-primary" :disabled="auditStore.loading">
            <span v-if="auditStore.loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ auditStore.loading ? 'Auditujem...' : 'Analyzovat web' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="auditStore.report" class="row mb-4 text-center">
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
        <strong>Najdene problemy (WCAG 2.1)</strong>
        <button class="btn btn-sm btn-outline-light" :disabled="!auditStore.report">Export PDF</button>
      </div>
      <div class="card-body border-bottom">
        <div class="row g-2">
          <div class="col-md-4">
            <label class="form-label small text-secondary">Princip</label>
            <select v-model="selectedPrinciple" class="form-select form-select-sm" :disabled="!auditStore.report">
              <option value="">Vsetky</option>
              <option v-for="p in principleOptions" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label small text-secondary">Zavaznost</label>
            <select v-model="selectedImpact" class="form-select form-select-sm" :disabled="!auditStore.report">
              <option value="">Vsetky</option>
              <option value="critical">Critical</option>
              <option value="serious">Serious</option>
              <option value="moderate">Moderate</option>
              <option value="minor">Minor</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label small text-secondary">Hladat</label>
            <input v-model="searchText" class="form-control form-control-sm" type="text" placeholder="Napr. kontrast, tlacidlo, aria" :disabled="!auditStore.report" />
          </div>
          <div class="col-md-4 d-flex align-items-end">
            <button class="btn btn-sm btn-outline-secondary w-100" @click="clearFilters" :disabled="!auditStore.report">
              Zrusit filtre
            </button>
          </div>
        </div>
      </div>
      <div class="list-group list-group-flush">
        <div v-for="(violation, index) in filteredIssues" :key="index" class="list-group-item p-3">
          <div class="d-flex w-100 justify-content-between align-items-center">
            <h6 class="mb-1 fw-bold text-danger">{{ violation.title }}</h6>
            <div class="d-flex gap-2 align-items-center">
              <span :class="getBadgeClass(violation.impact)">{{ violation.impact }}</span>
              <button class="btn btn-sm btn-outline-secondary" @click="toggleDetails(violationKey(violation, index))">
                {{ isOpen(violationKey(violation, index)) ? 'Skryt detail' : 'Zobrazit detail' }}
              </button>
            </div>
          </div>
          <p class="mb-1 small text-muted">{{ violation.description }}</p>
          <div class="small text-secondary">
            <strong>WCAG:</strong> {{ violation.wcag || 'Neurcene' }} • <strong>Uroven:</strong> {{ violation.wcagLevel || 'Neurcene' }} • <strong>Princip:</strong> {{ violation.principle || 'Neurcene' }}
          </div>
          <div class="small text-secondary">
            <strong>Odporucanie:</strong> {{ violation.recommendation || 'Skontrolujte problem manualne a upravte HTML tak, aby splnalo WCAG.' }}
          </div>
          <small class="text-secondary">Zasiahnutych elementov: {{ violation.nodesCount }}</small>

          <div v-if="isOpen(violationKey(violation, index))" class="mt-2 small text-secondary">
            <div v-if="violation.nodesCount === 0" class="text-muted">Nenasli sa konkretne prvky.</div>
            <div v-for="(node, nIndex) in violation.nodes.slice(0, 3)" :key="nIndex" class="mt-2">
              <div>{{ describeTarget(node.target) }}</div>
              <div class="mt-1">
                <code>{{ formatTarget(node.target) }}</code>
              </div>
              <div v-if="node.failureSummary" class="text-muted mt-1">
                {{ node.failureSummary }}
              </div>
              <div v-if="node.html" class="text-muted mt-1">
                HTML: <code>{{ node.html }}</code>
              </div>
            </div>
            <div v-if="violation.nodesCount > 3" class="text-muted mt-2">
              + dalsie {{ violation.nodesCount - 3 }} elementy
            </div>
          </div>
        </div>

        <div v-if="auditStore.report && filteredIssues.length === 0" class="p-5 text-center">
          Ziadne chyby pre vybrate filtre.
        </div>
        <div v-else-if="auditStore.report && auditStore.report.issues.length === 0" class="p-5 text-center">
          Nenasli sa ziadne pristupnostne chyby.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuditStore } from '@/stores/audit.store';

const targetUrl = ref('');
const selectedPrinciple = ref('');
const selectedImpact = ref('');
const searchText = ref('');
const openDetails = ref<Record<string, boolean>>({});
const auditStore = useAuditStore();

const handleStartAudit = async () => {
  if (!targetUrl.value) return;
  await auditStore.runManualAudit(targetUrl.value);
};

const highCount = computed(() => {
  const byImpact = auditStore.report?.summary.byImpact;
  return (byImpact?.critical || 0) + (byImpact?.serious || 0);
});

const medCount = computed(() => {
  return auditStore.report?.summary.byImpact.moderate || 0;
});

const lowCount = computed(() => {
  return auditStore.report?.summary.byImpact.minor || 0;
});

const getBadgeClass = (impact: string) => {
  if (impact === 'critical' || impact === 'serious') return 'badge bg-danger';
  if (impact === 'moderate') return 'badge bg-warning text-dark';
  return 'badge bg-info text-dark';
};

const principleOptions = computed(() => {
  const issues = auditStore.report?.issues || [];
  const unique = new Set(issues.map((i: any) => i.principle).filter(Boolean));
  return Array.from(unique);
});

const filteredIssues = computed(() => {
  const issues = auditStore.report?.issues || [];
  const term = searchText.value.trim().toLowerCase();

  return issues.filter((i: any) => {
    const principleOk = !selectedPrinciple.value || i.principle === selectedPrinciple.value;
    const impactOk = !selectedImpact.value || i.impact === selectedImpact.value;
    const text = `${i.title} ${i.description} ${i.recommendation} ${i.wcag} ${i.principle}`.toLowerCase();
    const searchOk = !term || text.includes(term);
    return principleOk && impactOk && searchOk;
  });
});

const clearFilters = () => {
  selectedPrinciple.value = '';
  selectedImpact.value = '';
  searchText.value = '';
};

const violationKey = (violation: any, index: number) => `${violation.id}-${index}`;

const toggleDetails = (key: string) => {
  openDetails.value = { ...openDetails.value, [key]: !openDetails.value[key] };
};

const isOpen = (key: string) => !!openDetails.value[key];

const formatTarget = (target: string[]) => {
  if (!Array.isArray(target)) return '';
  return target.join(', ');
};

const describeTarget = (target: string[]) => {
  if (!Array.isArray(target) || target.length === 0) return 'Prvok na stranke';
  const selector = target[0];

  if (selector === 'html') return 'Dokument (html)';
  if (selector === 'body') return 'Telo stranky (body)';
  if (selector.includes('header')) return 'Hlavicka stranky';
  if (selector.includes('nav')) return 'Navigacia';
  if (selector.includes('main')) return 'Hlavny obsah';
  if (selector.includes('footer')) return 'Paticka';
  if (selector.includes('section')) return 'Sekcia';
  if (selector.includes('form')) return 'Formular';
  if (selector.includes('table')) return 'Tabulka';
  if (selector.includes('thead') || selector.includes('th')) return 'Hlavicka tabulky';
  if (selector.includes('tbody') || selector.includes('td')) return 'Bunka tabulky';
  if (selector.includes('ul') || selector.includes('ol')) return 'Zoznam';
  if (selector.includes('li')) return 'Polozka zoznamu';
  if (selector.includes('iframe')) return 'Vlozeny obsah (iframe)';
  if (selector.includes('button')) return 'Tlacidlo';
  if (selector.includes('input')) return 'Formularove pole';
  if (selector.includes('textarea')) return 'Textove pole';
  if (selector.includes('select')) return 'Vyberove pole';
  if (selector.includes('a')) return 'Odkaz';
  if (selector.includes('img')) return 'Obrazok';
  if (selector.includes('h1')) return 'Nadpis urovne 1';
  if (selector.includes('h2')) return 'Nadpis urovne 2';
  if (selector.includes('h3')) return 'Nadpis urovne 3';
  if (selector.includes('h4')) return 'Nadpis urovne 4';
  if (selector.includes('h5')) return 'Nadpis urovne 5';
  if (selector.includes('h6')) return 'Nadpis urovne 6';
  if (selector.includes('.')) return 'Prvok s CSS triedou';
  if (selector.includes('#')) return 'Prvok s konkretnym ID';
  return 'Prvok na stranke';
};
</script>

<style scoped>
.audit-page {
  max-width: 1100px;
}

.audit-page .card {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.audit-page .card-header {
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%);
}

.audit-page .card-header strong {
  letter-spacing: 0.2px;
}

.audit-page .card-body .form-select,
.audit-page .card-body .form-control {
  border-radius: 12px;
  border-color: var(--border);
  box-shadow: none;
}

.audit-page .list-group-item {
  border: 0;
  border-bottom: 1px solid var(--border);
  padding: 1.25rem 1.5rem;
}

.audit-page .list-group-item:last-child {
  border-bottom: 0;
}

.audit-page .list-group-item:hover {
  background: var(--surface-2);
}

.audit-page .badge {
  border-radius: 999px;
  padding: 0.35rem 0.6rem;
  font-weight: 600;
}

.audit-page .btn-outline-secondary,
.audit-page .btn-outline-light {
  border-radius: 10px;
}

.audit-page .btn-primary {
  border-radius: 10px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border: none;
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.25);
}

.audit-page .btn-primary:hover {
  filter: brightness(0.98);
}

.audit-page .text-muted,
.audit-page .text-secondary {
  color: var(--text-muted) !important;
}

.audit-page code {
  background: #0f172a;
  color: #e2e8f0;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
}
</style>

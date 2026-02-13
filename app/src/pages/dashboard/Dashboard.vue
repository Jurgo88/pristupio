<template>
  <div class="audit-page">
    <section class="page-hero">
      <div class="page-hero__content">
        <span class="kicker">Dashboard</span>
        <h1>WCAG audit prehľad</h1>
        <p class="lead">
          Spustite audit, filtrujte nálezy a zdieľajte report v jednom konzistentnom prehľade.
        </p>
        <div class="hero-tags">
          <span>WCAG 2.1 AA</span>
          <span>EN 301 549</span>
          <span>EAA / WAD</span>
        </div>
      </div>
      <div class="page-hero__aside">
        <div class="page-hero__card">
          <div class="hero-card-title">Rýchly postup</div>
          <ul>
            <li>Zadajte URL a vyberte profil</li>
            <li>Spustite audit a sledujte nálezy</li>
            <li>Exportujte report pre tím</li>
          </ul>
          <div class="hero-card-meta">Automatický audit + manuálny checklist</div>
        </div>
      </div>
    </section>

    <section v-if="auditStore.report && isPreview" class="panel preview-banner">
      <p class="kicker">Free audit preview</p>
      <h2>Vidis len rychly prehlad problemov</h2>
      <p class="lead">
        Free audit ukazuje skore, pocty a top 3 nalezy. Detailne odporucania a plny report su
        dostupne v zakladnom audite.
      </p>
    </section>

    <section v-if="paymentNotice" class="panel payment-banner">
      <p class="kicker">Platba</p>
      <h2>Ďakujeme, platba prebehla.</h2>
      <p class="lead">
        Ak sa prístup ešte neodomkol, kliknite na “Už som zaplatil” a obnovíme stav z Lemon
        Squeezy.
      </p>
      <div class="upgrade-actions">
        <button class="btn btn-outline" @click="refreshPlan" :disabled="refreshPlanLoading">
          {{ refreshPlanLoading ? 'Overujem...' : 'Už som zaplatil' }}
        </button>
      </div>
    </section>

    <section v-if="showUpgrade" class="panel upgrade-panel">
      <div>
        <p class="kicker">Základný audit</p>
        <h2>Odomknite celý report a odporúčania.</h2>
        <p class="lead">
          Po platbe sa vám odomkne plný výstup a export PDF. Po zaplatení stačí spustiť audit ešte
          raz.
        </p>
      </div>
      <div class="upgrade-actions">
        <a v-if="auditCheckoutUrl" :href="auditCheckoutUrl" class="btn btn-primary">
          Objednať audit (99 €)
        </a>
        <button class="btn btn-outline" @click="refreshPlan" :disabled="refreshPlanLoading">
          {{ refreshPlanLoading ? 'Overujem...' : 'Už som zaplatil' }}
        </button>
      </div>
    </section>

    <section v-if="showPaidStatus" class="panel paid-banner">
      <p class="kicker">Základný audit</p>
      <h2 v-if="paidCredits <= 0">Nemáte dostupný kredit.</h2>
      <h2 v-else>Máte dostupný kredit na audit.</h2>
      <p class="lead" v-if="paidCredits <= 0">
        Objednajte ďalší audit a spravte nový report.
      </p>
      <p class="lead" v-else>
        Môžete spustiť audit a získať plný report, odporúčania a export PDF.
      </p>
      <div class="history-stats">
        <span>Kredity: {{ paidCredits }}</span>
      </div>
      <div class="upgrade-actions">
        <a v-if="auditCheckoutUrl" :href="auditCheckoutUrl" class="btn btn-outline">
          Objednať ďalší audit
        </a>
      </div>
    </section>

    <section class="panel audit-history">
      <div class="panel-head panel-head--tight">
        <div>
          <p class="kicker">História</p>
          <h2>História auditov</h2>
        </div>
        <div class="history-actions">
          <button
            class="btn btn-sm btn-filter-clear"
            @click="openLatestAudit"
            :disabled="historyLoading || !latestAudit"
          >
            Zobraziť posledný audit
          </button>
          <button class="btn btn-sm btn-filter-clear" @click="loadAuditHistory" :disabled="historyLoading">
            {{ historyLoading ? 'Načítavam...' : 'Obnoviť' }}
          </button>
        </div>
      </div>
      <DashboardAuditHistoryList
        :history-error="historyError"
        :history-loading="historyLoading"
        :audit-history="auditHistory"
        :selected-audit-id="selectedAuditId"
        :format-date="formatDate"
        :issue-total="issueTotal"
        :issue-high="issueHigh"
        :select-audit="selectAudit"
      />
    </section>

    <DashboardAuditForm
      :target-url="targetUrl"
      :selected-profile="selectedProfile"
      :profile-options="profileOptions"
      :can-run-audit="canRunAudit"
      :audit-locked="auditLocked"
      :audit-locked-message="auditLockedMessage"
      :loading="auditStore.loading"
      :error-message="auditStore.error || ''"
      @update:target-url="targetUrl = $event"
      @update:selected-profile="selectedProfile = $event"
      @start-audit="handleStartAudit"
    />

    <DashboardStats v-if="auditStore.report" :high-count="highCount" :med-count="medCount" :low-count="lowCount" />

    <DashboardReportPreview
      v-if="auditStore.report"
      :audit-score="auditScore"
      :high-count="highCount"
      :med-count="medCount"
      :low-count="lowCount"
      :critical-percent="criticalPercent"
      :moderate-percent="moderatePercent"
      :minor-percent="minorPercent"
    />

    <section class="panel issues-panel">
      <DashboardIssuesControls
        :has-report="!!auditStore.report"
        :is-preview="isPreview"
        :is-exporting="isExporting"
        :selected-principle="selectedPrinciple"
        :selected-impact="selectedImpact"
        :search-text="searchText"
        :principle-options="principleOptions"
        :current-export-error="currentExportError"
        @update:selected-principle="selectedPrinciple = $event"
        @update:selected-impact="selectedImpact = $event"
        @update:search-text="searchText = $event"
        @clear-filters="clearFilters"
        @export-pdf="exportPdf"
      />

      <div v-if="!auditStore.report" class="empty-state empty-state--hint">
        Spustite audit, aby sa zobrazili nálezy a detailné odporúčania.
      </div>

      <div v-else-if="auditStore.report.issues.length === 0" class="empty-state">
        Nenašli sa žiadne prístupnostné chyby.
      </div>

      <div v-else-if="filteredIssues.length === 0" class="empty-state">
        Žiadne chyby pre vybrané filtre.
      </div>

      <DashboardIssueList
        v-else
        :filtered-issues="filteredIssues"
        :is-preview="isPreview"
        :impact-class="impactClass"
        :violation-key="violationKey"
        :is-open="isOpen"
        :toggle-details="toggleDetails"
      />
    </section>

    <!-- <ManualChecklist :profile="selectedProfile" /> -->
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ManualChecklist from '@/components/ManualChecklist.vue'
import DashboardAuditHistoryList from './DashboardAuditHistoryList.vue'
import DashboardAuditForm from './DashboardAuditForm.vue'
import DashboardIssueList from './DashboardIssueList.vue'
import DashboardIssuesControls from './DashboardIssuesControls.vue'
import DashboardReportPreview from './DashboardReportPreview.vue'
import DashboardStats from './DashboardStats.vue'
import { useDashboardIssues } from './useDashboardIssues'
import { useDashboardExport } from './useDashboardExport'
import { useDashboardCore } from './useDashboardCore'
import './dashboard.shared.css'

const {
  targetUrl,
  selectedProfile,
  auditStore,
  refreshPlanLoading,
  paymentNotice,
  auditCheckoutUrl,
  isPreview,
  auditLocked,
  auditLockedMessage,
  showUpgrade,
  showPaidStatus,
  paidCredits,
  auditHistory,
  historyLoading,
  historyError,
  selectedAuditId,
  latestAudit,
  refreshPlan,
  loadAuditHistory,
  profileOptions,
  canRunAudit,
  profileLabel,
  handleStartAudit,
  formatDate,
  selectAudit,
  openLatestAudit
} = useDashboardCore()

const {
  selectedPrinciple,
  selectedImpact,
  searchText,
  issueTotal,
  issueHigh,
  highCount,
  medCount,
  lowCount,
  auditScore,
  criticalPercent,
  moderatePercent,
  minorPercent,
  impactClass,
  principleOptions,
  filteredIssues,
  clearFilters,
  violationKey,
  toggleDetails,
  isOpen
} = useDashboardIssues(computed(() => auditStore.report))

const {
  exporting: isExporting,
  exportError: currentExportError,
  exportPdf
} = useDashboardExport({
  report: computed(() => auditStore.report),
  targetUrl,
  selectedProfile,
  profileLabel,
  selectedPrinciple,
  selectedImpact,
  searchText,
  filteredIssues
})
</script>

<style scoped>
/* Page Layout */
.audit-page {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  gap: 2.5rem;
  padding: 0.5rem 0 4rem;
}

/* Hero */
.page-hero {
  position: relative;
  background: linear-gradient(135deg, #0f172a 0%, #111827 100%);
  color: #e2e8f0;
  border: 1px solid #0b1220;
  border-radius: var(--radius);
  padding: 2.6rem;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 2rem;
  align-items: center;
}

.page-hero::before,
.page-hero::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  opacity: 0.6;
  z-index: 0;
}

.page-hero::before {
  width: 360px;
  height: 360px;
  right: -140px;
  top: -120px;
  background: radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.45), transparent 70%);
}

.page-hero::after {
  width: 280px;
  height: 280px;
  left: -120px;
  bottom: -130px;
  background: radial-gradient(circle at 70% 70%, rgba(14, 165, 233, 0.35), transparent 70%);
}

.page-hero__content {
  position: relative;
  z-index: 1;
}

.page-hero__content h1 {
  font-size: clamp(2rem, 1.4rem + 2vw, 3rem);
  line-height: 1.1;
  margin: 0 0 0.8rem;
}

.kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 700;
  margin: 0 0 0.4rem;
}

.lead {
  color: var(--text-muted);
  font-size: 1rem;
  margin: 0;
}

.page-hero__content .lead {
  color: #cbd5f5;
  margin: 0 0 1.2rem;
}

.hero-tags {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: #94a3b8;
}

.hero-tags span {
  border: 1px solid #1f2937;
  padding: 0.35rem 0.7rem;
  border-radius: var(--radius);
  background: rgba(15, 23, 42, 0.45);
}

.page-hero__card {
  position: relative;
  z-index: 1;
  background: #ffffff;
  color: #0f172a;
  border-radius: var(--radius);
  padding: 1.2rem 1.4rem;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
  border: 1px solid rgba(226, 232, 240, 0.7);
}

.page-hero__aside {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 1rem;
}

.hero-card-title {
  font-weight: 700;
  font-size: 0.95rem;
}

.page-hero__card ul {
  margin: 0.8rem 0 0;
  padding-left: 1.1rem;
  color: #475569;
  display: grid;
  gap: 0.4rem;
}

.hero-card-meta {
  margin-top: 0.8rem;
  font-size: 0.82rem;
  color: #64748b;
}

/* Panel Shell */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.8rem;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
}

.preview-banner {
  background: linear-gradient(135deg, rgba(30, 64, 175, 0.1), rgba(14, 165, 233, 0.08));
  border-color: rgba(37, 99, 235, 0.35);
}

.preview-banner h2 {
  margin: 0.2rem 0 0.6rem;
}

.payment-banner {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(34, 197, 94, 0.08));
  border-color: rgba(16, 185, 129, 0.4);
}

.paid-banner {
  background: linear-gradient(135deg, rgba(2, 132, 199, 0.12), rgba(14, 116, 144, 0.08));
  border-color: rgba(14, 116, 144, 0.35);
}

.upgrade-panel {
  display: grid;
  gap: 1.2rem;
}

.upgrade-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  align-items: center;
}

/* History Section */
.audit-history .btn-filter-clear {
  height: auto;
}

.history-actions {
  display: flex;
  gap: 0.6rem;
  align-items: center;
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

.history-stats {
  display: flex;
  gap: 0.8rem;
  margin-top: 0.4rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Empty States (issues section) */
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

/* Responsive */
@media (max-width: 1100px) {
  .page-hero {
    grid-template-columns: 1fr;
  }

  .page-hero__card {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .page-hero {
    padding: 2rem 1.6rem;
  }

  .panel {
    padding: 1.4rem;
  }
}
</style>

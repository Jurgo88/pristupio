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
      <h2>Vidíš len rýchly prehľad problémov</h2>
      <p class="lead">
        Free audit ukazuje skóre, počty a top 3 nálezy. Detailné odporúčania a plný report sú
        dostupné v základnom audite.
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
      <div class="paid-banner__copy">
        <p class="kicker">Základný audit</p>
        <h2 v-if="paidCredits <= 0">Nemáte dostupný kredit.</h2>
        <h2 v-else>Máte dostupný kredit na audit.</h2>
        <p class="lead" v-if="paidCredits <= 0">
          Objednajte ďalší audit a spravte nový report.
        </p>
        <p class="lead" v-else>
          Môžete spustiť audit a získať plný report, odporúčania a export PDF.
        </p>
      </div>

      <div class="paid-banner__meta">
        <div class="paid-banner__credits">
          <span>Kredity</span>
          <strong>{{ paidCredits }}</strong>
        </div>
        <div class="paid-banner__actions">
          <a v-if="auditCheckoutUrl" :href="auditCheckoutUrl" class="btn btn-primary paid-banner__cta">
            Objednať ďalší audit
          </a>
        </div>
      </div>
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

    <section
      class="dashboard-workspace"
      :class="{
        'is-tab-overview': activeMobileTab === 'overview',
        'is-tab-issues': activeMobileTab === 'issues',
        'is-tab-history': activeMobileTab === 'history'
      }"
    >
      <nav class="mobile-tabs" aria-label="Sekcie dashboardu">
        <button
          type="button"
          class="mobile-tab"
          :class="{ 'is-active': activeMobileTab === 'overview' }"
          @click="activeMobileTab = 'overview'"
        >
          Prehľad
        </button>
        <button
          type="button"
          class="mobile-tab"
          :class="{ 'is-active': activeMobileTab === 'issues' }"
          @click="activeMobileTab = 'issues'"
        >
          Nálezy
        </button>
        <button
          type="button"
          class="mobile-tab"
          :class="{ 'is-active': activeMobileTab === 'history' }"
          @click="activeMobileTab = 'history'"
        >
          História
        </button>
      </nav>

      <aside class="workspace-rail">
        <section class="panel audit-history mobile-pane mobile-pane--history">
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
          <div class="history-scroll">
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
          </div>
        </section>
      </aside>

      <div class="workspace-main">
        <section class="workspace-overview mobile-pane mobile-pane--overview">
          <DashboardStats
            v-if="auditStore.report"
            :high-count="highCount"
            :med-count="medCount"
            :low-count="lowCount"
          />

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

          <section v-if="!auditStore.report" class="panel overview-empty">
            Spustite audit a po dokončení sa tu zobrazí prehľad skóre a rozdelenie nálezov.
          </section>
        </section>

        <section class="panel issues-panel mobile-pane mobile-pane--issues">
          <div class="issues-toolbar">
            <DashboardIssuesControls
              :has-report="!!auditStore.report"
              :is-preview="isPreview"
              :is-exporting="isExporting"
              :selected-principle="selectedPrinciple"
              :selected-impact="selectedImpact"
              :search-text="searchText"
              :principle-options="principleOptions"
              :export-error="exportError"
              @update:selected-principle="selectedPrinciple = $event"
              @update:selected-impact="selectedImpact = $event"
              @update:search-text="searchText = $event"
              @clear-filters="clearFilters"
              @export-pdf="exportPdf"
            />
          </div>

          <p v-if="auditStore.report" class="issues-meta">
            Zobrazené nálezy: <strong>{{ visibleIssues.length }}</strong> / {{ filteredIssues.length }}
            <span class="issues-meta-total"> (celkovo {{ auditStore.report.issues.length }})</span>
          </p>

          <div v-if="!auditStore.report" class="empty-state empty-state--hint">
            {{ DASHBOARD_ISSUES_TEXT.emptyNoReport }}
          </div>

          <div v-else-if="auditStore.report.issues.length === 0" class="empty-state">
            {{ DASHBOARD_ISSUES_TEXT.emptyNoIssues }}
          </div>

          <div v-else-if="filteredIssues.length === 0" class="empty-state">
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
            <button class="btn btn-outline" @click="loadMoreIssues">Načítať ďalšie nálezy</button>
          </div>
        </section>
      </div>
    </section>

    <!-- <ManualChecklist :profile="selectedProfile" /> -->
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ManualChecklist from '@/components/ManualChecklist.vue'
import {
  DashboardAuditHistoryList,
  DashboardAuditForm,
  DashboardIssueList,
  DashboardIssuesControls,
  DashboardReportPreview,
  DashboardStats,
  DASHBOARD_ISSUES_TEXT,
  useDashboardIssues,
  useDashboardExport,
  useDashboardCore
} from './index'
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
  visibleIssues,
  hasMoreIssues,
  loadMoreIssues,
  clearFilters,
  violationKey,
  toggleDetails,
  isOpen
} = useDashboardIssues(computed(() => auditStore.report))

const {
  exporting: isExporting,
  exportError,
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

const activeMobileTab = ref<'overview' | 'issues' | 'history'>('overview')
</script>

<style scoped>
/* Page Layout */
.audit-page {
  --dashboard-sticky-offset: calc(4rem + env(safe-area-inset-top));
  width: 100%;
  margin: 0 auto;
  display: grid;
  gap: 2.5rem;
  padding: 0.5rem 0 4rem;
}

.dashboard-workspace {
  display: grid;
  grid-template-columns: minmax(340px, 0.85fr) minmax(0, 1.8fr);
  gap: 1.5rem;
  align-items: start;
}

.workspace-rail {
  display: grid;
  gap: 1rem;
  position: sticky;
  top: var(--dashboard-sticky-offset);
  max-height: calc(100vh - var(--dashboard-sticky-offset) - 0.5rem);
}

.workspace-main {
  display: grid;
  gap: 1.4rem;
}

.workspace-overview {
  display: grid;
  gap: 1rem;
}

.overview-empty {
  color: var(--text-muted);
}

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

.workspace-rail .audit-history {
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 280px;
}

.history-scroll {
  overflow: auto;
  min-height: 0;
  padding-right: 0.25rem;
}

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

/* Hero */
.page-hero {
  position: relative;
  background: linear-gradient(135deg, #0f172a 0%, #111827 100%);
  color: #e2e8f0;
  border: 1px solid #0b1220;
  border-radius: var(--radius);
  padding: 1.8rem 2rem;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 1.4rem;
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
  width: 260px;
  height: 260px;
  right: -100px;
  top: -100px;
  background: radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.45), transparent 70%);
}

.page-hero::after {
  width: 220px;
  height: 220px;
  left: -90px;
  bottom: -100px;
  background: radial-gradient(circle at 70% 70%, rgba(14, 165, 233, 0.35), transparent 70%);
}

.page-hero__content {
  position: relative;
  z-index: 1;
}

.page-hero__content h1 {
  font-size: clamp(1.6rem, 1.25rem + 1.4vw, 2.25rem);
  line-height: 1.1;
  margin: 0 0 0.5rem;
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
  margin: 0 0 0.8rem;
  font-size: 0.94rem;
}

.hero-tags {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  font-size: 0.78rem;
  color: #94a3b8;
}

.hero-tags span {
  border: 1px solid #1f2937;
  padding: 0.22rem 0.55rem;
  border-radius: var(--radius);
  background: rgba(15, 23, 42, 0.45);
}

.page-hero__card {
  position: relative;
  z-index: 1;
  background: #ffffff;
  color: #0f172a;
  border-radius: var(--radius);
  padding: 0.95rem 1.05rem;
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
  margin: 0.55rem 0 0;
  padding-left: 1.1rem;
  color: #475569;
  display: grid;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.hero-card-meta {
  margin-top: 0.5rem;
  font-size: 0.76rem;
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem 1rem;
  align-items: center;
  padding: 1.25rem 1.35rem;
}

.paid-banner__copy {
  min-width: 0;
}

.paid-banner h2 {
  margin: 0.15rem 0 0.45rem;
  font-size: clamp(1.15rem, 1rem + 0.55vw, 1.45rem);
}

.paid-banner .lead {
  font-size: 0.94rem;
  line-height: 1.4;
}

.paid-banner__meta {
  display: grid;
  gap: 0.55rem;
  justify-items: end;
  align-content: center;
}

.paid-banner__credits {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.34rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(14, 116, 144, 0.4);
  background: rgba(255, 255, 255, 0.82);
  color: #0f172a;
  font-size: 0.8rem;
  font-weight: 600;
}

.paid-banner__credits strong {
  color: #0c4a6e;
  font-size: 0.95rem;
  line-height: 1;
}

.paid-banner__actions {
  display: flex;
  justify-content: flex-end;
}

.paid-banner__cta {
  padding: 0.5rem 0.95rem;
  box-shadow: 0 10px 18px rgba(29, 78, 216, 0.25);
  white-space: nowrap;
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
    padding: 1.6rem 1.5rem;
  }

  .page-hero__card {
    width: 100%;
  }

  .paid-banner {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .paid-banner__meta,
  .paid-banner__actions {
    justify-items: start;
    justify-content: flex-start;
  }
}

@media (max-width: 980px) {
  .audit-page {
    --dashboard-sticky-offset: calc(4.8rem + env(safe-area-inset-top));
  }

  .dashboard-workspace {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .workspace-rail {
    position: static;
    max-height: none;
  }

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

  .mobile-pane {
    display: none;
  }

  .workspace-rail .audit-history {
    grid-template-rows: auto;
  }

  .history-scroll {
    overflow: visible;
    padding-right: 0;
  }

  .issues-toolbar {
    position: static;
    border-bottom: 0;
    padding-bottom: 0;
  }

  .dashboard-workspace.is-tab-overview .mobile-pane--overview {
    display: grid;
  }

  .dashboard-workspace.is-tab-issues .mobile-pane--issues,
  .dashboard-workspace.is-tab-history .mobile-pane--history {
    display: block;
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

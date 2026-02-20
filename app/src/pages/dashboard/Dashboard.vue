<template>
  <div class="audit-page">
    <section class="page-hero">
      <div class="page-hero__content">
        <span class="kicker">Dashboard</span>
        <h1>WCAG cockpit pre produktovy tim</h1>
        <p class="lead">
          Spustite audit, prioritizujte bariery a odovzdajte report bez chaosu.
        </p>
        <div class="hero-tags">
          <span>WCAG 2.1 AA</span>
          <span>EN 301 549</span>
          <span>EAA / WAD</span>
        </div>
      </div>
      <div class="page-hero__aside">
        <div class="page-hero__card">
          <div class="hero-card-title">Rychly workflow</div>
          <ul>
            <li>Vlozte URL a vyberte profil legislativy</li>
            <li>Spustite audit a vyriesite najkritickejsie nalezy</li>
            <li>Zdielajte report pre vyvoj, produkt a compliance</li>
          </ul>
          <div class="hero-card-meta">Automaticky audit + manualny checklist</div>
        </div>
      </div>
    </section>

    <section class="metrics-strip" aria-label="Klucove metriky">
      <article class="metric-card">
        <span>Skore pripravenosti</span>
        <strong>{{ auditStore.report ? `${auditScore}%` : '--' }}</strong>
        <small>{{ scoreStateLabel }}</small>
      </article>
      <article class="metric-card">
        <span>Kriticke nalezy</span>
        <strong>{{ auditStore.report ? highCount : '--' }}</strong>
        <small>Priorita pre najblizsi sprint</small>
      </article>
      <article class="metric-card">
        <span>Vsetky nalezy</span>
        <strong>{{ auditStore.report ? totalIssuesCount : '--' }}</strong>
        <small>{{ auditStore.report ? `Filtrovatelnych: ${filteredIssues.length}` : 'Po audite sa doplni' }}</small>
      </article>
      <article class="metric-card">
        <span>Posledny audit</span>
        <strong>{{ lastAuditLabel || '--' }}</strong>
        <small>{{ latestAudit ? 'Audit historia je aktivna' : 'Po prvom audite uvidite historiu' }}</small>
      </article>
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
          Po platbe sa vám odomkne plný výstup a export PDF. Posledný free audit sa po potvrdení
          platby automaticky odomkne.
        </p>
      </div>
      <div class="upgrade-actions">
        <a v-if="auditCheckoutBasicUrl" :href="auditCheckoutBasicUrl" class="btn btn-primary">
          Audit Basic (99 €)
        </a>
        <a v-if="auditCheckoutProUrl" :href="auditCheckoutProUrl" class="btn btn-outline">
          Audit Pro (199 €)
        </a>
        <button class="btn btn-outline" @click="refreshPlan" :disabled="refreshPlanLoading">
          {{ refreshPlanLoading ? 'Overujem...' : 'Už som zaplatil' }}
        </button>
      </div>
    </section>

    <section
      v-if="showPaidStatus"
      class="panel paid-banner"
      :class="{ 'is-empty-credit': paidCredits <= 0 }"
    >
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
          <a
            v-if="auditCheckoutBasicUrl"
            :href="auditCheckoutBasicUrl"
            class="btn btn-primary paid-banner__cta"
          >
            Pridať 5 kreditov
          </a>
          <a v-if="auditCheckoutProUrl" :href="auditCheckoutProUrl" class="btn btn-outline paid-banner__cta">
            Pridať 15 kreditov
          </a>
        </div>
      </div>
    </section>

    <section v-if="auth.isLoggedIn" class="panel monitoring-panel">
      <div class="panel-head panel-head--tight">
        <div>
          <p class="kicker">Monitoring</p>
          <h2>Automatické kontroly viacerých domén</h2>
        </div>
        <div class="monitoring-head-status">
          <span class="status-badge" :class="monitoringIsActive ? 'status-badge--success' : 'status-badge--warning'">
            {{ monitoringIsActive ? 'Aktívny' : 'Pozastavený' }}
          </span>
          <span class="monitoring-head-usage">
            {{ auth.isAdmin ? `${monitoringConfiguredCount} domén` : `${monitoringConfiguredCount}/${monitoringDomainsLimit} domén` }}
          </span>
        </div>
      </div>

      <div v-if="monitoringLoadingStatus" class="status-state status-state--loading">
        Načítavam monitoring...
      </div>

      <template v-else>
        <div v-if="monitoringHasAccess" class="monitoring-grid">
          <div class="monitoring-topline">
            <div class="monitoring-summary">
              <span class="monitoring-summary__label">Frekvencia:</span>
              <strong>{{ monitoringDefaultCadenceLabel }}</strong>
            </div>
            <div
              v-if="canBuyMonitoring && monitoringTier === 'basic'"
              class="monitoring-buy-actions monitoring-buy-actions--inline"
            >
              <a
                v-if="monitoringCheckoutProUrl"
                :href="monitoringCheckoutProUrl"
                class="btn btn-outline"
              >
                Upgrade na Monitoring Pro
              </a>
            </div>
          </div>

          <div v-if="monitoringTargets.length === 0" class="status-state">
            Zatiaľ nemáte monitorovanú doménu. V histórii auditov kliknite na „Monitoruj“.
          </div>

          <div v-else class="monitoring-targets">
            <article
              v-for="target in monitoringTargets"
              :key="target.id"
              class="monitoring-target-card"
              :class="{ 'is-inactive': !target.active }"
            >
              <div class="monitoring-target-card__main">
                <a
                  :href="target.default_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="target.default_url"
                >
                  {{ target.default_url }}
                </a>
                <div class="monitoring-target-card__meta">
                  <span class="pill">{{ target.active ? 'Aktívny' : 'Pozastavený' }}</span>
                  <span>Ďalší audit: {{ formatDateTime(target.next_run_at) || '--' }}</span>
                  <span>Posledný audit: {{ formatDateTime(target.last_run_at) || '--' }}</span>
                </div>
                <div class="monitoring-target-card__diff" v-if="monitoringDiffLabel(target.id)">
                  <span :class="monitoringDiffClass(target.id)">{{ monitoringDiffLabel(target.id) }}</span>
                </div>
              </div>
              <div class="monitoring-target-card__actions">
                <button
                  class="btn btn-sm btn-outline"
                  @click="removeMonitoringTarget(target.id)"
                  :disabled="monitoringLoadingAction"
                >
                  {{ monitoringLoadingAction ? 'Ruším...' : 'Zrušiť monitoring' }}
                </button>
              </div>
            </article>
          </div>
        </div>

        <div v-else class="monitoring-empty">
          <p class="status-state" v-if="canBuyMonitoring">
            Monitoring plán nie je aktívny.
          </p>
          <p class="status-state" v-else>
            Monitoring je dostupný až po základnom audite.
          </p>
          <div v-if="canBuyMonitoring" class="monitoring-buy-actions">
            <a
              v-if="monitoringCheckoutBasicUrl"
              :href="monitoringCheckoutBasicUrl"
              class="btn btn-primary"
            >
              Monitoring Basic (29 €)
            </a>
            <a
              v-if="monitoringCheckoutProUrl"
              :href="monitoringCheckoutProUrl"
              class="btn btn-outline"
            >
              Monitoring Pro
            </a>
            <button
              v-if="!monitoringCheckoutBasicUrl && !monitoringCheckoutProUrl"
              class="btn btn-outline"
              disabled
            >
              Monitoring checkout URL nie je nastavená
            </button>
          </div>
        </div>
      </template>

      <p v-if="monitoringMessage" class="status-alert status-alert--success">{{ monitoringMessage }}</p>
      <p v-if="monitoringWorseningNotice" class="status-alert status-alert--warning">
        {{ monitoringWorseningNotice }}
      </p>
      <p v-if="monitoringError || monitoringStore.error" class="status-alert status-alert--danger">
        {{ monitoringError || monitoringStore.error }}
      </p>
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
                :disabled="historyLoading || historyLoadingMore || !latestAudit"
              >
                Zobraziť posledný audit
              </button>
              <button
                class="btn btn-sm btn-filter-clear"
                @click="loadAuditHistory"
                :disabled="historyLoading || historyLoadingMore"
              >
                {{ historyLoading ? 'Načítavam...' : 'Obnoviť' }}
              </button>
            </div>
          </div>
          <div class="history-scroll">
            <DashboardAuditHistoryList
              :history-error="historyError"
              :history-loading="historyLoading"
              :history-loading-more="historyLoadingMore"
              :monitoring-loading-action="monitoringLoadingAction"
              :monitoring-has-access="monitoringHasAccess"
              :monitoring-active-target-urls="monitoringActiveTargetUrls"
              :monitoring-can-add-target="monitoringCanAddTarget"
              :monitoring-domains-limit="monitoringDomainsLimit"
              :history-has-more="historyHasMore"
              :audit-history="auditHistory"
              :selected-audit-id="selectedAuditId"
              :format-date="formatDate"
              :issue-total="issueTotal"
              :issue-high="issueHigh"
              :select-audit="selectAudit"
              :run-monitoring-for-audit="runMonitoringForAudit"
              :load-more-history="() => loadAuditHistory({ loadMore: true })"
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
              :export-progress="exportProgress"
              :export-status="exportStatus"
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

          <div v-if="!auditStore.report" class="status-state">
            {{ DASHBOARD_ISSUES_TEXT.emptyNoReport }}
          </div>

          <div v-else-if="auditStore.report.issues.length === 0" class="status-state">
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
  auth,
  refreshPlanLoading,
  paymentNotice,
  auditCheckoutBasicUrl,
  auditCheckoutProUrl,
  monitoringCheckoutBasicUrl,
  monitoringCheckoutProUrl,
  isPreview,
  auditLocked,
  auditLockedMessage,
  showUpgrade,
  showPaidStatus,
  paidCredits,
  monitoringStore,
  monitoringHasAccess,
  canBuyMonitoring,
  monitoringTargets,
  monitoringLoadingStatus,
  monitoringLoadingAction,
  monitoringDomainsLimit,
  monitoringConfiguredCount,
  monitoringCanAddTarget,
  monitoringIsActive,
  monitoringActiveTargetUrls,
  monitoringLatestSuccessRunByTarget,
  monitoringDefaultCadenceLabel,
  monitoringTier,
  monitoringMessage,
  monitoringError,
  auditHistory,
  historyLoading,
  historyLoadingMore,
  historyHasMore,
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
  formatDateTime,
  selectAudit,
  openLatestAudit,
  removeMonitoringTarget,
  runMonitoringForAudit
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
  exportProgress,
  exportStatus,
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
const totalIssuesCount = computed(() => auditStore.report?.issues?.length || 0)
const scoreStateLabel = computed(() => {
  if (!auditStore.report) return 'Spustite audit'
  if (auditScore.value >= 90) return 'Vysoka pripravenost'
  if (auditScore.value >= 75) return 'Solidny zaklad'
  if (auditScore.value >= 60) return 'Treba dorobit klucove opravy'
  return 'Rizikovy stav'
})
const lastAuditLabel = computed(() => {
  if (!latestAudit.value?.created_at) return ''
  return formatDate(latestAudit.value.created_at)
})

const signedDelta = (value: number) => {
  if (!Number.isFinite(value) || value === 0) return '0'
  return value > 0 ? `+${value}` : String(value)
}

const monitoringDiffMeta = (targetId: string) => {
  const run = monitoringLatestSuccessRunByTarget.value?.[targetId]
  const diff = run?.diff_json || {}
  if (!diff || typeof diff !== 'object') return null

  const totalDelta = Number((diff as any).totalDelta || 0)
  const newIssues = Number((diff as any).newIssues || 0)
  const resolvedIssues = Number((diff as any).resolvedIssues || 0)
  const byImpactDelta = ((diff as any).byImpactDelta || {}) as Record<string, number>
  const criticalDelta = Number(byImpactDelta.critical || 0)

  return {
    totalDelta,
    newIssues: Math.max(0, newIssues),
    resolvedIssues: Math.max(0, resolvedIssues),
    criticalDelta,
    worsening: totalDelta > 0 || criticalDelta > 0,
    improving: totalDelta < 0
  }
}

const monitoringDiffLabel = (targetId: string) => {
  const meta = monitoringDiffMeta(targetId)
  if (!meta) {
    return ''
  }

  return `Zmena: ${signedDelta(meta.totalDelta)} | Nové: +${meta.newIssues} | Vyriešené: -${meta.resolvedIssues}`
}

const monitoringDiffClass = (targetId: string) => {
  const meta = monitoringDiffMeta(targetId)
  if (!meta) return ''
  if (meta.worsening) return 'diff-pill diff-pill--worsening'
  if (meta.improving) return 'diff-pill diff-pill--improving'
  return 'diff-pill diff-pill--neutral'
}

const monitoringWorseningNotice = computed(() => {
  const ids = Object.keys(monitoringLatestSuccessRunByTarget.value || {})
  let worsenedCount = 0
  ids.forEach((id) => {
    const meta = monitoringDiffMeta(id)
    if (meta?.worsening) worsenedCount += 1
  })
  if (worsenedCount === 0) return ''
  if (worsenedCount === 1) return 'Upozornenie: pri 1 doméne sa monitoring zhoršil oproti minulému auditu.'
  return `Upozornenie: pri ${worsenedCount} doménach sa monitoring zhoršil oproti minulému auditu.`
})
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

.metrics-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;
}

.metric-card {
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: var(--radius-md);
  padding: 0.9rem 1rem;
  display: grid;
  gap: 0.25rem;
  backdrop-filter: blur(6px);
  box-shadow: var(--shadow-sm);
}

.metric-card span {
  font-size: 0.72rem;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 700;
}

.metric-card strong {
  font-family: var(--font-display);
  font-size: clamp(1.3rem, 1.05rem + 0.8vw, 1.8rem);
  line-height: 1.1;
  color: #0f172a;
}

.metric-card small {
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.2;
}

.monitoring-panel {
  display: grid;
  gap: 0.75rem;
}

.monitoring-head-status {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.monitoring-head-usage {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 600;
}

.monitoring-grid {
  display: grid;
  gap: 0.6rem;
}

.monitoring-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.monitoring-summary {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  min-width: 0;
}

.monitoring-summary__label {
  color: #64748b;
  font-size: 0.82rem;
  white-space: nowrap;
}

.monitoring-summary strong {
  color: #0f172a;
  font-size: 0.88rem;
  line-height: 1.25;
  word-break: break-word;
}

.monitoring-targets {
  display: grid;
  gap: 0.7rem;
}

.monitoring-target-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.7rem 1rem;
  border: 1px solid var(--border);
  background: var(--surface-2);
  border-radius: var(--radius);
  padding: 0.75rem 0.85rem;
}

.monitoring-target-card.is-inactive {
  opacity: 0.9;
}

.monitoring-target-card__main {
  min-width: 0;
  display: grid;
  gap: 0.4rem;
}

.monitoring-target-card__main a {
  color: #0f172a;
  font-size: 0.9rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.monitoring-target-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.7rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.monitoring-target-card__meta .pill {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.52rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #ffffff;
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.monitoring-target-card__diff {
  font-size: 0.8rem;
  color: #334155;
}

.diff-pill {
  display: inline-flex;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 600;
}

.diff-pill--worsening {
  background: rgba(220, 38, 38, 0.12);
  color: #991b1b;
  border-color: rgba(220, 38, 38, 0.25);
}

.diff-pill--improving {
  background: rgba(22, 163, 74, 0.12);
  color: #166534;
  border-color: rgba(22, 163, 74, 0.24);
}

.diff-pill--neutral {
  background: rgba(71, 85, 105, 0.1);
  color: #334155;
  border-color: rgba(100, 116, 139, 0.3);
}

.status-alert--warning {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(217, 119, 6, 0.38);
  color: #92400e;
}

.monitoring-target-card__actions {
  display: grid;
  gap: 0.45rem;
  width: 128px;
}

.monitoring-empty {
  display: grid;
  gap: 0.7rem;
}

.monitoring-buy-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.monitoring-buy-actions--inline {
  justify-content: flex-end;
  margin-left: auto;
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
  max-height: calc(100vh - var(--dashboard-sticky-offset) - 0.5rem);
  min-height: 280px;
  min-width: 0;
  overflow: hidden;
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
  background: linear-gradient(125deg, #0f172a 0%, #111827 56%, #0b274f 100%);
  color: #e2e8f0;
  border: 1px solid #0b1220;
  border-radius: var(--radius-lg);
  padding: 2rem 2.2rem;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
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
  font-size: clamp(1.7rem, 1.28rem + 1.45vw, 2.45rem);
  line-height: 1.1;
  margin: 0 0 0.5rem;
  color: #f8fafc;
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

.page-hero .kicker {
  color: #93c5fd;
}

.hero-tags {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  font-size: 0.78rem;
  color: #cbd5e1;
}

.hero-tags span {
  border: 1px solid #1f2937;
  padding: 0.28rem 0.62rem;
  border-radius: var(--radius-pill);
  background: rgba(15, 23, 42, 0.45);
}

.page-hero__card {
  position: relative;
  z-index: 1;
  background: #ffffff;
  color: #0f172a;
  border-radius: var(--radius-md);
  padding: 1.05rem 1.1rem;
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
  border-radius: var(--radius-md);
  padding: 1.8rem;
  box-shadow: var(--shadow-sm);
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

.paid-banner.is-empty-credit {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(185, 28, 28, 0.1));
  border-color: rgba(180, 83, 9, 0.38);
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

.paid-banner.is-empty-credit .paid-banner__credits {
  border-color: rgba(180, 83, 9, 0.42);
  background: rgba(255, 251, 235, 0.9);
}

.paid-banner.is-empty-credit .paid-banner__credits strong {
  color: #9a3412;
}

.paid-banner__actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.paid-banner__cta {
  padding: 0.5rem 0.95rem;
  box-shadow: 0 10px 18px rgba(29, 78, 216, 0.25);
  white-space: nowrap;
}

[data-theme='dark'] .paid-banner {
  background: linear-gradient(135deg, rgba(8, 47, 73, 0.55), rgba(14, 116, 144, 0.34));
  border-color: rgba(56, 189, 248, 0.38);
}

[data-theme='dark'] .paid-banner.is-empty-credit {
  background: linear-gradient(135deg, rgba(120, 53, 15, 0.54), rgba(127, 29, 29, 0.38));
  border-color: rgba(251, 191, 36, 0.42);
}

[data-theme='dark'] .paid-banner__credits {
  background: rgba(15, 23, 42, 0.88);
  border-color: rgba(148, 163, 184, 0.42);
  color: #cbd5e1;
}

[data-theme='dark'] .paid-banner__credits strong {
  color: #e2e8f0;
}

[data-theme='dark'] .paid-banner.is-empty-credit .paid-banner__credits {
  background: rgba(69, 26, 3, 0.55);
  border-color: rgba(251, 191, 36, 0.46);
}

[data-theme='dark'] .paid-banner.is-empty-credit .paid-banner__credits strong {
  color: #fde68a;
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
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: #0f172a;
  box-shadow: none;
}

.audit-history .btn-filter-clear:hover {
  background: #e2e8f0;
}

.history-actions {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

[data-theme='dark'] .audit-history .btn-filter-clear {
  background: #101b2e;
  border-color: #3b4f6e;
  color: #dbe7fb;
}

[data-theme='dark'] .audit-history .btn-filter-clear:hover {
  background: #17243a;
  border-color: #5476a3;
}

[data-theme='dark'] .monitoring-target-card {
  background: #13233c;
  border-color: #2b3d5a;
}

[data-theme='dark'] .monitoring-target-card__main a,
[data-theme='dark'] .monitoring-summary strong {
  color: #dbe7fb;
}

[data-theme='dark'] .monitoring-target-card__meta {
  color: #a7b6cb;
}

[data-theme='dark'] .monitoring-target-card__meta .pill {
  background: #0f1c31;
  border-color: #334862;
  color: #bfdbfe;
}

[data-theme='dark'] .monitoring-target-card__diff {
  color: #cbd5e1;
}

[data-theme='dark'] .diff-pill--worsening {
  background: rgba(220, 38, 38, 0.2);
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.4);
}

[data-theme='dark'] .diff-pill--improving {
  background: rgba(22, 163, 74, 0.22);
  color: #bbf7d0;
  border-color: rgba(74, 222, 128, 0.35);
}

[data-theme='dark'] .diff-pill--neutral {
  background: rgba(51, 65, 85, 0.45);
  color: #e2e8f0;
  border-color: rgba(148, 163, 184, 0.36);
}

[data-theme='dark'] .status-alert--warning {
  background: rgba(245, 158, 11, 0.2);
  border-color: rgba(251, 191, 36, 0.45);
  color: #fde68a;
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

/* Responsive */
@media (max-width: 1100px) {
  .metrics-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .monitoring-target-card {
    grid-template-columns: 1fr;
  }

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

  .metrics-strip {
    grid-template-columns: 1fr;
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

  .monitoring-target-card__actions {
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .monitoring-topline {
    align-items: stretch;
    flex-direction: column;
  }

  .monitoring-buy-actions--inline {
    margin-left: 0;
    justify-content: flex-start;
    width: 100%;
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

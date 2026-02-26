<template>
  <div class="history-list">
    <div v-if="historyError" class="alert-error">{{ historyError }}</div>

    <article
      v-for="audit in auditHistory"
      :key="audit.id"
      class="history-card"
      :class="{ 'is-active': selectedAuditId === audit.id }"
      @click="selectAudit(audit.id)"
    >
      <div class="card-left">
        <div class="score-circle" :class="getScore(audit.summary).class">
          {{ getScore(audit.summary).value }}
        </div>

        <div class="card-content">
          <div class="url-text">
            {{ audit.url }}
          </div>

          <div class="meta-line">
            <span>{{ formatDate(audit.created_at) }}</span>
            <span class="dot-sep">•</span>
            <span class="pill-scope">{{ auditPillLabel(audit) }}</span>
            <span class="dot-sep">•</span>
            <span class="stat-critical">
              {{ issueHigh(audit.summary) }} kritických
            </span>
            <span class="dot-sep">•</span>
            <span class="stat-total">
              {{ issueTotal(audit.summary) }} spolu
            </span>
          </div>
        </div>
      </div>

      <div class="card-right" @click.stop>
        <div v-if="isMonitoringAudit(audit)" class="monitor-tag">
          <span class="dot"></span>
          Aktívny
        </div>

        <button
          v-else-if="canMonitorAudit(audit)"
          class="btn-monitor"
          :disabled="monitoringLoadingAction"
          @click="handleRunMonitoringForAudit(audit)"
        >
          {{ monitoringLoadingAction ? '...' : 'Monitorovať' }}
        </button>
      </div>
    </article>

    <div 
      v-if="historyHasMore" 
      ref="historySentinel" 
      class="sentinel"
    >
      <div v-if="historyLoadingMore" class="loader-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { DASHBOARD_HISTORY_TEXT } from './dashboard.copy'

const copy = DASHBOARD_HISTORY_TEXT

const props = defineProps<{
  auditHistory: any[]
  selectedAuditId: string | null
  historyHasMore: boolean
  historyLoadingMore: boolean
  historyLoading: boolean 
  historyError?: string
  monitoringLoadingAction: boolean
  monitoringActiveTargetUrls: string[]
  monitoringHasAccess: boolean
  monitoringCanAddTarget: boolean
  formatDate: (v?: string) => string
  issueTotal: (s: any) => number
  issueHigh: (s: any) => number
  selectAudit: (id: string) => void
  runMonitoringForAudit: (a: any) => void
  loadMoreHistory: () => void
}>()

/* ===== LOGIKA PRE INFINITE SCROLL ===== */

const historySentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

// Funkcia na inicializáciu/obnovu observera
const initObserver = () => {
  // Ak už observer existuje, zrušíme starý, aby sme nemali duplikáty
  if (observer) {
    observer.disconnect()
  }

  if (!historySentinel.value) return

  // Najdôležitejšia časť: Ak je komponent v Raili (bočnom paneli), 
  // root by mal byť ten div s overflow: auto.
  const scrollRoot = historySentinel.value.closest('.history-scroll')

  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry && entry.isIntersecting) {
        // Kontrola, či už niečo nenačítavame
        if (props.historyHasMore && !props.historyLoadingMore && !props.historyLoading) {
          props.loadMoreHistory()
        }
      }
    },
    {
      root: scrollRoot, 
      rootMargin: '150px 0px', // Načíta s predstihom 150px
      threshold: 0.01
    }
  )

  observer.observe(historySentinel.value)
}

// Sledujeme zmeny v histórii. Keď prídu prvé dáta po refreshi, 
// počkáme na DOM a pripojíme observer.
watch(
  () => props.auditHistory,
  async (newVal) => {
    if (newVal && newVal.length > 0) {
      await nextTick()
      initObserver()
    }
  },
  { deep: false }
)

// Sledujeme aj zmenu stavu "hasMore" - ak sa znova objaví sentinel
watch(() => props.historyHasMore, async (hasMore) => {
  if (hasMore) {
    await nextTick()
    initObserver()
  }
})

onMounted(() => {
  initObserver()
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})

/* ===== POMOCNÉ FUNKCIE (Zostávajú rovnaké) ===== */

const auditPillLabel = (audit: any) => {
  if (audit.scope === 'site') return copy.pillSite
  return audit.audit_kind === 'paid' ? copy.pillPaid : copy.pillFree
}

const getScore = (summary: any) => {
  if (!summary?.byImpact) return { value: 100, class: 'score-good' }
  const s = summary.byImpact
  const penalty = (s.critical || 0) * 18 + (s.serious || 0) * 10 + (s.moderate || 0) * 5 + (s.minor || 0) * 2
  const score = Math.max(0, Math.round(100 / (1 + penalty / 60)))
  if (score >= 80) return { value: score, class: 'score-good' }
  if (score >= 50) return { value: score, class: 'score-medium' }
  return { value: score, class: 'score-bad' }
}

const normalize = (u: string) => (u || '').trim().replace(/\/+$/, '').toLowerCase()
const isMonitoringAudit = (audit: any) => {
  const normalized = normalize(audit.url)
  return props.monitoringActiveTargetUrls?.some(u => normalize(u) === normalized)
}
const canMonitorAudit = (audit: any) => props.monitoringHasAccess && !isMonitoringAudit(audit) && props.monitoringCanAddTarget
const handleRunMonitoringForAudit = (audit: any) => props.runMonitoringForAudit(audit)
</script>

<style scoped>
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

/* DEFINÍCIA PREMENNÝCH */
.history-card {
  --card-bg: #ffffff;
  --card-border: #e2e8f0;
  --card-hover-bg: #f8fafc;
  --card-hover-border: #cbd5e1;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --active-bg: rgba(37, 99, 235, 0.06);
  --active-border: #2563eb;

  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.15s ease;
}

/* DARK MODE PREPIS PREMENNÝCH */
[data-theme='dark'] .history-card {
  --card-bg: #1e293b;
  --card-border: #334155;
  --card-hover-bg: #334155;
  --card-hover-border: #475569;
  --text-main: #f1f5f9;
  --text-muted: #94a3b8;
  --active-bg: rgba(37, 99, 235, 0.2);
  --active-border: #3b82f6;
}

.history-card:hover {
  border-color: var(--card-hover-border);
  background: var(--card-hover-bg);
}

.history-card.is-active {
  border-color: var(--active-border);
  background: var(--active-bg);
}

.card-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.score-circle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Score farby vylepšené pre Dark Mode pomocou jemnejšieho pozadia */
.score-good { 
  background: #ecfdf5; color: #065f46; border: 1px solid #10b981; 
}
[data-theme='dark'] .score-good { background: rgba(16, 185, 129, 0.2); color: #34d399; }

.score-medium { 
  background: #fffbeb; color: #92400e; border: 1px solid #f59e0b; 
}
[data-theme='dark'] .score-medium { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }

.score-bad { 
  background: #fef2f2; color: #991b1b; border: 1px solid #ef4444; 
}
[data-theme='dark'] .score-bad { background: rgba(239, 68, 68, 0.2); color: #f87171; }

.card-content { min-width: 0; flex: 1; }

.url-text { 
  font-weight: 600; 
  font-size: 0.85rem; 
  color: var(--text-main); 
  word-break: break-all; 
}

.meta-line { 
  font-size: 0.72rem; 
  color: var(--text-muted); 
  display: flex; 
  flex-wrap: wrap; 
  gap: 4px; 
  align-items: center; 
}

.dot-sep { opacity: 0.4; }
.stat-critical { color: #f87171; font-weight: 600; } 
[data-theme='dark'] .stat-critical { color: #fb7185; }

.pill-scope { font-weight: 600; text-transform: uppercase; font-size: 0.65rem; }

.monitor-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 0.7rem; font-weight: 600; color: #10b981; }
.monitor-tag .dot { width: 6px; height: 6px; background: #10b981; border-radius: 50%; }

.btn-monitor {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-monitor:hover {
  border-color: #2563eb;
  color: #2563eb;
}

.sentinel { height: 30px; display: flex; align-items: center; justify-content: center; width: 100%; }
.loader-dots { display: flex; gap: 4px; }
.loader-dots span { width: 6px; height: 6px; background: var(--text-muted); border-radius: 50%; animation: blink 1.4s infinite both; }

@keyframes blink { 0%, 80%, 100% { opacity: 0; } 40% { opacity: 1; } }
</style>
<template>
  <div class="issue-list">
    <article 
      v-for="(violation, index) in filteredIssues" 
      :key="violationKey(violation, index)" 
      class="issue-card" 
      :class="[impactClass(violation.impact || ''), { 'is-expanded': isOpen(violationKey(violation, index)) }]"
    >
      <div class="issue-header" @click="toggleDetails(violationKey(violation, index))">
        <div class="header-main">
          <div class="meta-badges">
            <span class="impact-pill" :class="impactClass(violation.impact || '')">
              {{ getImpactLabel(violation.impact) }}
            </span>
            <span class="wcag-label">{{ violation.wcag }} <span class="dot">·</span> {{ violation.wcagLevel }}</span>
          </div>
          <h6 class="issue-title">{{ titleForLocale(violationKey(violation, index), violation) }}</h6>
        </div>

        <div class="header-right">
          <div class="stats-pills">
            <div class="s-pill" title="Počet strán">
              <svg class="s-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/></svg>
              <span>{{ resolvedPagesCount(violation) }}</span>
            </div>
            <div class="s-pill" title="Počet výskytov">
              <svg class="s-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              <span>{{ resolvedOccurrences(violation) }}</span>
            </div>
          </div>
          <button v-if="!isPreview" class="btn-expand-circle">
            <svg class="chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          </button>
        </div>
      </div>

      <div class="issue-content-brief">
        <div class="locale-switcher" v-if="availableLocales(violation).length > 1">
          <button 
            v-for="locale in availableLocales(violation)" 
            :key="locale" 
            class="loc-btn"
            :class="{ active: selectedLocale(violationKey(violation, index), violation) === locale }"
            @click.stop="setLocale(violationKey(violation, index), locale)"
          >
            {{ locale.toUpperCase() }}
          </button>
        </div>
        <p class="issue-desc">{{ descriptionForLocale(violationKey(violation, index), violation) }}</p>
      </div>

      <div v-if="!isPreview && isOpen(violationKey(violation, index))" class="issue-details-pane">
        <div class="recommendation-card">
          <div class="rec-icon">✨</div>
          <div class="rec-body">
            <label>Odporúčanie pre nápravu</label>
            <p>{{ recommendationForLocale(violationKey(violation, index), violation) }}</p>
          </div>
        </div>

        <div class="inspector-layout">
          <aside class="url-sidebar">
            <div class="pane-label">Zasiahnuté stránky</div>
            <div class="url-list-wrapper"> <div class="url-list-scroll">
                <button 
                  v-for="detail in urlDetails(violation)" 
                  :key="detail.url"
                  class="url-item-btn"
                  :class="{ active: selectedUrl(violationKey(violation, index), violation) === detail.url }"
                  @click="selectUrl(violationKey(violation, index), detail.url)"
                >
                  <span class="host">{{ friendlyHost(detail.url) }}</span>
                  <span class="path">{{ friendlyPath(detail.url) }}</span>
                </button>
              </div>
            </div> 
          </aside>

          <main class="node-inspector">
            <div v-if="activeUrlDetail(violationKey(violation, index), violation)" class="inspector-content">
              <div class="active-url-header">
                <span class="u-label">Aktuálna URL</span>
                <div class="u-value">
                  <code>{{ activeUrlDetail(violationKey(violation, index), violation)?.url }}</code>
                </div>
              </div>

              <div class="nodes-container">
                <div v-for="(node, nIndex) in activeUrlDetail(violationKey(violation, index), violation)?.nodes || []" :key="nIndex" class="node-card">
                  <div class="node-card-header">
                    <span class="node-idx">#{{ nIndex + 1 }}</span>
                    <span class="node-target-name">{{ describeTarget(node.target) }}</span>
                  </div>
                  
                  <div class="code-section">
                    <div class="code-meta">
                      <span>CSS Selektor</span>
                      <button class="btn-copy" @click="copyText(formatTarget(node.target), $event)">
                        <svg class="copy-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>
                        <span>Copy</span>
                      </button>
                    </div>
                    <pre><code>{{ formatTarget(node.target) }}</code></pre>
                  </div>
                  <div v-if="node.failureSummary" class="failure-box">
                    <div class="failure-icon">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0v4a1 1 0 11-2 0V6zm1 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>
                    </div>
                    <div class="failure-body">
                      <span class="failure-label">Analýza nálezu</span>
                      <p class="failure-text">{{ node.failureSummary }}</p>
                    </div>
                  </div>

                  <div v-if="node.html" class="code-section html">
                    <div class="code-meta">
                      <span>HTML Zdroj</span>
                      <button class="btn-copy" @click="copyText(node.html, $event)">
                        <svg class="copy-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>
                        <span>Copy</span>
                      </button>
                    </div>
                    <pre><code>{{ node.html }}</code></pre>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { DashboardIssue, DashboardIssueNode } from './dashboard.types'
import { IMPACT_LABELS } from './dashboard.copy'
import { describeTarget, formatTarget } from './useDashboardTargets'

const props = defineProps<{
  filteredIssues: DashboardIssue[]
  isPreview: boolean
  impactClass: any
  violationKey: any
  isOpen: any
  toggleDetails: any
}>()

const urlSelection = ref<Record<string, string>>({})
const localeSelection = ref<Record<string, string>>({})

const copyText = async (text: string, event: MouseEvent) => {
  const btn = event.currentTarget as HTMLButtonElement
  const originalHtml = btn.innerHTML
  try {
    await navigator.clipboard.writeText(text)
    btn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" style="width:14px"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg> <span>Hotovo!</span>`
    btn.classList.add('is-success')
    setTimeout(() => {
      btn.innerHTML = originalHtml
      btn.classList.remove('is-success')
    }, 2000)
  } catch (err) { console.error('Copy failed', err) }
}

const getImpactLabel = (impact?: string) => IMPACT_LABELS[impact as keyof typeof IMPACT_LABELS] || impact || 'Neurčené'
const friendlyHost = (v: string) => { try { return new URL(v).hostname } catch { return v } }
const friendlyPath = (v: string) => { try { const u = new URL(v); return u.pathname + u.search || '/' } catch { return v } }

const normalizedNodes = (value: unknown): DashboardIssueNode[] => {
  if (!Array.isArray(value)) return []
  return value.map(n => ({
    target: (n as any)?.target || [],
    html: (n as any)?.html || '',
    failureSummary: (n as any)?.failureSummary
  }))
}

const urlDetails = (issue: DashboardIssue) => {
  if (issue.urlDetails?.length) {
    return issue.urlDetails.map(i => ({ url: i.url || '', nodes: normalizedNodes(i.nodes) }))
  }
  return issue.urls?.length ? [{ url: issue.urls[0], nodes: normalizedNodes(issue.nodes) }] : []
}

const availableLocales = (i: any) => Object.keys(i.copy || {})
const selectedLocale = (key: string, i: any) => localeSelection.value[key] || 'sk'
const setLocale = (key: string, loc: string) => localeSelection.value[key] = loc
const copyForLocale = (i: any, key: string) => i.copy?.[selectedLocale(key, i)] || i.copy?.sk
const titleForLocale = (key: string, i: any) => copyForLocale(i, key)?.title || i.title
const descriptionForLocale = (key: string, i: any) => copyForLocale(i, key)?.description || i.description
const recommendationForLocale = (key: string, i: any) => copyForLocale(i, key)?.recommendation || i.recommendation
const resolvedOccurrences = (i: any) => i.occurrencesTotal ?? i.nodesCount ?? 0
const resolvedPagesCount = (i: any) => i.pagesCount || urlDetails(i).length
const selectedUrl = (key: string, i: any) => urlSelection.value[key] || urlDetails(i)[0]?.url
const selectUrl = (key: string, url: string) => urlSelection.value[key] = url
const activeUrlDetail = (key: string, i: any) => urlDetails(i).find(d => d.url === selectedUrl(key, i)) || urlDetails(i)[0]
</script>

<style scoped>
.issue-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2rem 0;
}

/* CARD BASE */
.issue-card {
  --impact-color: #64748b;
  --card-bg: #ffffff;
  --card-border: #e2e8f0;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --gradient-stop: rgba(255, 255, 255, 0);

  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  position: relative;
  min-width: 0;
}

.issue-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}


.impact-critical { --impact-color: #ef4444; --gradient-soft: rgba(239, 68, 68, 0.12); }
.impact-serious { --impact-color: #f97316; --gradient-soft: rgba(249, 115, 22, 0.12); }
.impact-moderate { --impact-color: #f59e0b; --gradient-soft: rgba(245, 158, 11, 0.12); }
.impact-minor { --impact-color: #3b82f6; --gradient-soft: rgba(59, 130, 246, 0.12); }

.issue-card::before {
  content: ''; position: absolute; top: 0; left: 0; bottom: 0; width: 4px;
  background: var(--impact-color); z-index: 2;
}


.issue-header {
  padding: 1.5rem; display: flex; justify-content: space-between;
  align-items: flex-start; cursor: pointer; gap: 1.5rem;
}

.meta-badges { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
.impact-pill {
  font-size: 0.65rem; font-weight: 800; text-transform: uppercase;
  padding: 0.3rem 0.75rem; border-radius: 20px; background: var(--impact-color); color: white;
}
.wcag-label {
  font-size: 0.75rem; font-weight: 600; color: var(--text-muted);
  background: #f1f5f9; padding: 0.2rem 0.6rem; border-radius: 6px;
}
.issue-title { margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-main); line-height: 1.4; }

/* STATS */
.header-right { display: flex; align-items: center; gap: 1rem; }
.stats-pills { display: flex; gap: 0.5rem; }
.s-pill {
  display: flex; align-items: center; gap: 0.4rem; background: #f8fafc;
  border: 1px solid #e2e8f0; padding: 0.4rem 0.75rem; border-radius: 10px;
  font-size: 0.85rem; font-weight: 700; color: var(--text-main);
}
.s-icon { width: 14px; height: 14px; color: var(--text-muted); }

.btn-expand-circle {
  width: 36px; height: 36px; border-radius: 50%; border: 1px solid #e2e8f0;
  background: white; display: flex; align-items: center; justify-content: center;
  transition: all 0.3s; color: var(--text-muted);
}
.is-expanded .btn-expand-circle { transform: rotate(180deg); background: var(--text-main); color: white; }


.issue-content-brief { padding: 0 1.5rem 1.5rem 1.5rem; position: relative; z-index: 1; }
.issue-desc { margin: 0; color: var(--text-muted); line-height: 1.6; max-width: 80ch; }
.locale-switcher { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.loc-btn {
  background: none; border: 1px solid #e2e8f0; font-size: 0.65rem;
  font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 4px; color: #94a3b8; cursor: pointer;
}
.loc-btn.active { background: var(--text-main); color: white; border-color: var(--text-main); }


.issue-details-pane { background: #fcfdfe; border-top: 1px solid #e2e8f0; padding: 2rem; }
.recommendation-card {
  background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;
  padding: 1.25rem; display: flex; gap: 1rem; margin-bottom: 2rem;
}
.rec-body p { margin: 0; color: #14532d; font-size: 0.95rem; line-height: 1.5; }


.inspector-layout { 
  display: grid; 
  grid-template-columns: 300px 1fr; 
  gap: 2rem; 
  align-items: stretch; 
}

.url-sidebar {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.url-list-wrapper {
  flex: 1;
  position: relative;
  min-height: 400px; 
}


.url-list-scroll { 
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto; 
  display: flex; 
  flex-direction: column; 
  gap: 0.5rem; 
  padding-right: 8px; 
}
.url-item-btn {
  text-align: left; 
  background: white; 
  border: 1px solid #e2e8f0; 
  padding: 1rem;
  border-radius: 12px; 
  cursor: pointer; 
  transition: all 0.2s; 
  display: flex; 
  flex-direction: column;
  font-size: 0.8rem;
}
.url-item-btn .path {
  word-break: break-all; /* Aby dlhé URL nerozťahovali sidebar */
  font-size: 0.7rem;
  opacity: 0.8;
}
.url-item-btn.active { border-color: #3b82f6; background: #eff6ff; box-shadow: inset 4px 0 0 #3b82f6; }

.node-inspector { min-width: 0; background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
.active-url-header { padding: 1.25rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
.nodes-container { padding: 1.5rem; display: flex; flex-direction: column; gap: 2rem; }
.node-card { border-bottom: 1px solid #f1f5f9; padding-bottom: 2rem; }

/* CODE & COPY */
.code-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.btn-copy {
  display: flex; align-items: center; gap: 0.4rem; background: #f1f5f9; border: none;
  padding: 0.3rem 0.6rem; border-radius: 6px; cursor: pointer; font-size: 0.7rem; font-weight: 700;
}
pre { background: #0f172a; color: #f8fafc; padding: 1.25rem; border-radius: 12px; overflow-x: auto; font-size: 0.85rem; border: 1px solid #1e293b; }
.failure-box {
  display: flex;
  gap: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: 3px solid #64748b; 
  padding: 1rem 1.25rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  transition: all 0.2s;
}

.failure-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  color: #94a3b8;
  margin-top: 2px;
}

.failure-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.failure-label {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.failure-text {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #334155;
}

  

[data-theme='dark'] .issue-card {
  --card-bg: #111a2e;
  --card-border: #1e293b;
  --text-main: #f1f5f9;
  --text-muted: #94a3b8;
  background: linear-gradient(115deg, var(--gradient-soft) 0%, var(--card-bg) 40%);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
}


[data-theme='dark'] .issue-card {
  --card-bg: #111a2e;
  --card-border: #1e293b;
  --text-main: #f1f5f9;
  --text-muted: #94a3b8;
  
 
  background: linear-gradient(115deg, var(--gradient-soft) 0%, var(--card-bg) 45%);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
}

/* Header & Interaktivita */
[data-theme='dark'] .issue-header:hover {
  background: rgba(255, 255, 255, 0.02);
}

[data-theme='dark'] .wcag-label {
  background: #1e293b;
  color: #cbd5e1;
}

[data-theme='dark'] .s-pill {
  background: #1e293b;
  border-color: #334155;
  color: #f1f5f9;
}

[data-theme='dark'] .btn-expand-circle {
  background: #1e293b;
  border-color: #334155;
  color: #94a3b8;
}

[data-theme='dark'] .is-expanded .btn-expand-circle {
  background: var(--text-main);
  color: #0f172a;
}

/* Detailný panel a Sidebar */
[data-theme='dark'] .issue-details-pane {
  background: #0b1120;
  border-color: #1e293b;
}

[data-theme='dark'] .url-item-btn {
  background: #111a2e;
  border-color: #1e293b;
}

[data-theme='dark'] .url-item-btn:hover {
  background: #1e293b;
  border-color: #334155;
}

[data-theme='dark'] .url-item-btn.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
}

/* Inšpektor a kód */
[data-theme='dark'] .node-inspector {
  background: #111a2e;
  border-color: #1e293b;
}

[data-theme='dark'] .active-url-header {
  background: #0b1120;
  border-color: #1e293b;
}

[data-theme='dark'] .btn-copy {
  background: #1e293b;
  color: #cbd5e1;
}

[data-theme='dark'] .btn-copy:hover {
  background: #334155;
}

/* Upravené boxy (Recommendation & Failure) */
[data-theme='dark'] .recommendation-card {
  background: rgba(22, 101, 52, 0.15);
  border-color: #065f46;
}

[data-theme='dark'] .rec-body p {
  color: #dcfce7;
}

[data-theme='dark'] .failure-box {
  background: rgba(30, 41, 59, 0.5); 
  border-color: #334151;
  border-left-color: #475569;
}

[data-theme='dark'] .failure-text {
  color: #cbd5e1;
}

[data-theme='dark'] .failure-label {
  color: #94a3b8;
}

[data-theme='dark'] .failure-icon {
  color: #475569;
}


[data-theme='dark'] .url-list-scroll::-webkit-scrollbar-track {
  background: #0b1120;
}

[data-theme='dark'] .url-list-scroll::-webkit-scrollbar-thumb {
  background: #1e293b;
  border-radius: 10px;
}


@media (max-width: 1024px) {
  .inspector-layout { grid-template-columns: 1fr; }
  .header-right { flex-direction: column; align-items: flex-end; }
}
</style>
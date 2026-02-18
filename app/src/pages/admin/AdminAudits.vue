<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '@/services/supabase'

type Impact = 'critical' | 'serious' | 'moderate' | 'minor'

type AuditSummary = {
  total: number
  byImpact: Record<Impact, number>
}

type AuditListItem = {
  id: string
  userId: string
  url: string
  auditKind: string
  createdAt: string
  summary: AuditSummary
  topIssuesCount: number
  profile: {
    email: string | null
    consentMarketing: boolean
    plan: string
  }
}

type AuditDetail = {
  id: string
  url: string
  auditKind: string
  createdAt: string
  summary: AuditSummary
  profile: {
    email: string | null
    consentMarketing: boolean
    plan: string
  }
  fullIssues: Array<{
    id: string
    title: string
    impact: Impact
    description: string
    recommendation?: string
    wcag?: string
    wcagLevel?: string
    principle?: string
    nodesCount?: number
  }>
}

const loading = ref(false)
const error = ref('')
const audits = ref<AuditListItem[]>([])
const detailLoading = ref(false)
const detailError = ref('')
const selectedAuditId = ref<string | null>(null)
const selectedAudit = ref<AuditDetail | null>(null)

const formatDate = (value: string) => value?.slice(0, 10) || ''

const impactCount = (summary?: AuditSummary) => {
  if (!summary) return 0
  return (summary.byImpact.critical || 0) + (summary.byImpact.serious || 0)
}

const fetchAudits = async () => {
  loading.value = true
  error.value = ''
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) throw new Error('Chyba prihlasenie.')

    const response = await fetch('/.netlify/functions/admin-audits', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data?.error || 'Nacitanie auditov zlyhalo.')
    }

    const data = await response.json()
    audits.value = data?.audits || []
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const fetchDetail = async (auditId: string) => {
  detailLoading.value = true
  detailError.value = ''
  selectedAudit.value = null
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) throw new Error('Chyba prihlasenie.')

    const response = await fetch(`/.netlify/functions/admin-audit-detail?id=${auditId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data?.error || 'Detail auditu sa nepodarilo nacitat.')
    }

    const data = await response.json()
    selectedAudit.value = data?.audit || null
  } catch (err: any) {
    detailError.value = err.message
  } finally {
    detailLoading.value = false
  }
}

const openDetail = (auditId: string) => {
  selectedAuditId.value = auditId
  void fetchDetail(auditId)
}

onMounted(() => {
  void fetchAudits()
})
</script>

<template>
  <div class="admin-page">
    <section class="admin-hero">
      <div>
        <span class="kicker">Admin</span>
        <h1>Audit prehlad</h1>
        <p class="lead">Kontrola free auditov, detailne nalezy a marketing suhlasy.</p>
      </div>
      <button class="btn btn-outline" @click="fetchAudits" :disabled="loading">
        {{ loading ? 'Nacitam...' : 'Obnovit data' }}
      </button>
    </section>

    <div v-if="error" class="status-alert status-alert--danger">{{ error }}</div>

    <section class="admin-grid">
      <div class="panel">
        <div class="panel-head panel-head--tight">
          <div>
            <p class="kicker">Audity</p>
            <h2>Najnovsie audity</h2>
          </div>
        </div>

        <div v-if="loading" class="status-state status-state--loading">Nacitam audity...</div>
        <div v-else-if="audits.length === 0" class="status-state">Zatial ziadne audity.</div>

        <div v-else class="audit-list">
          <article v-for="audit in audits" :key="audit.id" class="audit-card">
            <div class="audit-head">
              <div>
                <div class="audit-title">{{ audit.url }}</div>
                <div class="audit-meta">
                  <span>{{ formatDate(audit.createdAt) }}</span>
                  <span class="dot">•</span>
                  <span>{{ audit.auditKind }}</span>
                  <span class="dot">•</span>
                  <span>{{ audit.profile.email || 'neznamy email' }}</span>
                </div>
              </div>
              <button class="btn btn-sm btn-outline" @click="openDetail(audit.id)">
                Detail
              </button>
            </div>
            <div class="audit-badges">
              <span class="pill" :class="audit.profile.consentMarketing ? 'pill-success' : 'pill-muted'">
                {{ audit.profile.consentMarketing ? 'marketing suhlas' : 'bez suhlasu' }}
              </span>
              <span class="pill pill-info">{{ audit.profile.plan }}</span>
            </div>
            <div class="audit-stats">
              <div>
                <strong>{{ audit.summary.total }}</strong>
                <span>spolu</span>
              </div>
              <div>
                <strong>{{ impactCount(audit.summary) }}</strong>
                <span>critical + serious</span>
              </div>
              <div>
                <strong>{{ audit.topIssuesCount }}</strong>
                <span>top issues</span>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div class="panel detail-panel">
        <div class="panel-head panel-head--tight">
          <div>
            <p class="kicker">Detail</p>
            <h2>Vybrany audit</h2>
          </div>
        </div>

        <div v-if="detailLoading" class="status-state status-state--loading">Nacitam detail...</div>
        <div v-else-if="detailError" class="status-alert status-alert--danger">{{ detailError }}</div>
        <div v-else-if="!selectedAudit" class="status-state">
          Vyber audit na zobrazenie detailu.
        </div>

        <div v-else class="detail-body">
          <div class="detail-head">
            <div>
              <div class="detail-title">{{ selectedAudit.url }}</div>
              <div class="detail-meta">
                <span>{{ formatDate(selectedAudit.createdAt) }}</span>
                <span class="dot">•</span>
                <span>{{ selectedAudit.auditKind }}</span>
                <span class="dot">•</span>
                <span>{{ selectedAudit.profile.email || 'neznamy email' }}</span>
              </div>
            </div>
            <div class="detail-badges">
              <span class="pill" :class="selectedAudit.profile.consentMarketing ? 'pill-success' : 'pill-muted'">
                {{ selectedAudit.profile.consentMarketing ? 'marketing suhlas' : 'bez suhlasu' }}
              </span>
              <span class="pill pill-info">{{ selectedAudit.profile.plan }}</span>
            </div>
          </div>

          <div class="detail-summary">
            <div>
              <strong>{{ selectedAudit.summary.total }}</strong>
              <span>spolu</span>
            </div>
            <div>
              <strong>{{ impactCount(selectedAudit.summary) }}</strong>
              <span>critical + serious</span>
            </div>
            <div>
              <strong>{{ selectedAudit.summary.byImpact.moderate }}</strong>
              <span>moderate</span>
            </div>
            <div>
              <strong>{{ selectedAudit.summary.byImpact.minor }}</strong>
              <span>minor</span>
            </div>
          </div>

          <div class="detail-issues">
            <h3>Nalezy</h3>
            <div v-if="selectedAudit.fullIssues.length === 0" class="status-state">
              Ziadne nalezy.
            </div>
            <article v-for="issue in selectedAudit.fullIssues" :key="issue.id" class="issue-card">
              <div class="issue-head">
                <span class="pill" :class="`pill-${issue.impact}`">{{ issue.impact }}</span>
                <strong>{{ issue.title }}</strong>
              </div>
              <p>{{ issue.description }}</p>
              <p v-if="issue.recommendation"><strong>Odporucanie:</strong> {{ issue.recommendation }}</p>
              <small>WCAG: {{ issue.wcag || 'N/A' }} · Uroven: {{ issue.wcagLevel || 'N/A' }}</small>
            </article>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-page {
  display: grid;
  gap: 2rem;
}

.admin-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  background: linear-gradient(135deg, #0f172a 0%, #111827 100%);
  color: #e2e8f0;
  border-radius: var(--radius);
  padding: 2rem 2.2rem;
  border: 1px solid #0b1220;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
}

.admin-hero h1 {
  margin: 0 0 0.5rem;
}

.admin-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 1.6rem;
  align-items: start;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.6rem;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
}

.panel-head--tight {
  margin-bottom: 1rem;
}

.audit-list {
  display: grid;
  gap: 1rem;
}

.audit-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem 1.1rem;
  display: grid;
  gap: 0.8rem;
}

.audit-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.audit-title {
  font-weight: 700;
  color: #0f172a;
}

.audit-meta {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  color: #64748b;
  font-size: 0.85rem;
}

.audit-badges {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.audit-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
}

.audit-stats strong {
  display: block;
  font-size: 1.2rem;
  color: #0f172a;
}

.audit-stats span {
  font-size: 0.8rem;
  color: #64748b;
}

.detail-panel {
  position: sticky;
  top: 1rem;
}

.detail-body {
  display: grid;
  gap: 1.2rem;
}

.detail-head {
  display: grid;
  gap: 0.6rem;
}

.detail-title {
  font-weight: 700;
  color: #0f172a;
}

.detail-meta {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  color: #64748b;
  font-size: 0.85rem;
}

.detail-badges {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.detail-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.detail-summary strong {
  font-size: 1.1rem;
  color: #0f172a;
}

.detail-summary span {
  display: block;
  font-size: 0.8rem;
  color: #64748b;
}

.detail-issues {
  display: grid;
  gap: 0.8rem;
}

.issue-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.9rem 1rem;
  display: grid;
  gap: 0.5rem;
}

.issue-head {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.pill {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 700;
}

.pill-success {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
  border-color: rgba(34, 197, 94, 0.3);
}

.pill-muted {
  background: rgba(148, 163, 184, 0.2);
  color: #475569;
  border-color: rgba(148, 163, 184, 0.3);
}

.pill-info {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.3);
}

.pill-critical {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.3);
}

.pill-serious {
  background: rgba(194, 65, 12, 0.12);
  color: #9a3412;
  border-color: rgba(194, 65, 12, 0.3);
}

.pill-moderate {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.3);
}

.pill-minor {
  background: rgba(2, 132, 199, 0.12);
  color: #0284c7;
  border-color: rgba(2, 132, 199, 0.3);
}

.dot {
  opacity: 0.5;
}

.btn {
  border-radius: var(--radius);
  font-weight: 600;
  padding: 0.55rem 1.2rem;
}

.btn-outline {
  border: 1px solid var(--border);
  background: transparent;
  color: #0f172a;
}

.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
}

.kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
  color: #94a3b8;
  font-weight: 700;
}

.lead {
  color: #cbd5f5;
}

@media (max-width: 1100px) {
  .admin-grid {
    grid-template-columns: 1fr;
  }

  .detail-panel {
    position: static;
  }
}
</style>

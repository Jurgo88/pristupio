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
      <h2 v-if="auth.paidAuditCompleted">Základný audit už bol použitý.</h2>
      <h2 v-else>Máte aktivovaný základný audit.</h2>
      <p class="lead" v-if="auth.paidAuditCompleted">
        Ak potrebujete ďalší audit alebo nový web, ozvite sa nám a pripravíme ďalší balík.
      </p>
      <p class="lead" v-else>
        Môžete spustiť jeden audit a získať plný report, odporúčania a export PDF.
      </p>
    </section>

    <section class="panel audit-form">
      <div class="panel-head">
        <div>
          <p class="kicker">Spustenie auditu</p>
          <h2>Spustiť nový WCAG audit</h2>
          <p class="lead">
            Vyhodnotíme váš web podľa WCAG 2.1 AA a pripravíme prioritizovaný zoznam problémov.
          </p>
        </div>
      </div>

      <div class="form-grid">
        <div class="field">
          <label class="field-label" for="audit-url">Webstránka na analýzu</label>
          <div class="input-row">
            <input
              id="audit-url"
              v-model="targetUrl"
              type="url"
              class="field-control"
              placeholder="https://priklad.sk"
              :disabled="auditLocked"
              @keyup.enter="handleStartAudit"
            />
            <button class="btn btn-primary" @click="handleStartAudit" :disabled="!canRunAudit">
              <span v-if="auditStore.loading" class="spinner-border spinner-border-sm"></span>
              {{ auditStore.loading ? 'Auditujem...' : 'Analyzovať web' }}
            </button>
          </div>
          <p class="field-hint">Vhodné pre weby, aplikácie a digitálne služby.</p>
        </div>

        <div class="field">
          <label class="field-label">Profil legislatívy</label>
          <div class="profile-toggle">
            <label
              v-for="option in profileOptions"
              :key="option.value"
              class="profile-option"
              :class="{ 'is-selected': selectedProfile === option.value }"
            >
              <input
                type="radio"
                name="profile"
                :value="option.value"
                v-model="selectedProfile"
                :disabled="auditLocked"
              />
              <span>
                <strong>{{ option.title }}</strong>
                <span class="sub">{{ option.subtitle }}</span>
              </span>
            </label>
          </div>
        </div>

        <div v-if="auditStore.error" class="form-error">{{ auditStore.error }}</div>
        <div v-if="auditLockedMessage" class="form-error">{{ auditLockedMessage }}</div>
      </div>
    </section>

    <section v-if="auditStore.report" class="stats-grid">
      <article class="stat-card stat-critical">
        <div class="stat-label">Critical & Serious</div>
        <div class="stat-value">{{ highCount }}</div>
        <div class="stat-meta">Najvyššia priorita</div>
      </article>
      <article class="stat-card stat-moderate">
        <div class="stat-label">Moderate</div>
        <div class="stat-value">{{ medCount }}</div>
        <div class="stat-meta">Vyžaduje plán opráv</div>
      </article>
      <article class="stat-card stat-minor">
        <div class="stat-label">Minor</div>
        <div class="stat-value">{{ lowCount }}</div>
        <div class="stat-meta">Nižší dopad</div>
      </article>
    </section>

    <section v-if="auditStore.report" class="report-preview">
      <div class="report-preview__copy">
        <p class="kicker">Prehľad reportu</p>
        <h2>Index pripravenosti</h2>
        <p class="lead">
          Skóre vychádza z pomeru závažností problémov. Čím menej kritických nálezov, tým vyššia
          pripravenosť.
        </p>
      </div>
      <div class="hero-mockup">
        <div class="mockup-header">
          <div class="mockup-title">Audit report</div>
          <div class="mockup-pill">WCAG 2.1 AA</div>
        </div>
        <div class="mockup-score">
          <div class="score-circle">{{ auditScore }}</div>
          <div class="score-meta">
            <strong>Prístupnosť</strong>
            <span>Index pripravenosti</span>
          </div>
        </div>
        <div class="mockup-bars">
          <div class="bar">
            <span>Critical & Serious</span>
            <div class="bar-track">
              <div class="bar-fill critical" :style="{ width: criticalPercent + '%' }"></div>
            </div>
            <small>{{ highCount }} problémov</small>
          </div>
          <div class="bar">
            <span>Moderate</span>
            <div class="bar-track">
              <div class="bar-fill moderate" :style="{ width: moderatePercent + '%' }"></div>
            </div>
            <small>{{ medCount }} problémov</small>
          </div>
          <div class="bar">
            <span>Minor</span>
            <div class="bar-track">
              <div class="bar-fill minor" :style="{ width: minorPercent + '%' }"></div>
            </div>
            <small>{{ lowCount }} problémov</small>
          </div>
        </div>
      </div>
    </section>

    <section class="panel issues-panel">
      <div class="panel-head panel-head--tight">
        <div>
          <p class="kicker">Nálezy</p>
          <h2>Nájdené problémy (WCAG 2.1)</h2>
        </div>
        <button
          class="btn btn-sm btn-export"
          :disabled="!auditStore.report || exporting || isPreview"
          @click="exportPdf"
        >
          <span v-if="exporting" class="spinner-border spinner-border-sm"></span>
          {{ exporting ? 'Exportujem...' : 'Export PDF' }}
        </button>
      </div>

      <div class="filters">
        <div class="field">
          <label class="field-label">Princíp</label>
          <select v-model="selectedPrinciple" class="field-control" :disabled="!auditStore.report || isPreview">
            <option value="">Všetky</option>
            <option v-for="p in principleOptions" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">Závažnosť</label>
          <select v-model="selectedImpact" class="field-control" :disabled="!auditStore.report || isPreview">
            <option value="">Všetky</option>
            <option value="critical">Critical</option>
            <option value="serious">Serious</option>
            <option value="moderate">Moderate</option>
            <option value="minor">Minor</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">Hľadať</label>
          <input
            v-model="searchText"
            class="field-control"
            type="text"
            placeholder="Napr. kontrast, tlačidlo, aria"
            :disabled="!auditStore.report || isPreview"
          />
        </div>
        <div class="field field--actions">
          <button
            class="btn btn-sm btn-filter-clear"
            @click="clearFilters"
            :disabled="!auditStore.report || isPreview"
          >
            Zrušiť filtre
          </button>
        </div>
      </div>

      <div v-if="exportError" class="form-error">{{ exportError }}</div>

      <div v-if="!auditStore.report" class="empty-state empty-state--hint">
        Spustite audit, aby sa zobrazili nálezy a detailné odporúčania.
      </div>

      <div v-else-if="auditStore.report.issues.length === 0" class="empty-state">
        Nenašli sa žiadne prístupnostné chyby.
      </div>

      <div v-else-if="filteredIssues.length === 0" class="empty-state">
        Žiadne chyby pre vybrané filtre.
      </div>

      <div v-else class="issue-list">
        <article
          v-for="(violation, index) in filteredIssues"
          :key="index"
          class="issue-card"
          :class="impactClass(violation.impact)"
        >
          <div class="issue-header">
            <div class="impact-pill" :class="impactClass(violation.impact)">
              {{ violation.impact }}
            </div>
            <h6 class="issue-title">{{ violation.title }}</h6>
            <button
              v-if="!isPreview"
              class="btn btn-outline btn-sm"
              @click="toggleDetails(violationKey(violation, index))"
            >
              {{ isOpen(violationKey(violation, index)) ? 'Skryť detail' : 'Zobraziť detail' }}
            </button>
          </div>
          <p class="issue-desc">{{ violation.description }}</p>
          <div class="issue-meta">
            <strong>WCAG:</strong> {{ violation.wcag || 'Neurčené' }} |
            <strong>Úroveň:</strong> {{ violation.wcagLevel || 'Neurčené' }} |
            <strong>Princíp:</strong> {{ violation.principle || 'Neurčené' }}
          </div>
          <div v-if="!isPreview" class="issue-meta">
            <strong>Odporúčanie:</strong>
            {{
              violation.recommendation ||
              'Skontrolujte problém manuálne a upravte HTML tak, aby spĺňalo WCAG.'
            }}
          </div>
          <small class="issue-count">Zasiahnutých elementov: {{ violation.nodesCount ?? 0 }}</small>

          <div v-if="!isPreview && isOpen(violationKey(violation, index))" class="issue-details">
            <div v-if="violation.nodesCount === 0" class="empty-inline">Nenašli sa konkrétne prvky.</div>
            <div v-for="(node, nIndex) in violation.nodes?.slice(0, 3) || []" :key="nIndex" class="node-detail">
              <div>{{ describeTarget(node.target) }}</div>
              <div class="node-code">
                <code>{{ formatTarget(node.target) }}</code>
              </div>
              <div v-if="node.failureSummary" class="node-note">
                {{ node.failureSummary }}
              </div>
              <div v-if="node.html" class="node-note">
                HTML: <code>{{ node.html }}</code>
              </div>
            </div>
            <div v-if="violation.nodesCount > 3" class="node-more">
              + ďalšie {{ violation.nodesCount - 3 }} elementy
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- <ManualChecklist :profile="selectedProfile" /> -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuditStore } from '@/stores/audit.store'
import { useAuthStore } from '@/stores/auth.store'
import ManualChecklist from '@/components/ManualChecklist.vue'
import { supabase } from '@/services/supabase'
import { buildLemonCheckoutUrl } from '@/utils/lemon'

const targetUrl = ref('')
const selectedProfile = ref<'wad' | 'eaa'>('wad')
const selectedPrinciple = ref('')
const selectedImpact = ref('')
const searchText = ref('')
const openDetails = ref<Record<string, boolean>>({})
const exporting = ref(false)
const exportError = ref('')
const auditStore = useAuditStore()
const auth = useAuthStore()
const route = useRoute()
const refreshPlanLoading = ref(false)
const paymentNotice = ref(false)
const auditCheckoutBase = import.meta.env.VITE_LEMON_AUDIT_CHECKOUT_URL || ''
const auditCheckoutUrl = computed(() => {
  if (!auth.user || !auditCheckoutBase) return ''
  return buildLemonCheckoutUrl({
    baseUrl: auditCheckoutBase,
    userId: auth.user.id,
    email: auth.user.email
  })
})
const isPreview = computed(() => auditStore.accessLevel === 'free')
const freeLimitReached = computed(() => auth.isLoggedIn && !auth.isPaid && auth.freeAuditUsed)
const paidLimitReached = computed(
  () => auth.isLoggedIn && auth.isPaid && auth.paidAuditCompleted && !auth.isAdmin
)
const auditLocked = computed(() => freeLimitReached.value || paidLimitReached.value)
const auditLockedMessage = computed(() => {
  if (paidLimitReached.value) {
    return 'Zakladny audit uz bol pouzity. Ak potrebujete dalsi audit, kontaktujte nas.'
  }
  if (freeLimitReached.value) {
    return 'Free audit uz bol pouzity. Pre plny report si objednajte zakladny audit.'
  }
  return ''
})
const showUpgrade = computed(
  () => auth.isLoggedIn && !auth.isPaid && (auth.freeAuditUsed || isPreview.value)
)
const showPaidStatus = computed(() => auth.isLoggedIn && auth.isPaid && !auth.isAdmin)

const refreshPlan = async () => {
  refreshPlanLoading.value = true
  try {
    await auth.fetchUserProfile()
  } finally {
    refreshPlanLoading.value = false
  }
}

const loadLatestAudit = async () => {
  if (!auth.isLoggedIn || auditStore.report) return
  const latest = await auditStore.fetchLatestAudit()
  if (latest?.url && !targetUrl.value.trim()) {
    targetUrl.value = latest.url
  }
}

onMounted(() => {
  if (route.query.paid === '1') {
    paymentNotice.value = true
    void refreshPlan()
  }
  void loadLatestAudit()
})

const profileOptions = [
  {
    value: 'wad',
    title: 'Verejný sektor (WAD 2016/2102)',
    subtitle: 'Weby a aplikácie verejných inštitúcií'
  },
  {
    value: 'eaa',
    title: 'Produkty a služby (EAA 2019/882)',
    subtitle: 'E-shopy, banky, doprava, digitálne služby'
  }
] as const

const canRunAudit = computed(
  () => targetUrl.value.trim().length > 0 && !auditStore.loading && !auditLocked.value
)
const profileLabel = computed(
  () => profileOptions.find((option) => option.value === selectedProfile.value)?.title || 'WCAG audit'
)

const handleStartAudit = async () => {
  const url = targetUrl.value.trim()
  if (!url) return
  await auditStore.runManualAudit(url)
}

const highCount = computed(() => {
  const byImpact = auditStore.report?.summary.byImpact
  return (byImpact?.critical || 0) + (byImpact?.serious || 0)
})

const totalIssues = computed(() => {
  const byImpact = auditStore.report?.summary.byImpact
  return (
    (byImpact?.critical || 0) +
    (byImpact?.serious || 0) +
    (byImpact?.moderate || 0) +
    (byImpact?.minor || 0)
  )
})

const medCount = computed(() => {
  return auditStore.report?.summary.byImpact.moderate || 0
})

const lowCount = computed(() => {
  return auditStore.report?.summary.byImpact.minor || 0
})

const auditScore = computed(() => {
  const byImpact = auditStore.report?.summary.byImpact
  if (!byImpact) return 0
  const total = totalIssues.value
  if (total === 0) return 100
  const penalty =
    (byImpact.critical || 0) * 18 +
    (byImpact.serious || 0) * 10 +
    (byImpact.moderate || 0) * 5 +
    (byImpact.minor || 0) * 2

  const score = 100 / (1 + penalty / 60)
  return Math.max(0, Math.round(score))
})

const criticalPercent = computed(() => {
  const total = totalIssues.value
  if (total === 0) return 0
  return Math.round((highCount.value / total) * 100)
})

const moderatePercent = computed(() => {
  const total = totalIssues.value
  if (total === 0) return 0
  return Math.round((medCount.value / total) * 100)
})

const minorPercent = computed(() => {
  const total = totalIssues.value
  if (total === 0) return 0
  return Math.round((lowCount.value / total) * 100)
})

const impactClass = (impact: string) => {
  if (impact === 'critical') return 'impact-critical'
  if (impact === 'serious') return 'impact-serious'
  if (impact === 'moderate') return 'impact-moderate'
  return 'impact-minor'
}

const principleOptions = computed(() => {
  const issues = auditStore.report?.issues || []
  const unique = new Set(issues.map((i: any) => i.principle).filter(Boolean))
  return Array.from(unique)
})

const filteredIssues = computed(() => {
  const issues = auditStore.report?.issues || []
  const term = searchText.value.trim().toLowerCase()

  const filtered = issues.filter((i: any) => {
    const principleOk = !selectedPrinciple.value || i.principle === selectedPrinciple.value
    const impactOk = !selectedImpact.value || i.impact === selectedImpact.value
    const text = `${i.title || ''} ${i.description || ''} ${i.recommendation || ''} ${i.wcag || ''} ${i.principle || ''}`.toLowerCase()
    const searchOk = !term || text.includes(term)
    return principleOk && impactOk && searchOk
  })
  const order: Record<string, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 }
  return filtered.sort((a: any, b: any) => {
    const aOrder = order[a.impact] ?? 99
    const bOrder = order[b.impact] ?? 99
    if (aOrder !== bOrder) return aOrder - bOrder
    return (b.nodesCount || 0) - (a.nodesCount || 0)
  })
})

const clearFilters = () => {
  selectedPrinciple.value = ''
  selectedImpact.value = ''
  searchText.value = ''
}

const violationKey = (violation: any, index: number) => `${violation.id}-${index}`

const toggleDetails = (key: string) => {
  openDetails.value = { ...openDetails.value, [key]: !openDetails.value[key] }
}

const isOpen = (key: string) => !!openDetails.value[key]

const buildSummary = (issues: any[]) => {
  const summary = {
    total: issues.length,
    byImpact: {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0
    }
  }

  issues.forEach((issue) => {
    const impact = issue?.impact
    if (impact && summary.byImpact[impact as keyof typeof summary.byImpact] !== undefined) {
      summary.byImpact[impact as keyof typeof summary.byImpact] += 1
    }
  })

  return summary
}

const buildFileName = () => {
  const date = new Date().toISOString().slice(0, 10)
  const rawUrl = targetUrl.value.trim()
  let host = 'web'

  if (rawUrl) {
    try {
      const withProtocol = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
      host = new URL(withProtocol).hostname
    } catch (error) {
      host = rawUrl
    }
  }

  host = host.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return `wcag-report-${host || 'web'}-${date}.pdf`
}

const exportPdf = async () => {
  if (!auditStore.report || exporting.value) return
  exporting.value = true
  exportError.value = ''

  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      throw new Error('Prihlaste sa, aby ste mohli exportovat report.')
    }

    const issues = filteredIssues.value
    const slimIssues = issues.map((issue: any) => ({
      id: issue.id,
      title: issue.title,
      impact: issue.impact,
      description: issue.description,
      recommendation: issue.recommendation,
      wcag: issue.wcag,
      wcagLevel: issue.wcagLevel,
      principle: issue.principle,
      helpUrl: issue.helpUrl,
      nodesCount: issue.nodesCount
    }))
    const payload = {
      url: targetUrl.value.trim(),
      profile: selectedProfile.value,
      profileLabel: profileLabel.value,
      filters: {
        principle: selectedPrinciple.value || null,
        impact: selectedImpact.value || null,
        search: searchText.value.trim() || null
      },
      report: {
        summary: buildSummary(slimIssues),
        issues: slimIssues
      }
    }

    const response = await fetch('/.netlify/functions/audit-export-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      let message = 'Export zlyhal.'
      try {
        const data = await response.json()
        if (data?.error) message = data.error
      } catch (error) {
        // ignore json parsing errors
      }
      throw new Error(message)
    }

    const blob = await response.blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = buildFileName()
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (error: any) {
    exportError.value = error?.message || 'Export sa nepodaril.'
  } finally {
    exporting.value = false
  }
}

const formatTarget = (target: string[]) => {
  if (!Array.isArray(target)) return ''
  return target.join(', ')
}

const describeTarget = (target: string[]) => {
  if (!Array.isArray(target) || target.length === 0) return 'Prvok na stránke'
  const selector = target[0]

  if (selector === 'html') return 'Dokument (html)'
  if (selector === 'body') return 'Telo stránky (body)'
  if (selector.includes('header')) return 'Hlavička stránky'
  if (selector.includes('nav')) return 'Navigácia'
  if (selector.includes('main')) return 'Hlavný obsah'
  if (selector.includes('footer')) return 'Pätička'
  if (selector.includes('section')) return 'Sekcia'
  if (selector.includes('form')) return 'Formulár'
  if (selector.includes('table')) return 'Tabuľka'
  if (selector.includes('thead') || selector.includes('th')) return 'Hlavička tabuľky'
  if (selector.includes('tbody') || selector.includes('td')) return 'Bunka tabuľky'
  if (selector.includes('ul') || selector.includes('ol')) return 'Zoznam'
  if (selector.includes('li')) return 'Položka zoznamu'
  if (selector.includes('iframe')) return 'Vložený obsah (iframe)'
  if (selector.includes('button')) return 'Tlačidlo'
  if (selector.includes('input')) return 'Formulárové pole'
  if (selector.includes('textarea')) return 'Textové pole'
  if (selector.includes('select')) return 'Výberové pole'
  if (selector.includes('a')) return 'Odkaz'
  if (selector.includes('img')) return 'Obrázok'
  if (selector.includes('h1')) return 'Nadpis úrovne 1'
  if (selector.includes('h2')) return 'Nadpis úrovne 2'
  if (selector.includes('h3')) return 'Nadpis úrovne 3'
  if (selector.includes('h4')) return 'Nadpis úrovne 4'
  if (selector.includes('h5')) return 'Nadpis úrovne 5'
  if (selector.includes('h6')) return 'Nadpis úrovne 6'
  if (selector.includes('.')) return 'Prvok s CSS triedou'
  if (selector.includes('#')) return 'Prvok s konkrétnym ID'
  return 'Prvok na stránke'
}
</script>

<style scoped>
.audit-page {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  gap: 2.5rem;
  padding: 0.5rem 0 4rem;
}

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

.hero-mockup {
  background: #0b1220;
  border-radius: var(--radius);
  border: 1px solid #1f2937;
  padding: 1.1rem 1.2rem;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.55);
  color: #e2e8f0;
}

.mockup-header {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.9rem;
}

.mockup-title {
  font-weight: 600;
}

.mockup-pill {
  font-size: 0.68rem;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius);
  border: 1px solid #334155;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.8);
}

.mockup-score {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.7rem;
  align-items: center;
  margin-bottom: 0.9rem;
}

.score-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #0b1220;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  box-shadow: 0 8px 18px rgba(22, 163, 74, 0.35);
}

.score-meta strong {
  color: #e2e8f0;
}

.score-meta span {
  display: block;
  color: #94a3b8;
  font-size: 0.8rem;
}

.mockup-bars {
  display: grid;
  gap: 0.65rem;
}

.bar {
  display: grid;
  gap: 0.3rem;
  font-size: 0.72rem;
  color: #94a3b8;
}

.bar-track {
  height: 7px;
  background: #111827;
  border-radius: var(--radius);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: var(--radius);
}

.bar-fill.critical {
  width: 72%;
  background: linear-gradient(90deg, #ef4444, #b91c1c);
}

.bar-fill.moderate {
  width: 55%;
  background: linear-gradient(90deg, #f59e0b, #b45309);
}

.bar-fill.minor {
  width: 35%;
  background: linear-gradient(90deg, #38bdf8, #0284c7);
}

.report-preview {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 2rem;
  align-items: center;
  padding: 1.8rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
}

.report-preview__copy h2 {
  margin: 0.2rem 0 0.6rem;
  font-size: clamp(1.4rem, 1.1rem + 1vw, 2rem);
}

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

.form-grid {
  display: grid;
  gap: 1.5rem;
}

.field {
  display: grid;
  gap: 0.6rem;
}

.field--actions {
  align-self: end;
}

.field--actions .btn {
  width: 100%;
}

.field-label {
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 700;
}

.field-control {
  width: 100%;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  padding: 0.65rem 0.8rem;
  font-size: 0.95rem;
  background: #ffffff;
  color: #0f172a;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field-control:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
}

.field-hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.form-error {
  padding: 0.75rem 0.9rem;
  border-radius: var(--radius);
  border: 1px solid rgba(185, 28, 28, 0.25);
  background: rgba(185, 28, 28, 0.08);
  color: #7f1d1d;
  font-size: 0.9rem;
}

.profile-toggle {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.profile-option {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  align-items: start;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.profile-option input {
  margin-top: 0.25rem;
  accent-color: #2563eb;
}

.profile-option .sub {
  display: block;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.profile-option.is-selected {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.audit-page .btn {
  border-radius: var(--radius);
  font-weight: 600;
  padding: 0.65rem 1.5rem;
}

.audit-page .btn-sm {
  padding: 0.45rem 0.9rem;
  font-size: 0.8rem;
}

.audit-page .btn-primary {
  background: linear-gradient(135deg, var(--brand), #1e40af);
  border: none;
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(29, 78, 216, 0.3);
}

.audit-page .btn-primary:disabled {
  box-shadow: none;
  opacity: 0.6;
}

.audit-page .btn-outline {
  border: 1px solid var(--border);
  background: transparent;
  color: #0f172a;
}

.audit-page .btn-outline:hover {
  background: var(--surface-2);
}

.audit-page .btn .spinner-border {
  margin-right: 0.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.stat-card {
  border: 1px solid transparent;
  border-radius: var(--radius);
  padding: 1.2rem 1.3rem;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
  display: grid;
  gap: 0.35rem;
  color: #0f172a;
}

.stat-label {
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 700;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
}

.stat-meta {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.stat-card.stat-critical {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(185, 28, 28, 0.1));
  border-color: rgba(185, 28, 28, 0.25);
}

.stat-card.stat-moderate {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(180, 83, 9, 0.12));
  border-color: rgba(180, 83, 9, 0.25);
}

.stat-card.stat-minor {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(2, 132, 199, 0.12));
  border-color: rgba(2, 132, 199, 0.25);
}

.stat-card.stat-critical .stat-value,
.stat-card.stat-moderate .stat-value,
.stat-card.stat-minor .stat-value {
  color: #0f172a;
}

.stat-card.stat-critical .stat-label,
.stat-card.stat-critical .stat-meta {
  color: #7f1d1d;
}

.stat-card.stat-moderate .stat-label,
.stat-card.stat-moderate .stat-meta {
  color: #7c2d12;
}

.stat-card.stat-minor .stat-label,
.stat-card.stat-minor .stat-meta {
  color: #075985;
}

.filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.2rem;
  align-items: end;
}

.btn-filter-clear {
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: #0f172a;
  box-shadow: none;
  height: 44px;
}

.btn-filter-clear:hover {
  background: #e2e8f0;
}

.btn-export {
  background: linear-gradient(135deg, var(--brand), #1e40af);
  border: none;
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(29, 78, 216, 0.3);
  height: 44px;
}

.btn-export:hover {
  filter: brightness(1.05);
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(29, 78, 216, 0.35);
}

.btn-filter-clear:disabled,
.btn-export:disabled {
  opacity: 0.6;
  box-shadow: none;
}

.issue-list {
  display: grid;
  border-top: 1px solid var(--border);
  margin-top: 1rem;
}

.issue-card {
  padding: 1.25rem 0;
  border-bottom: 1px solid var(--border);
  display: grid;
  gap: 0.6rem;
}

.issue-card.impact-critical {
  border-left: 4px solid var(--danger);
  padding-left: 1rem;
}

.issue-card.impact-serious {
  border-left: 4px solid #c2410c;
  padding-left: 1rem;
}

.issue-card.impact-moderate {
  border-left: 4px solid var(--warning);
  padding-left: 1rem;
}

.issue-card.impact-minor {
  border-left: 4px solid var(--info);
  padding-left: 1rem;
}

.issue-card:last-child {
  border-bottom: 0;
}

.issue-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
}

.issue-title {
  margin: 0;
  font-weight: 700;
  color: #0f172a;
}

.issue-card.impact-critical .issue-title {
  color: var(--danger);
}

.issue-card.impact-serious .issue-title {
  color: #c2410c;
}

.issue-card.impact-moderate .issue-title {
  color: var(--warning);
}

.issue-card.impact-minor .issue-title {
  color: var(--info);
}

.issue-desc {
  margin: 0;
  color: var(--text-muted);
}

.issue-meta {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.issue-count {
  color: var(--text-muted);
}

.issue-details {
  margin-top: 0.4rem;
  padding: 0.9rem 1rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface-2);
  font-size: 0.85rem;
  color: #475569;
  display: grid;
  gap: 0.6rem;
}

.empty-inline {
  color: var(--text-muted);
}

.node-detail {
  display: grid;
  gap: 0.3rem;
}

.node-code code,
.issue-details code {
  background: #0f172a;
  color: #e2e8f0;
  padding: 0.2rem 0.35rem;
  border-radius: var(--radius);
}

.node-note {
  color: #64748b;
}

.node-more {
  color: var(--text-muted);
}

.impact-pill {
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  font-weight: 700;
  padding: 0.35rem 0.55rem;
  border-radius: var(--radius);
  min-width: 7rem;
  text-align: center;
  background: rgba(15, 23, 42, 0.06);
  color: #0f172a;
  border: 1px solid var(--border);
}

.impact-pill.impact-critical {
  color: var(--danger);
  background: rgba(185, 28, 28, 0.12);
  border-color: rgba(185, 28, 28, 0.35);
}

.impact-pill.impact-serious {
  color: #9a3412;
  background: rgba(194, 65, 12, 0.12);
  border-color: rgba(194, 65, 12, 0.35);
}

.impact-pill.impact-moderate {
  color: var(--warning);
  background: rgba(180, 83, 9, 0.14);
  border-color: rgba(180, 83, 9, 0.35);
}

.impact-pill.impact-minor {
  color: var(--info);
  background: rgba(2, 132, 199, 0.14);
  border-color: rgba(2, 132, 199, 0.35);
}

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

@media (max-width: 1100px) {
  .page-hero {
    grid-template-columns: 1fr;
  }

  .page-hero__card {
    width: 100%;
  }

  .report-preview {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 980px) {
  .stats-grid,
  .filters {
    grid-template-columns: 1fr;
  }

  .issue-header {
    grid-template-columns: 1fr;
    align-items: start;
  }
}

@media (max-width: 640px) {
  .page-hero {
    padding: 2rem 1.6rem;
  }

  .panel {
    padding: 1.4rem;
  }

  .input-row {
    grid-template-columns: 1fr;
  }
}
</style>

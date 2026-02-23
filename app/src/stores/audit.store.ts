import { defineStore } from 'pinia'
import { supabase } from '@/services/supabase'
import { useAuthStore } from './auth.store'

type Impact = 'critical' | 'serious' | 'moderate' | 'minor'

type AuditReport = {
  summary: {
    total: number
    byImpact: Record<Impact, number>
  }
  issues: Array<{
    id: string
    title: string
    impact: Impact
    description: string
    recommendation?: string
    copy?: Record<
      string,
      {
        title?: string
        description?: string
        recommendation?: string
        source?: 'static' | 'ai' | string
        promptVersion?: string
        generatedAt?: string
      }
    >
    wcag: string
    wcagLevel: string
    principle: string
    helpUrl?: string
    nodesCount?: number
    nodes?: Array<{
      target: string[]
      html: string
      failureSummary?: string
    }>
  }>
}

type SiteAuditMode = 'quick' | 'full'
type SiteAuditJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | string

type SiteAuditJob = {
  id: string
  status: SiteAuditJobStatus
  mode: SiteAuditMode | string
  rootUrl: string
  lang?: string
  pagesLimit: number
  maxDepth: number
  pagesQueued: number
  pagesScanned: number
  pagesFailed: number
  issuesTotal: number
  currentUrl?: string | null
  currentDepth?: number | null
  progress: number
  auditId?: string | null
  error?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

const REPORT_LOCALE = 'sk'
const SITE_AUDIT_POLL_INTERVAL_MS = 2_500
const SITE_AUDIT_TIMEOUT_MIN_MS = 20 * 60 * 1_000
const SITE_AUDIT_TIMEOUT_MAX_MS = 3 * 60 * 60 * 1_000
const SITE_AUDIT_TIMEOUT_PER_PAGE_MS = 45_000
const SITE_AUDIT_STALL_TIMEOUT_MS = 10 * 60 * 1_000
const SITE_AUDIT_WORKER_KICK_INTERVAL_MS = 20_000
const SITE_AUDIT_STATUS_MAX_CONSECUTIVE_ERRORS = 5
const SITE_AUDIT_STATUS_ERROR_BACKOFF_MS = 1_500

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const parseErrorMessage = async (response: Response, fallback: string) => {
  try {
    const data = await response.json()
    if (data?.error) return String(data.error)
  } catch (_error) {
    // ignore json parsing errors
  }
  return fallback
}

const parseJsonSafe = async (response: Response) => {
  try {
    return await response.json()
  } catch (_error) {
    return null
  }
}

const normalizeSiteAuditJob = (raw: any): SiteAuditJob | null => {
  if (!raw || typeof raw !== 'object') return null

  const id = typeof raw.id === 'string' ? raw.id : typeof raw.jobId === 'string' ? raw.jobId : ''
  if (!id) return null

  const pagesLimit = Math.max(0, Number(raw.pagesLimit || raw.pages_limit || 0))
  const pagesScanned = Math.max(0, Number(raw.pagesScanned || raw.pages_scanned || 0))
  const pagesFailed = Math.max(0, Number(raw.pagesFailed || raw.pages_failed || 0))
  const pagesQueued = Math.max(0, Number(raw.pagesQueued || raw.pages_queued || 0))
  const processed = pagesScanned + pagesFailed
  const progress =
    Number(raw.progress) > 0
      ? Math.min(100, Math.max(0, Number(raw.progress)))
      : pagesLimit > 0
      ? Math.min(100, Math.round((processed / pagesLimit) * 100))
      : 0

  return {
    id,
    status: String(raw.status || 'queued'),
    mode: String(raw.mode || 'quick'),
    rootUrl: String(raw.rootUrl || raw.root_url || ''),
    lang: typeof raw.lang === 'string' ? raw.lang : REPORT_LOCALE,
    pagesLimit,
    maxDepth: Math.max(0, Number(raw.maxDepth || raw.max_depth || 0)),
    pagesQueued,
    pagesScanned,
    pagesFailed,
    issuesTotal: Math.max(0, Number(raw.issuesTotal || raw.issues_total || 0)),
    currentUrl:
      typeof raw.currentUrl === 'string'
        ? raw.currentUrl
        : typeof raw.current_url === 'string'
        ? raw.current_url
        : null,
    currentDepth:
      Number.isFinite(Number(raw.currentDepth ?? raw.current_depth)) &&
      Number(raw.currentDepth ?? raw.current_depth) >= 0
        ? Number(raw.currentDepth ?? raw.current_depth)
        : null,
    progress,
    auditId: typeof raw.auditId === 'string' ? raw.auditId : typeof raw.audit_id === 'string' ? raw.audit_id : null,
    error: typeof raw.error === 'string' ? raw.error : typeof raw.error_message === 'string' ? raw.error_message : null,
    startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : typeof raw.started_at === 'string' ? raw.started_at : null,
    finishedAt:
      typeof raw.finishedAt === 'string' ? raw.finishedAt : typeof raw.finished_at === 'string' ? raw.finished_at : null,
    createdAt:
      typeof raw.createdAt === 'string' ? raw.createdAt : typeof raw.created_at === 'string' ? raw.created_at : null,
    updatedAt:
      typeof raw.updatedAt === 'string' ? raw.updatedAt : typeof raw.updated_at === 'string' ? raw.updated_at : null
  }
}

const getSiteAuditTimeoutMs = (pagesLimit?: unknown) => {
  const parsedLimit = Number(pagesLimit)
  const estimated = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit * SITE_AUDIT_TIMEOUT_PER_PAGE_MS : 45 * 60 * 1_000
  return Math.max(SITE_AUDIT_TIMEOUT_MIN_MS, Math.min(SITE_AUDIT_TIMEOUT_MAX_MS, Math.round(estimated)))
}

export const useAuditStore = defineStore('audit', {
  state: () => ({
    loading: false,
    currentAudit: null as any,
    accessLevel: null as null | 'free' | 'paid',
    report: null as null | AuditReport,
    siteAuditJob: null as SiteAuditJob | null,
    error: null as string | null,
    history: [] as Array<{
      id: string
      url: string
      audit_kind: 'free' | 'paid'
      scope?: 'single' | 'site' | 'monitoring' | string
      summary: AuditReport['summary']
      created_at: string
    }>
  }),

  actions: {
    async runManualAudit(url: string) {
      this.loading = true
      this.error = null
      this.report = null
      this.accessLevel = null
      this.siteAuditJob = null
      const auth = useAuthStore()

      try {
        if (!auth.isLoggedIn) {
          throw new Error('Prihlaste sa, aby ste mohli spustit audit.')
        }

        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        if (!accessToken) {
          throw new Error('Prihlaste sa, aby ste mohli spustit audit.')
        }

        const response = await fetch('/.netlify/functions/audit-run', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ url, lang: REPORT_LOCALE })
        })

        if (!response.ok) {
          let message = 'Audit zlyhal'
          try {
            const data = await response.json()
            if (data?.error) message = data.error
          } catch (_error) {
            // ignore json parsing errors
          }
          throw new Error(message)
        }

        const data = await response.json()
        this.currentAudit = data
        this.report = data.report
        this.accessLevel = data.accessLevel || 'paid'
        if (this.accessLevel === 'free') {
          auth.freeAuditUsed = true
        } else if (this.accessLevel === 'paid' && !auth.isAdmin) {
          auth.paidAuditCompleted = true
          auth.paidAuditCredits = Math.max(0, (auth.paidAuditCredits || 0) - 1)
        }
      } catch (err: any) {
        this.error = err.message
        this.accessLevel = null
      } finally {
        this.loading = false
      }
    },

    async getAccessToken() {
      const { data: sessionData } = await supabase.auth.getSession()
      return sessionData.session?.access_token || ''
    },

    async authorizedFetch(path: string, init?: RequestInit) {
      const accessToken = await this.getAccessToken()
      if (!accessToken) {
        throw new Error('Prihlaste sa, aby ste mohli spustit audit.')
      }

      return fetch(`/.netlify/functions/${path}`, {
        ...(init || {}),
        headers: {
          ...(init?.headers || {}),
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
    },

    async fetchSiteAuditStatus(jobId: string) {
      const query = new URLSearchParams({ jobId })
      const response = await this.authorizedFetch(`audit-site-status?${query.toString()}`, {
        method: 'GET'
      })

      if (!response.ok) {
        const message = await parseErrorMessage(response, 'Nacitanie stavu site auditu zlyhalo.')
        throw new Error(message)
      }

      const data = await response.json()
      const normalizedJob = normalizeSiteAuditJob(data?.job)
      if (normalizedJob) {
        this.siteAuditJob = normalizedJob
      }
      return normalizedJob
    },

    async triggerSiteAuditWorker(maxJobs = 1) {
      try {
        const query = new URLSearchParams({ maxJobs: String(Math.max(1, Math.min(10, Math.floor(maxJobs)))) })
        const backgroundResponse = await fetch(`/.netlify/functions/audit-site-worker-background?${query.toString()}`, {
          method: 'POST'
        })

        if (!backgroundResponse.ok && backgroundResponse.status !== 202) {
          await fetch(`/.netlify/functions/audit-site-worker?${query.toString()}`, {
            method: 'POST'
          })
        }
      } catch (_error) {
        // best effort only; scheduler should still process queued jobs
      }
    },

    async pollSiteAuditJobUntilDone(jobId: string, options?: { timeoutMs?: number; stallTimeoutMs?: number }) {
      const startedAt = Date.now()
      let lastWorkerKickAt = 0
      const timeoutMs = Math.max(60_000, Number(options?.timeoutMs || SITE_AUDIT_TIMEOUT_MIN_MS))
      const stallTimeoutMs = Math.max(
        SITE_AUDIT_POLL_INTERVAL_MS * 2,
        Number(options?.stallTimeoutMs || SITE_AUDIT_STALL_TIMEOUT_MS)
      )
      let lastActivityAt = Date.now()
      let lastStatus = ''
      let lastProcessed = -1
      let lastQueued = -1
      let lastUpdatedAt = ''
      let consecutiveStatusErrors = 0

      while (Date.now() - startedAt < timeoutMs) {
        let job: Awaited<ReturnType<typeof this.fetchSiteAuditStatus>> = null
        try {
          job = await this.fetchSiteAuditStatus(jobId)
          consecutiveStatusErrors = 0
        } catch (statusError: any) {
          consecutiveStatusErrors += 1
          const statusErrorMessage =
            typeof statusError?.message === 'string' && statusError.message
              ? statusError.message
              : 'Nacitanie stavu site auditu zlyhalo.'

          if (consecutiveStatusErrors >= SITE_AUDIT_STATUS_MAX_CONSECUTIVE_ERRORS) {
            throw new Error(
              `${statusErrorMessage} Docasne neviem nacitat stav auditu. Skuste to o chvilu znovu.`
            )
          }

          // Keep polling on transient status errors.
          lastActivityAt = Date.now()
          const backoffMs = Math.min(10_000, SITE_AUDIT_STATUS_ERROR_BACKOFF_MS * consecutiveStatusErrors)
          await delay(backoffMs)
          continue
        }

        const status = job?.status || 'queued'
        const processed = Math.max(0, Number(job?.pagesScanned || 0)) + Math.max(0, Number(job?.pagesFailed || 0))
        const queued = Math.max(0, Number(job?.pagesQueued || 0))
        const updatedAt = String(job?.updatedAt || '')

        if (status === 'completed') return job
        if (status === 'failed' || status === 'cancelled') {
          throw new Error(job?.error || 'Site audit zlyhal.')
        }

        const now = Date.now()
        if (
          status !== lastStatus ||
          processed !== lastProcessed ||
          queued !== lastQueued ||
          (updatedAt && updatedAt !== lastUpdatedAt)
        ) {
          lastActivityAt = now
          lastStatus = status
          lastProcessed = processed
          lastQueued = queued
          lastUpdatedAt = updatedAt
        }

        if (now - lastActivityAt >= stallTimeoutMs) {
          throw new Error('Site audit bezi prilis dlho bez zmeny. Skuste kliknut na Spustit site audit pre obnovenie stavu.')
        }

        if (status === 'queued' && (lastWorkerKickAt === 0 || now - lastWorkerKickAt >= SITE_AUDIT_WORKER_KICK_INTERVAL_MS)) {
          lastWorkerKickAt = now
          void this.triggerSiteAuditWorker(1)
        }

        await delay(SITE_AUDIT_POLL_INTERVAL_MS)
      }

      throw new Error('Site audit stale bezi na serveri. Kliknite na Spustit site audit pre obnovenie stavu alebo audit ukoncite.')
    },

    async runSiteAudit(url: string, options?: { mode?: SiteAuditMode; pagesLimit?: number; maxDepth?: number }) {
      this.loading = true
      this.error = null
      this.report = null
      this.accessLevel = null
      this.siteAuditJob = null

      const auth = useAuthStore()

      try {
        if (!auth.isLoggedIn) {
          throw new Error('Prihlaste sa, aby ste mohli spustit audit.')
        }

        const response = await this.authorizedFetch('audit-site-start', {
          method: 'POST',
          body: JSON.stringify({
            rootUrl: url,
            mode: options?.mode || 'full',
            lang: REPORT_LOCALE,
            pagesLimit: options?.pagesLimit,
            maxDepth: options?.maxDepth
          })
        })

        let jobId = ''
        if (response.ok) {
          const data = await parseJsonSafe(response)
          const bootJob = normalizeSiteAuditJob({
            id: data?.jobId,
            status: data?.status,
            mode: data?.mode,
            rootUrl: data?.rootUrl,
            lang: data?.lang,
            pagesLimit: data?.pagesLimit,
            maxDepth: data?.maxDepth
          })

          if (bootJob) {
            this.siteAuditJob = bootJob
            jobId = bootJob.id
          } else if (typeof data?.jobId === 'string') {
            jobId = data.jobId
          }
        } else if (response.status === 409) {
          const data = await parseJsonSafe(response)
          const existingJob = normalizeSiteAuditJob(data?.job)
          if (existingJob) {
            this.siteAuditJob = existingJob
            jobId = existingJob.id
          } else {
            const message = await parseErrorMessage(response, 'Uz mate rozbehnuty site audit job.')
            throw new Error(message)
          }
        } else {
          const message = await parseErrorMessage(response, 'Spustenie site auditu zlyhalo.')
          throw new Error(message)
        }

        if (!jobId) {
          throw new Error('Site audit job sa nepodarilo inicializovat.')
        }

        void this.triggerSiteAuditWorker(1)
        const timeoutMs = getSiteAuditTimeoutMs(this.siteAuditJob?.pagesLimit || options?.pagesLimit)
        await this.pollSiteAuditJobUntilDone(jobId, { timeoutMs })

        const resultQuery = new URLSearchParams({ jobId, lang: REPORT_LOCALE })
        const resultResponse = await this.authorizedFetch(`audit-site-result?${resultQuery.toString()}`, {
          method: 'GET'
        })

        if (!resultResponse.ok) {
          const message = await parseErrorMessage(resultResponse, 'Nacitanie site audit reportu zlyhalo.')
          throw new Error(message)
        }

        const resultData = await resultResponse.json()
        const auditData = resultData?.audit
        if (!auditData?.auditId || !auditData?.report) {
          throw new Error('Site audit report je nekompletny.')
        }

        this.currentAudit = auditData
        this.report = auditData.report
        this.accessLevel = auditData.accessLevel || 'paid'

        if (!auth.isAdmin) {
          auth.paidAuditCompleted = true
          auth.paidAuditCredits = Math.max(0, Number(auth.paidAuditCredits || 0) - 1)
        }
      } catch (err: any) {
        this.error = err?.message || 'Site audit zlyhal.'
        this.accessLevel = null
      } finally {
        this.loading = false
      }
    },

    async cancelSiteAudit(jobId?: string) {
      const resolvedJobId = (jobId || this.siteAuditJob?.id || '').trim()
      if (!resolvedJobId) return null

      const response = await this.authorizedFetch('audit-site-cancel', {
        method: 'POST',
        body: JSON.stringify({ jobId: resolvedJobId })
      })

      if (!response.ok) {
        const message = await parseErrorMessage(response, 'Zrusenie site auditu zlyhalo.')
        throw new Error(message)
      }

      const data = await response.json()
      const normalizedJob = normalizeSiteAuditJob(data?.job)
      if (normalizedJob) {
        this.siteAuditJob = normalizedJob
      } else if (this.siteAuditJob) {
        this.siteAuditJob = {
          ...this.siteAuditJob,
          status: 'cancelled',
          finishedAt: new Date().toISOString()
        }
      }
      this.loading = false
      return data
    },

    async fetchLatestAudit() {
      const auth = useAuthStore()
      if (!auth.isLoggedIn) return null

      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        if (!accessToken) return null

        const response = await fetch(`/.netlify/functions/audit-latest?lang=${REPORT_LOCALE}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        if (!response.ok) return null

        const data = await response.json()
        if (!data?.auditId || !data?.report) return null

        this.currentAudit = data
        this.report = data.report
        this.accessLevel = data.accessLevel || 'paid'
        return data
      } catch (_error) {
        return null
      }
    },

    async fetchAuditHistory(options?: { page?: number; limit?: number; append?: boolean }) {
      const auth = useAuthStore()
      if (!auth.isLoggedIn) {
        return {
          audits: [] as typeof this.history,
          hasMore: false,
          page: 1
        }
      }
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        if (!accessToken) {
          throw new Error('Prihlaste sa, aby sa nacitala historia auditov.')
        }

        const page = options?.page && options.page > 0 ? options.page : 1
        const limit = options?.limit && options.limit > 0 ? options.limit : 20
        const query = new URLSearchParams({ page: String(page), limit: String(limit) })
        const response = await fetch(`/.netlify/functions/audit-history?${query.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        if (!response.ok) {
          let message = 'Historiu auditov sa nepodarilo nacitat.'
          try {
            const data = await response.json()
            if (data?.error) message = data.error
          } catch (_error) {
            // ignore json parsing errors
          }
          throw new Error(message)
        }

        const data = await response.json()
        const audits = Array.isArray(data?.audits) ? data.audits : []
        this.history = options?.append ? [...this.history, ...audits] : audits
        return {
          audits: this.history,
          hasMore: !!data?.hasMore,
          page
        }
      } catch (error) {
        throw error
      }
    },

    async loadAuditById(auditId: string) {
      const auth = useAuthStore()
      if (!auth.isLoggedIn || !auditId) return null
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        if (!accessToken) return null

        const query = new URLSearchParams({ id: auditId, lang: REPORT_LOCALE })
        const response = await fetch(`/.netlify/functions/audit-detail?${query.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        if (!response.ok) return null
        const data = await response.json()
        if (!data?.auditId || !data?.report) return null

        this.currentAudit = data
        this.report = data.report
        this.accessLevel = data.accessLevel || 'paid'
        return data
      } catch (_error) {
        return null
      }
    }
  }
})

import type { Handler } from '@netlify/functions'
import {
  createSupabaseAdminClient,
  errorResponse,
  getAuthUser,
  getBearerToken,
  getSiteAuditJobForUser,
  markJobFailed,
  jsonResponse
} from './audit-site-core'
import { logJson } from './audit-site-observability'
import { dispatchSiteAuditWorkerBackground } from './audit-site-worker-dispatch'

const QUEUED_REDRIVE_AFTER_MS = 12_000
const QUEUED_REDRIVE_INTERVAL_MS = 30_000
const QUEUED_REDRIVE_WINDOW_MS = 3_000
const RUNNING_PAGE_QUERY_TIMEOUT_MS = 2_500

const getUnixMs = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return NaN
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : NaN
}

const shouldRedriveQueuedJob = (job: any) => {
  if (String(job?.status || '') !== 'queued') return false
  if (job?.started_at) return false

  const createdAtMs = getUnixMs(job?.created_at)
  if (!Number.isFinite(createdAtMs)) return false

  const ageMs = Date.now() - createdAtMs
  if (ageMs < QUEUED_REDRIVE_AFTER_MS) return false

  const offset = ageMs - QUEUED_REDRIVE_AFTER_MS
  const withinWindow = offset % QUEUED_REDRIVE_INTERVAL_MS
  return withinWindow >= 0 && withinWindow <= QUEUED_REDRIVE_WINDOW_MS
}

const loadCurrentPageBestEffort = async (supabase: any, jobId: string, status: string) => {
  if (status !== 'running') return null

  try {
    // Prefer an actively running page. If none is currently marked as running,
    // fall back to the most recently touched non-queued page so UI progress stays informative.
    const runningQueryPromise = supabase
      .from('audit_job_pages')
      .select('url, depth')
      .eq('job_id', jobId)
      .eq('status', 'running')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), RUNNING_PAGE_QUERY_TIMEOUT_MS)
    )

    const runningResult = (await Promise.race([runningQueryPromise, timeoutPromise])) as
      | { data?: { url?: string | null; depth?: number | null } | null; error?: any }
      | null

    if (runningResult?.data && !runningResult.error) return runningResult.data

    const latestQueryPromise = supabase
      .from('audit_job_pages')
      .select('url, depth')
      .eq('job_id', jobId)
      .in('status', ['done', 'failed', 'skipped'])
      .order('scanned_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    const latestResult = (await Promise.race([latestQueryPromise, timeoutPromise])) as
      | { data?: { url?: string | null; depth?: number | null } | null; error?: any }
      | null

    if (!latestResult || latestResult.error) return null
    return latestResult.data || null
  } catch {
    return null
  }
}

const isWorkerAuthorizationFailure = (dispatchResult: {
  statusCode?: number
  error?: string
}) => {
  const errorText = String(dispatchResult.error || '').toLowerCase()
  if (dispatchResult.statusCode === 401 || dispatchResult.statusCode === 403) return true
  if (errorText.includes('worker secret')) return true
  if (errorText.includes('autoriz')) return true
  return false
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return errorResponse(405, 'Metoda nie je povolena.')
    }

    const supabase = createSupabaseAdminClient()
    if (!supabase) {
      return errorResponse(500, 'Chyba konfiguracia Supabase.')
    }

    const token = getBearerToken(event)
    if (!token) {
      return errorResponse(401, 'Chyba autorizacia.')
    }

    const auth = await getAuthUser(supabase, token)
    if (!auth.userId) {
      return errorResponse(401, auth.error || 'Neplatne prihlasenie.')
    }

    const jobId = (event.queryStringParameters?.jobId || '').trim()
    if (!jobId) {
      return errorResponse(400, 'Chyba site audit job ID.')
    }

    const jobResult = await getSiteAuditJobForUser(supabase, auth.userId, jobId)
    if (jobResult.error) {
      return errorResponse(500, jobResult.error)
    }
    if (!jobResult.data?.id) {
      return errorResponse(404, 'Site audit job neexistuje.')
    }

    let job = jobResult.data
    if (shouldRedriveQueuedJob(job)) {
      const redrive = await dispatchSiteAuditWorkerBackground({
        event,
        maxJobs: 1,
        timeoutMs: 1_200
      })
      if (redrive.dispatched) {
        logJson('info', 'status_worker_redrive_dispatched', {
          jobId: job.id,
          attemptsUsed: redrive.attemptsUsed
        })
      } else {
        logJson('warn', 'status_worker_redrive_failed', {
          jobId: job.id,
          attemptsUsed: redrive.attemptsUsed,
          statusCode: redrive.statusCode,
          targetUrl: redrive.targetUrl,
          error: redrive.error || 'unknown'
        })

        if (isWorkerAuthorizationFailure(redrive)) {
          const failureMessage =
            '[security] Site audit worker dispatch authorization failed. Check AUDIT_SITE_WORKER_SECRET.'
          await markJobFailed(supabase, job.id, failureMessage)
          const nowIso = new Date().toISOString()
          job = {
            ...job,
            status: 'failed',
            error_message: failureMessage,
            finished_at: nowIso,
            updated_at: nowIso
          }
          logJson('error', 'status_worker_redrive_marked_failed', {
            jobId: job.id,
            statusCode: redrive.statusCode,
            error: redrive.error || 'unknown'
          })
        }
      }
    }

    const pagesScanned = Number(job.pages_scanned || 0)
    const pagesFailed = Number(job.pages_failed || 0)
    const pagesQueued = Number(job.pages_queued || 0)
    const processed = pagesScanned + pagesFailed
    const discovered = processed + pagesQueued
    const limit = Number(job.pages_limit || 0)

    let progress = 0
    if (job.status === 'completed') {
      progress = 100
    } else if (processed <= 0 && pagesQueued > 0) {
      progress = 3
    } else if (discovered > 0) {
      progress = Math.round((processed / discovered) * 100)
    } else if (limit > 0) {
      progress = Math.round((processed / limit) * 100)
    }
    progress = Math.max(0, Math.min(100, progress))
    const runningPage = await loadCurrentPageBestEffort(supabase, job.id, String(job.status || ''))

    return jsonResponse(200, {
      job: {
        id: job.id,
        status: job.status,
        mode: job.mode,
        rootUrl: job.root_url,
        lang: job.lang,
        pagesLimit: limit,
        maxDepth: Number(job.max_depth || 0),
        pagesQueued,
        pagesScanned,
        pagesFailed,
        issuesTotal: Number(job.issues_total || 0),
        currentUrl: typeof runningPage?.url === 'string' ? runningPage.url : null,
        currentDepth: Number.isFinite(Number(runningPage?.depth)) ? Number(runningPage?.depth) : null,
        progress,
        auditId: job.audit_id || null,
        error: job.error_message || null,
        startedAt: job.started_at || null,
        finishedAt: job.finished_at || null,
        createdAt: job.created_at || null,
        updatedAt: job.updated_at || null
      }
    })
  } catch (error) {
    console.error('Site audit status error:', error)
    return errorResponse(500, 'Nacitanie stavu site auditu zlyhalo.')
  }
}

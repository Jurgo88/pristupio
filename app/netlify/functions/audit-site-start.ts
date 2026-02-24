import type { Handler } from '@netlify/functions'
import {
  canStartSiteAudit,
  checkSiteAuditStartRateLimit,
  createSiteAuditJob,
  createSupabaseAdminClient,
  ensureSafeAuditRootUrl,
  errorResponse,
  getAuthUser,
  getBearerToken,
  getExistingActiveSiteAuditJob,
  jsonResponse,
  loadSiteAuditProfile,
  markJobFailed,
  normalizeAuditUrl,
  normalizeRequestedMaxDepth,
  normalizeRequestedPagesLimit,
  normalizeSiteAuditLocale,
  normalizeSiteAuditMode
} from './audit-site-core'
import { logJson } from './audit-site-observability'
import { dispatchSiteAuditWorkerBackground } from './audit-site-worker-dispatch'

type StartSiteAuditBody = {
  rootUrl?: unknown
  url?: unknown
  mode?: unknown
  lang?: unknown
  pagesLimit?: unknown
  maxDepth?: unknown
}

const parseBody = (rawBody?: string | null): StartSiteAuditBody => {
  if (!rawBody) return {}
  try {
    const parsed = JSON.parse(rawBody)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as StartSiteAuditBody
  } catch {
    return {}
  }
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
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

    const body = parseBody(event.body)
    const rootUrl = normalizeAuditUrl(body.rootUrl ?? body.url)
    if (!rootUrl) {
      return errorResponse(400, 'Neplatna URL.')
    }
    try {
      await ensureSafeAuditRootUrl(rootUrl)
    } catch {
      return errorResponse(400, 'Neplatna alebo nebezpecna URL.')
    }

    const mode = normalizeSiteAuditMode(body.mode)
    const locale = normalizeSiteAuditLocale(body.lang)

    const profile = await loadSiteAuditProfile(supabase, auth.userId)
    const entitlement = canStartSiteAudit(profile)
    if (!entitlement.allowed) {
      return errorResponse(403, entitlement.reason)
    }

    const activeJob = await getExistingActiveSiteAuditJob(supabase, auth.userId)
    if (activeJob?.id) {
      return jsonResponse(409, {
        error: 'Uz mate rozbehnuty site audit job.',
        job: activeJob
      })
    }

    if (!profile?.isAdmin) {
      const rateLimit = await checkSiteAuditStartRateLimit(supabase, auth.userId)
      if (!rateLimit.allowed) {
        const retryAfterSec = Math.max(1, Number(rateLimit.retryAfterSec || 0))
        return jsonResponse(429, {
          error: rateLimit.message || 'Prilis vela spusteni site auditu. Skuste to neskor.',
          retryAfterSec
        }, {
          'Retry-After': String(retryAfterSec)
        })
      }
    }

    const tier = profile?.isAdmin ? 'pro' : profile?.auditTier || 'none'
    const pagesLimit = normalizeRequestedPagesLimit(tier, mode, body.pagesLimit)
    const maxDepth = normalizeRequestedMaxDepth(mode, body.maxDepth)

    const job = await createSiteAuditJob({
      supabase,
      userId: auth.userId,
      rootUrl,
      mode,
      locale,
      auditTier: tier,
      pagesLimit,
      maxDepth
    })

    const dispatch = await dispatchSiteAuditWorkerBackground({
      event,
      maxJobs: 1
    })
    if (!dispatch.dispatched) {
      logJson('warn', 'start_worker_dispatch_failed', {
        jobId: job.id,
        attemptsUsed: dispatch.attemptsUsed,
        statusCode: dispatch.statusCode,
        targetUrl: dispatch.targetUrl,
        error: dispatch.error || 'unknown'
      })

      const dispatchError = String(dispatch.error || '').toLowerCase()
      const workerSecretConfigError =
        dispatchError.includes('worker secret') ||
        dispatch.statusCode === 401 ||
        dispatch.statusCode === 403

      if (workerSecretConfigError) {
        await markJobFailed(
          supabase,
          job.id,
          '[security] Worker dispatch authorization failed. Check AUDIT_SITE_WORKER_SECRET.'
        )
        return errorResponse(500, 'Site audit worker nie je spravne nakonfigurovany. Skontrolujte AUDIT_SITE_WORKER_SECRET.')
      }
    } else if (dispatch.attemptsUsed > 1) {
      logJson('info', 'start_worker_dispatch_retried', {
        jobId: job.id,
        attemptsUsed: dispatch.attemptsUsed,
        statusCode: dispatch.statusCode
      })
    }

    return jsonResponse(202, {
      jobId: job.id,
      status: job.status,
      mode: job.mode,
      rootUrl: job.root_url,
      pagesLimit: job.pages_limit,
      maxDepth: job.max_depth,
      lang: job.lang,
      workerDispatched: dispatch.dispatched
    })
  } catch (error) {
    console.error('Site audit start error:', error)
    return errorResponse(500, 'Spustenie site auditu zlyhalo.')
  }
}

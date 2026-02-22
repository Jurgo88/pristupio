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
  normalizeAuditUrl,
  normalizeRequestedMaxDepth,
  normalizeRequestedPagesLimit,
  normalizeSiteAuditLocale,
  normalizeSiteAuditMode
} from './audit-site-core'

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
        return jsonResponse(429, {
          error: rateLimit.message || 'Prilis vela spusteni site auditu. Skuste to neskor.',
          retryAfterSec: rateLimit.retryAfterSec || 0
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

    return jsonResponse(202, {
      jobId: job.id,
      status: job.status,
      mode: job.mode,
      rootUrl: job.root_url,
      pagesLimit: job.pages_limit,
      maxDepth: job.max_depth,
      lang: job.lang
    })
  } catch (error) {
    console.error('Site audit start error:', error)
    return errorResponse(500, 'Spustenie site auditu zlyhalo.')
  }
}

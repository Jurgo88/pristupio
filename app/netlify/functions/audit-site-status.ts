import type { Handler } from '@netlify/functions'
import {
  createSupabaseAdminClient,
  errorResponse,
  getAuthUser,
  getBearerToken,
  getSiteAuditJobForUser,
  jsonResponse
} from './audit-site-core'

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

    const job = jobResult.data
    const processed = Number(job.pages_scanned || 0) + Number(job.pages_failed || 0)
    const limit = Number(job.pages_limit || 0)
    const progress = limit > 0 ? Math.min(100, Math.round((processed / limit) * 100)) : 0
    const { data: runningPage } = await supabase
      .from('audit_job_pages')
      .select('url, depth')
      .eq('job_id', job.id)
      .eq('status', 'running')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle()

    return jsonResponse(200, {
      job: {
        id: job.id,
        status: job.status,
        mode: job.mode,
        rootUrl: job.root_url,
        lang: job.lang,
        pagesLimit: limit,
        maxDepth: Number(job.max_depth || 0),
        pagesQueued: Number(job.pages_queued || 0),
        pagesScanned: Number(job.pages_scanned || 0),
        pagesFailed: Number(job.pages_failed || 0),
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

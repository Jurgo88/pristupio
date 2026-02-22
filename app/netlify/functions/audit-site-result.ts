import type { Handler } from '@netlify/functions'
import {
  createSupabaseAdminClient,
  errorResponse,
  getAuthUser,
  getBearerToken,
  getSiteAuditJobForUser,
  getSiteAuditResult,
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
    if (job.status !== 'completed') {
      return jsonResponse(409, {
        error: 'Site audit este nie je dokonceny.',
        status: job.status
      })
    }

    const result = await getSiteAuditResult(supabase, job, event.queryStringParameters?.lang || job.lang)
    if (result.error || !result.data) {
      return errorResponse(500, result.error || 'Nacitanie site audit reportu zlyhalo.')
    }

    return jsonResponse(200, {
      job: {
        id: job.id,
        status: job.status,
        rootUrl: job.root_url,
        mode: job.mode,
        pagesLimit: Number(job.pages_limit || 0),
        pagesScanned: Number(job.pages_scanned || 0),
        pagesFailed: Number(job.pages_failed || 0),
        issuesTotal: Number(job.issues_total || 0),
        startedAt: job.started_at || null,
        finishedAt: job.finished_at || null
      },
      audit: result.data
    })
  } catch (error) {
    console.error('Site audit result error:', error)
    return errorResponse(500, 'Nacitanie site audit reportu zlyhalo.')
  }
}

import type { Handler } from '@netlify/functions'
import {
  cancelSiteAuditJob,
  createSupabaseAdminClient,
  errorResponse,
  getAuthUser,
  getBearerToken,
  jsonResponse
} from './audit-site-core'

type CancelSiteAuditBody = {
  jobId?: unknown
}

const parseBody = (rawBody?: string | null): CancelSiteAuditBody => {
  if (!rawBody) return {}
  try {
    const parsed = JSON.parse(rawBody)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as CancelSiteAuditBody
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
    const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : ''
    if (!jobId) {
      return errorResponse(400, 'Chyba site audit job ID.')
    }

    const result = await cancelSiteAuditJob(supabase, auth.userId, jobId)
    if (result.error) {
      return errorResponse(409, result.error)
    }
    if (!result.data) {
      return errorResponse(404, 'Site audit job neexistuje.')
    }

    return jsonResponse(200, {
      job: {
        id: result.data.id,
        status: result.data.status,
        finishedAt: result.data.finished_at || null
      }
    })
  } catch (error) {
    console.error('Site audit cancel error:', error)
    return errorResponse(500, 'Zrusenie site auditu zlyhalo.')
  }
}

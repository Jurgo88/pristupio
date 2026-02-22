import type { Handler } from '@netlify/functions'
import { createSupabaseAdminClient, errorResponse, jsonResponse, processQueuedSiteAuditJobs } from './audit-site-core'

export const config = {
  schedule: '*/5 * * * *'
}

const parseMaxJobs = (rawValue: string | undefined) => {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed) || parsed < 1) return undefined
  return Math.min(10, Math.floor(parsed))
}

const isAuthorized = (headers: Record<string, string | undefined>) => {
  const secret = process.env.AUDIT_SITE_WORKER_SECRET || ''
  if (!secret) return true
  const provided = headers['x-audit-site-secret'] || headers['X-Audit-Site-Secret'] || ''
  return provided === secret
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
      return errorResponse(405, 'Metoda nie je povolena.')
    }

    if (!isAuthorized(event.headers)) {
      return errorResponse(401, 'Neplatna autorizacia workeru.')
    }

    const supabase = createSupabaseAdminClient()
    if (!supabase) {
      return errorResponse(500, 'Chyba konfiguracia Supabase.')
    }

    const maxJobs = parseMaxJobs(event.queryStringParameters?.maxJobs)
    const result = await processQueuedSiteAuditJobs(supabase, { maxJobs })

    return jsonResponse(200, {
      ok: true,
      ...result
    })
  } catch (error) {
    console.error('Site audit worker error:', error)
    return errorResponse(500, 'Spustenie site audit workeru zlyhalo.')
  }
}

import type { Handler } from '@netlify/functions'
import { createSupabaseAdminClient, errorResponse, jsonResponse, processQueuedSiteAuditJobs } from './audit-site-core'

const parseMaxJobs = (rawValue: string | undefined) => {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed) || parsed < 1) return undefined
  return Math.min(10, Math.floor(parsed))
}

const getWorkerSecret = () => (process.env.AUDIT_SITE_WORKER_SECRET || '').trim()
const isDevMode = () => process.env.NETLIFY_DEV === 'true'

const isAuthorized = (headers: Record<string, string | undefined>, secret: string) => {
  const provided = headers['x-audit-site-secret'] || headers['X-Audit-Site-Secret'] || ''
  return provided === secret
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
      return errorResponse(405, 'Metoda nie je povolena.')
    }

    const workerSecret = getWorkerSecret()
    if (!workerSecret && !isDevMode()) {
      return errorResponse(500, 'Chyba konfiguracia worker secretu.')
    }

    if (workerSecret && !isAuthorized(event.headers, workerSecret)) {
      return errorResponse(401, 'Neplatna autorizacia worker background endpointu.')
    }

    const supabase = createSupabaseAdminClient()
    if (!supabase) {
      return errorResponse(500, 'Chyba konfiguracia Supabase.')
    }

    const maxJobs = parseMaxJobs(event.queryStringParameters?.maxJobs)
    const result = await processQueuedSiteAuditJobs(supabase, { maxJobs })

    return jsonResponse(200, {
      ok: true,
      mode: 'background',
      ...result
    })
  } catch (error) {
    console.error('Site audit background worker error:', error)
    return errorResponse(500, 'Spustenie background workeru zlyhalo.')
  }
}

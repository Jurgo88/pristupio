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

const getBaseUrl = (event: Parameters<Handler>[0]) => {
  const proto = event.headers['x-forwarded-proto'] || event.headers['X-Forwarded-Proto'] || 'https'
  const host = event.headers['x-forwarded-host'] || event.headers['X-Forwarded-Host'] || event.headers.host || ''
  if (host) return `${proto}://${host}`

  const envUrl = (process.env.URL || '').trim()
  return envUrl || ''
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
    const baseUrl = getBaseUrl(event)
    const query = new URLSearchParams()
    if (typeof maxJobs === 'number' && Number.isFinite(maxJobs) && maxJobs > 0) {
      query.set('maxJobs', String(maxJobs))
    }
    const backgroundUrl = `${baseUrl}/.netlify/functions/audit-site-worker-background${
      query.toString() ? `?${query.toString()}` : ''
    }`

    if (!baseUrl) {
      if (process.env.NETLIFY_DEV === 'true') {
        const fallbackResult = await processQueuedSiteAuditJobs(supabase, { maxJobs })
        return jsonResponse(200, {
          ok: true,
          mode: 'direct-fallback',
          ...fallbackResult
        })
      }
      return errorResponse(500, 'Nepodarilo sa zostavit URL pre background worker.')
    }

    const dispatch = await fetch(backgroundUrl, {
      method: 'POST'
    })

    if (!dispatch.ok && dispatch.status !== 202) {
      if (process.env.NETLIFY_DEV === 'true') {
        const fallbackResult = await processQueuedSiteAuditJobs(supabase, { maxJobs })
        return jsonResponse(200, {
          ok: true,
          mode: 'direct-fallback',
          ...fallbackResult
        })
      }
      return errorResponse(500, 'Spustenie background workeru zlyhalo.')
    }

    return jsonResponse(202, {
      ok: true,
      mode: 'dispatch-background',
      dispatched: true
    })
  } catch (error) {
    console.error('Site audit worker error:', error)
    return errorResponse(500, 'Spustenie site audit workeru zlyhalo.')
  }
}

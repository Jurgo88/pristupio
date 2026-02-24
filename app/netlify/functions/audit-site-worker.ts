import type { Handler } from '@netlify/functions'
import { createSupabaseAdminClient, errorResponse, jsonResponse, processQueuedSiteAuditJobs } from './audit-site-core'

export const config = {
  schedule: '*/1 * * * *'
}

const parseMaxJobs = (rawValue: string | undefined) => {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed) || parsed < 1) return undefined
  return Math.min(10, Math.floor(parsed))
}

const getWorkerSecret = () => (process.env.AUDIT_SITE_WORKER_SECRET || '').trim()
const isDevMode = () => process.env.NETLIFY_DEV === 'true'

const isScheduledInvocation = (event: Parameters<Handler>[0]) => {
  const marker = event.headers['x-nf-event'] || event.headers['X-Nf-Event'] || ''
  return String(marker).trim().toLowerCase() === 'schedule'
}

const isAuthorized = (headers: Record<string, string | undefined>, secret: string) => {
  const provided = headers['x-audit-site-secret'] || headers['X-Audit-Site-Secret'] || ''
  return provided === secret
}

const extractHostname = (host: string) => {
  const raw = String(host || '').trim().toLowerCase()
  if (!raw) return ''

  const ipv6 = raw.match(/^\[([^\]]+)\](?::\d+)?$/)
  if (ipv6?.[1]) return ipv6[1]

  return raw.replace(/:\d+$/, '')
}

const isLoopbackHostname = (hostname: string) => {
  const normalized = String(hostname || '').trim().toLowerCase()
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1'
}

const resolveProtoForHost = (rawProto: string | undefined, host: string) => {
  if (isLoopbackHostname(extractHostname(host))) return 'http'

  const normalizedProto = String(rawProto || '').trim().toLowerCase()
  if (normalizedProto === 'http' || normalizedProto === 'http:') return 'http'
  if (normalizedProto === 'https' || normalizedProto === 'https:') return 'https'
  return 'https'
}

const normalizeBaseUrlCandidate = (candidate: string | undefined) => {
  const value = String(candidate || '').trim().replace(/\/+$/, '')
  if (!value) return ''

  try {
    const parsed = new URL(value)
    if (isLoopbackHostname(parsed.hostname)) {
      parsed.protocol = 'http:'
    }
    return parsed.toString().replace(/\/+$/, '')
  } catch {
    return value
  }
}

const getBaseUrl = (event: Parameters<Handler>[0]) => {
  const headers = event.headers || {}
  const host = headers['x-forwarded-host'] || headers['X-Forwarded-Host'] || headers.host || headers.Host || ''
  if (host) {
    const proto = resolveProtoForHost(headers['x-forwarded-proto'] || headers['X-Forwarded-Proto'], host)
    return `${proto}://${host}`.replace(/\/+$/, '')
  }

  const envCandidates = [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.DEPLOY_URL, process.env.SITE_URL]
  for (const candidate of envCandidates) {
    const normalized = normalizeBaseUrlCandidate(candidate)
    if (normalized) return normalized
  }

  if (isDevMode()) return 'http://localhost:8888'
  return ''
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

    const scheduledInvocation = isScheduledInvocation(event)
    if (workerSecret && !scheduledInvocation && !isAuthorized(event.headers, workerSecret)) {
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
      method: 'POST',
      headers: workerSecret
        ? {
            'x-audit-site-secret': workerSecret
          }
        : undefined
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

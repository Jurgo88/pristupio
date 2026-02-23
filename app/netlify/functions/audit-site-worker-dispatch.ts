import type { HandlerEvent } from '@netlify/functions'
import { getErrorMessage } from './audit-site-observability'
import { clampNumber } from './audit-site-types'

const DEFAULT_DISPATCH_TIMEOUT_MS = clampNumber(process.env.AUDIT_SITE_DISPATCH_TIMEOUT_MS, 500, 10_000, 1_500)

const getForwardedHeader = (headers: Record<string, string | undefined>, lower: string, upper: string) => {
  return headers[lower] || headers[upper] || ''
}

export const resolveSiteAuditBaseUrl = (event?: HandlerEvent | null) => {
  const headers = event?.headers || {}
  const proto = getForwardedHeader(headers, 'x-forwarded-proto', 'X-Forwarded-Proto') || 'https'
  const host =
    getForwardedHeader(headers, 'x-forwarded-host', 'X-Forwarded-Host') || headers.host || headers.Host || ''
  if (host) return `${proto}://${host}`.replace(/\/+$/, '')

  const envCandidates = [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.DEPLOY_URL,
    process.env.SITE_URL
  ]
  for (const candidate of envCandidates) {
    const value = (candidate || '').trim()
    if (value) return value.replace(/\/+$/, '')
  }
  return ''
}

type DispatchWorkerOptions = {
  event?: HandlerEvent | null
  maxJobs?: number
  timeoutMs?: number
}

type DispatchWorkerResult = {
  dispatched: boolean
  statusCode?: number
  targetUrl?: string
  error?: string
}

export const dispatchSiteAuditWorkerBackground = async (
  options?: DispatchWorkerOptions
): Promise<DispatchWorkerResult> => {
  const baseUrl = resolveSiteAuditBaseUrl(options?.event || null)
  if (!baseUrl) {
    return {
      dispatched: false,
      error: 'Nepodarilo sa zostavit URL pre background worker.'
    }
  }

  const maxJobs = clampNumber(options?.maxJobs, 1, 10, 1)
  const timeoutMs = clampNumber(options?.timeoutMs, 500, 10_000, DEFAULT_DISPATCH_TIMEOUT_MS)
  const query = new URLSearchParams({ maxJobs: String(maxJobs) })
  const targetUrl = `${baseUrl}/.netlify/functions/audit-site-worker-background?${query.toString()}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      signal: controller.signal
    })
    return {
      dispatched: response.ok || response.status === 202,
      statusCode: response.status,
      targetUrl
    }
  } catch (error) {
    return {
      dispatched: false,
      targetUrl,
      error: getErrorMessage(error)
    }
  } finally {
    clearTimeout(timer)
  }
}

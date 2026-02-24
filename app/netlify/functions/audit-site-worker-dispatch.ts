import type { HandlerEvent } from '@netlify/functions'
import { getErrorMessage } from './audit-site-observability'
import { clampNumber } from './audit-site-types'

const DEFAULT_DISPATCH_TIMEOUT_MS = clampNumber(process.env.AUDIT_SITE_DISPATCH_TIMEOUT_MS, 500, 10_000, 1_500)
const DEFAULT_DISPATCH_MAX_ATTEMPTS = clampNumber(process.env.AUDIT_SITE_DISPATCH_MAX_ATTEMPTS, 1, 5, 3)
const DEFAULT_DISPATCH_RETRY_BASE_MS = clampNumber(process.env.AUDIT_SITE_DISPATCH_RETRY_BASE_MS, 100, 3_000, 250)
const DEFAULT_DISPATCH_RETRY_MAX_DELAY_MS = clampNumber(
  process.env.AUDIT_SITE_DISPATCH_RETRY_MAX_DELAY_MS,
  300,
  10_000,
  1_500
)
const getWorkerSecret = () => (process.env.AUDIT_SITE_WORKER_SECRET || '').trim()
const isDevMode = () => process.env.NETLIFY_DEV === 'true'

const getForwardedHeader = (headers: Record<string, string | undefined>, lower: string, upper: string) => {
  return headers[lower] || headers[upper] || ''
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

export const resolveSiteAuditBaseUrl = (event?: HandlerEvent | null) => {
  const headers = event?.headers || {}
  const host =
    getForwardedHeader(headers, 'x-forwarded-host', 'X-Forwarded-Host') || headers.host || headers.Host || ''
  if (host) {
    const proto = resolveProtoForHost(getForwardedHeader(headers, 'x-forwarded-proto', 'X-Forwarded-Proto'), host)
    return `${proto}://${host}`.replace(/\/+$/, '')
  }

  const envCandidates = [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.DEPLOY_URL,
    process.env.SITE_URL
  ]
  for (const candidate of envCandidates) {
    const normalized = normalizeBaseUrlCandidate(candidate)
    if (normalized) return normalized
  }
  if (isDevMode()) return 'http://localhost:8888'
  return ''
}

type DispatchWorkerOptions = {
  event?: HandlerEvent | null
  maxJobs?: number
  timeoutMs?: number
  maxAttempts?: number
}

type DispatchWorkerResult = {
  dispatched: boolean
  attemptsUsed: number
  statusCode?: number
  targetUrl?: string
  error?: string
}

const waitMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const shouldRetryDispatchStatus = (statusCode: number) => {
  return (
    statusCode === 408 ||
    statusCode === 425 ||
    statusCode === 429 ||
    statusCode === 500 ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504
  )
}

const computeRetryDelayMs = (attempt: number) => {
  const exponent = Math.max(0, attempt - 1)
  const jitter = Math.floor(Math.random() * 120)
  return Math.min(
    DEFAULT_DISPATCH_RETRY_MAX_DELAY_MS,
    DEFAULT_DISPATCH_RETRY_BASE_MS * 2 ** exponent + jitter
  )
}

export const dispatchSiteAuditWorkerBackground = async (
  options?: DispatchWorkerOptions
): Promise<DispatchWorkerResult> => {
  const baseUrl = resolveSiteAuditBaseUrl(options?.event || null)
  if (!baseUrl) {
    return {
      dispatched: false,
      attemptsUsed: 0,
      error: 'Nepodarilo sa zostavit URL pre background worker.'
    }
  }

  const workerSecret = getWorkerSecret()
  if (!workerSecret && !isDevMode()) {
    return {
      dispatched: false,
      attemptsUsed: 0,
      error: 'Chyba konfiguracia worker secretu.'
    }
  }

  const maxJobs = clampNumber(options?.maxJobs, 1, 10, 1)
  const timeoutMs = clampNumber(options?.timeoutMs, 500, 10_000, DEFAULT_DISPATCH_TIMEOUT_MS)
  const maxAttempts = clampNumber(options?.maxAttempts, 1, 5, DEFAULT_DISPATCH_MAX_ATTEMPTS)
  const query = new URLSearchParams({ maxJobs: String(maxJobs) })
  const targetUrl = `${baseUrl}/.netlify/functions/audit-site-worker-background?${query.toString()}`
  const headers = workerSecret ? { 'x-audit-site-secret': workerSecret } : undefined

  let lastStatusCode: number | undefined
  let lastError = ''

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        signal: controller.signal
      })

      const dispatched = response.ok || response.status === 202
      if (dispatched) {
        return {
          dispatched: true,
          attemptsUsed: attempt,
          statusCode: response.status,
          targetUrl
        }
      }

      lastStatusCode = response.status
      lastError = `Dispatch endpoint returned status ${response.status}.`
      if (!shouldRetryDispatchStatus(response.status) || attempt >= maxAttempts) {
        return {
          dispatched: false,
          attemptsUsed: attempt,
          statusCode: response.status,
          targetUrl,
          error: lastError
        }
      }
    } catch (error) {
      lastError = getErrorMessage(error)
      if (attempt >= maxAttempts) {
        return {
          dispatched: false,
          attemptsUsed: attempt,
          statusCode: lastStatusCode,
          targetUrl,
          error: lastError
        }
      }
    } finally {
      clearTimeout(timer)
    }

    await waitMs(computeRetryDelayMs(attempt))
  }

  return {
    dispatched: false,
    attemptsUsed: maxAttempts,
    statusCode: lastStatusCode,
    targetUrl,
    error: lastError || 'Dispatch failed after retries.'
  }
}

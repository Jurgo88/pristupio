import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { TRACKING_QUERY_PARAMS } from './audit-site-types'

const PRIVATE_HOST_SUFFIXES = ['.local', '.internal', '.localhost', '.home.arpa']

const DEFAULT_ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

const isLocalHostname = (hostname: string) => {
  const value = hostname.trim().toLowerCase()
  if (!value) return true
  if (value === 'localhost') return true
  if (value.endsWith('.localhost')) return true
  return PRIVATE_HOST_SUFFIXES.some((suffix) => value.endsWith(suffix))
}

const stripIpv6ZoneId = (ip: string) => {
  const marker = ip.indexOf('%')
  if (marker <= 0) return ip
  return ip.slice(0, marker)
}

const isPrivateIpv4 = (ip: string) => {
  const parts = ip.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part < 0 || part > 255)) return true

  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a >= 224) return true
  return false
}

const isPrivateIpv6 = (rawIp: string) => {
  const ip = stripIpv6ZoneId(rawIp).toLowerCase()
  if (ip === '::1' || ip === '::') return true
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true
  if (ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) return true
  if (ip.startsWith('::ffff:')) {
    const mapped = ip.split('::ffff:')[1]
    if (mapped && isIP(mapped) === 4) {
      return isPrivateIpv4(mapped)
    }
  }
  return false
}

const isPrivateIpAddress = (ip: string) => {
  const version = isIP(ip)
  if (version === 4) return isPrivateIpv4(ip)
  if (version === 6) return isPrivateIpv6(ip)
  return true
}

const shouldAllowPrivateTargets = () => process.env.AUDIT_SITE_ALLOW_PRIVATE_TARGETS === 'true'

const normalizePathname = (pathname: string) => pathname.replace(/\/{2,}/g, '/')

const stripTrackingParams = (url: URL) => {
  const keys = Array.from(url.searchParams.keys())
  for (const key of keys) {
    if (TRACKING_QUERY_PARAMS.includes(key.toLowerCase())) {
      url.searchParams.delete(key)
    }
  }
}

const normalizeDefaultPort = (url: URL) => {
  if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) {
    url.port = ''
  }
}

export const normalizeUrlForCompare = (rawUrl: string) => {
  const parsed = new URL(rawUrl)
  parsed.hash = ''
  parsed.username = ''
  parsed.password = ''
  parsed.hostname = parsed.hostname.toLowerCase()
  parsed.pathname = normalizePathname(parsed.pathname).replace(/\/+$/, '') || '/'
  normalizeDefaultPort(parsed)
  stripTrackingParams(parsed)

  const sorted = Array.from(parsed.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b))
  parsed.search = ''
  for (const [key, value] of sorted) {
    parsed.searchParams.append(key, value)
  }

  return parsed.toString()
}

export const normalizeAuditUrl = (rawUrl: unknown): string | null => {
  if (typeof rawUrl !== 'string') return null
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`
  try {
    const parsed = new URL(withProtocol)
    if (!DEFAULT_ALLOWED_PROTOCOLS.has(parsed.protocol)) return null
    return normalizeUrlForCompare(parsed.toString())
  } catch {
    return null
  }
}

const isSafeParsedTarget = (target: URL) => {
  if (!DEFAULT_ALLOWED_PROTOCOLS.has(target.protocol)) return false
  if (target.username || target.password) return false
  if (!target.hostname) return false
  if (isLocalHostname(target.hostname)) return false
  return true
}

const resolveHostAddresses = async (hostname: string) => {
  try {
    const records = await lookup(hostname, { all: true, verbatim: true })
    return records.map((item) => item.address).filter(Boolean)
  } catch {
    return [] as string[]
  }
}

export const ensurePublicHttpUrl = async (rawUrl: string) => {
  const parsed = new URL(rawUrl)
  if (!isSafeParsedTarget(parsed)) {
    throw new Error('Unsafe target URL. SSRF protection blocked this URL.')
  }

  if (shouldAllowPrivateTargets()) return

  const directIpVersion = isIP(parsed.hostname)
  if (directIpVersion !== 0 && isPrivateIpAddress(parsed.hostname)) {
    throw new Error('Unsafe target URL. Private network targets are not allowed.')
  }

  const addresses = await resolveHostAddresses(parsed.hostname)
  if (addresses.length === 0) {
    throw new Error('Unsafe target URL. DNS resolution failed.')
  }

  if (addresses.some((address) => isPrivateIpAddress(address))) {
    throw new Error('Unsafe target URL. Private network targets are not allowed.')
  }
}

export const isInternalHost = (candidateHost: string, rootHost: string) => {
  return candidateHost.trim().toLowerCase() === rootHost.trim().toLowerCase()
}

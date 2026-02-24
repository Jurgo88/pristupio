import type { HandlerEvent } from '@netlify/functions'
import {
  canStartSiteAudit,
  cancelSiteAuditJob,
  checkSiteAuditStartRateLimit,
  createSiteAuditJob,
  createSupabaseAdminClient,
  getExistingActiveSiteAuditJob,
  getSiteAuditJobForUser,
  getSiteAuditResult,
  loadSiteAuditProfile,
  normalizeRequestedMaxDepth,
  normalizeRequestedPagesLimit,
  normalizeSiteAuditLocale,
  normalizeSiteAuditMode,
  normalizeSiteAuditTier
} from './audit-site-persistence'
import { normalizeAuditUrl, ensurePublicHttpUrl } from './audit-site-security'
import { processQueuedSiteAuditJobs } from './audit-site-service'
import type {
  Impact,
  SiteAuditLocale,
  SiteAuditMode,
  SiteAuditStatus,
  SiteAuditTier
} from './audit-site-types'

export type {
  SiteAuditJobRow,
  SiteAuditPageRow,
  SiteAuditProfile,
  SupabaseAdminClient
} from './audit-site-types'

export type { SiteAuditMode, SiteAuditStatus, SiteAuditLocale, SiteAuditTier, Impact }

export {
  canStartSiteAudit,
  cancelSiteAuditJob,
  checkSiteAuditStartRateLimit,
  createSiteAuditJob,
  createSupabaseAdminClient,
  getExistingActiveSiteAuditJob,
  getSiteAuditJobForUser,
  getSiteAuditResult,
  loadSiteAuditProfile,
  normalizeRequestedMaxDepth,
  normalizeRequestedPagesLimit,
  normalizeSiteAuditLocale,
  normalizeSiteAuditMode,
  normalizeSiteAuditTier,
  processQueuedSiteAuditJobs
}

export const ensureSafeAuditRootUrl = async (url: string) => {
  await ensurePublicHttpUrl(url)
}

export const getBearerToken = (event: HandlerEvent) => {
  const authHeader = event.headers.authorization || event.headers.Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.replace('Bearer ', '').trim()
}

export const getAuthUser = async (supabase: any, token: string) => {
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.id) {
    return { userId: null, error: 'Neplatne prihlasenie.' }
  }
  return { userId: data.user.id as string, error: null }
}

export const jsonResponse = (
  statusCode: number,
  payload: Record<string, unknown>,
  extraHeaders?: Record<string, string>
) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    ...(extraHeaders || {})
  },
  body: JSON.stringify(payload)
})

export const errorResponse = (statusCode: number, message: string) => jsonResponse(statusCode, { error: message })

export { normalizeAuditUrl }


import type { Handler } from '@netlify/functions'
import * as crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || ''

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null

const monitoringBasicVariantIds = new Set(
  (process.env.LEMON_MONITORING_BASIC_VARIANT_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
)
const monitoringProVariantIds = new Set(
  (process.env.LEMON_MONITORING_PRO_VARIANT_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
)
const auditBasicVariantIds = new Set(
  (process.env.LEMON_AUDIT_BASIC_VARIANT_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
)
const auditProVariantIds = new Set(
  (process.env.LEMON_AUDIT_PRO_VARIANT_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
)

const legacyMonitoringVariantIds = new Set(
  (process.env.LEMON_MONITORING_VARIANT_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
)
const legacyAuditVariantIds = new Set(
  (process.env.LEMON_AUDIT_VARIANT_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
)

const getHeader = (headers: Record<string, string | undefined>, name: string) => {
  const direct = headers[name]
  if (direct) return direct
  const lower = name.toLowerCase()
  return headers[lower]
}

const verifySignature = (rawBody: string, signature: string, secret: string) => {
  const hmac = crypto.createHmac('sha256', secret)
  const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8')
  const signatureBuffer = Buffer.from(signature || '', 'utf8')
  if (digest.length !== signatureBuffer.length) return false
  return crypto.timingSafeEqual(digest, signatureBuffer)
}

type PurchaseType = 'audit' | 'monitoring'
type PurchaseTier = 'basic' | 'pro'

const pickVariantId = (payload: any): string => {
  const candidates = [
    payload?.data?.attributes?.first_order_item?.variant_id,
    payload?.data?.attributes?.first_order_item?.variantId,
    payload?.data?.attributes?.variant_id,
    payload?.data?.attributes?.variantId,
    payload?.meta?.custom_data?.variant_id
  ]

  for (const value of candidates) {
    if (value === null || typeof value === 'undefined') continue
    const normalized = String(value).trim()
    if (normalized) return normalized
  }
  return ''
}

const normalizeTier = (value: unknown): PurchaseTier | null => {
  if (value === 'pro') return 'pro'
  if (value === 'basic') return 'basic'
  return null
}

const getAuditCreditsByTier = (tier: PurchaseTier) => (tier === 'pro' ? 15 : 5)

const getMonitoringLimitsByTier = (tier: PurchaseTier) => {
  if (tier === 'pro') {
    return {
      domains: 8,
      monthlyRuns: 8
    }
  }

  return {
    domains: 2,
    monthlyRuns: 4
  }
}

const resolvePurchase = (payload: any): { type: PurchaseType; tier: PurchaseTier } => {
  const customType = payload?.meta?.custom_data?.purchase_type
  const customTier = normalizeTier(payload?.meta?.custom_data?.purchase_tier)
  if (customType === 'monitoring') return { type: 'monitoring', tier: customTier || 'basic' }
  if (customType === 'audit') return { type: 'audit', tier: customTier || 'basic' }

  const variantId = pickVariantId(payload)
  if (variantId && monitoringProVariantIds.has(variantId)) return { type: 'monitoring', tier: 'pro' }
  if (variantId && monitoringBasicVariantIds.has(variantId)) return { type: 'monitoring', tier: 'basic' }
  if (variantId && auditProVariantIds.has(variantId)) return { type: 'audit', tier: 'pro' }
  if (variantId && auditBasicVariantIds.has(variantId)) return { type: 'audit', tier: 'basic' }

  if (variantId && legacyMonitoringVariantIds.has(variantId)) return { type: 'monitoring', tier: 'basic' }
  if (variantId && legacyAuditVariantIds.has(variantId)) return { type: 'audit', tier: 'basic' }

  const anyMonitoringConfigured =
    monitoringBasicVariantIds.size > 0 || monitoringProVariantIds.size > 0 || legacyMonitoringVariantIds.size > 0
  const anyAuditConfigured =
    auditBasicVariantIds.size > 0 || auditProVariantIds.size > 0 || legacyAuditVariantIds.size > 0

  if (anyMonitoringConfigured && !anyAuditConfigured) return { type: 'monitoring', tier: 'basic' }
  return { type: 'audit', tier: 'basic' }
}

const loadProfileByUser = async (userId?: string, userEmail?: string) => {
  if (!supabase) return { data: null, error: new Error('Missing supabase.') }

  const profileQuery = supabase
    .from('profiles')
    .select(
      'id, role, plan, paid_audit_completed, paid_audit_credits, audit_tier, monitoring_active, monitoring_until, monitoring_tier'
    )

  if (userId) return profileQuery.eq('id', userId).maybeSingle()
  if (userEmail) return profileQuery.eq('email', userEmail).maybeSingle()
  return { data: null, error: null } as any
}

const unlockLatestFreeAudit = async (userId: string) => {
  if (!supabase || !userId) return false

  const { data: freeAudit, error: freeAuditError } = await supabase
    .from('audits')
    .select('id')
    .eq('user_id', userId)
    .eq('audit_kind', 'free')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (freeAuditError || !freeAudit?.id) return false

  const { error: upgradeError } = await supabase
    .from('audits')
    .update({ audit_kind: 'paid' })
    .eq('id', freeAudit.id)

  if (upgradeError) {
    console.error('Lemon webhook free-audit upgrade error:', upgradeError)
    return false
  }

  return true
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    if (!supabase || !webhookSecret) {
      return { statusCode: 500, body: 'Missing server configuration.' }
    }

    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : event.body || ''

    const signature = getHeader(event.headers, 'X-Signature') || ''
    if (!signature || !verifySignature(rawBody, signature, webhookSecret)) {
      return { statusCode: 401, body: 'Invalid signature.' }
    }

    const payload = JSON.parse(rawBody || '{}')
    const eventName =
      getHeader(event.headers, 'X-Event-Name') || payload?.meta?.event_name || 'unknown'

    if (eventName !== 'order_created' && eventName !== 'order_refunded') {
      return { statusCode: 200, body: 'Ignored event.' }
    }

    const customData = payload?.meta?.custom_data || {}
    const userId = customData?.user_id
    const userEmail = payload?.data?.attributes?.user_email

    if (!userId && !userEmail) {
      return { statusCode: 200, body: 'No user mapping provided.' }
    }

    const purchase = resolvePurchase(payload)
    const purchaseType = purchase.type as PurchaseType
    const purchaseTier = purchase.tier

    if (eventName === 'order_refunded') {
      const profileResult = await loadProfileByUser(userId, userEmail)
      if (!profileResult.data?.id) {
        return { statusCode: 200, body: 'OK' }
      }

      const updatePayload =
        purchaseType === 'monitoring'
          ? {
              monitoring_active: false,
              monitoring_until: null,
              monitoring_tier: 'none',
              monitoring_domains_limit: 0,
              monitoring_monthly_runs: 0
            }
          : (() => {
              const currentCredits = Number(profileResult.data?.paid_audit_credits || 0)
              const refundCredits = getAuditCreditsByTier(purchaseTier)
              const nextCredits = Math.max(0, currentCredits - refundCredits)
              return {
                plan: nextCredits > 0 ? 'paid' : 'free',
                paid_audit_credits: nextCredits,
                audit_tier: nextCredits > 0 ? (profileResult.data?.audit_tier || 'basic') : 'none'
              }
            })()
      const updateResult = await supabase.from('profiles').update(updatePayload).eq('id', profileResult.data.id)

      if (updateResult.error) {
        console.error('Lemon webhook update error:', updateResult.error)
        return { statusCode: 500, body: 'Profile update failed.' }
      }

      return { statusCode: 200, body: 'OK' }
    }

    const profileResult = await loadProfileByUser(userId, userEmail)

    if (!profileResult.data?.id) {
      if (purchaseType === 'monitoring') {
        return { statusCode: 200, body: 'Monitoring skipped: base audit prerequisite missing.' }
      }

      if (!userId) {
        return { statusCode: 200, body: 'Missing user id for profile insert.' }
      }

      const insertResult = await supabase.from('profiles').insert({
        id: userId,
        email: userEmail || null,
        plan: 'paid',
        free_audit_used: false,
        paid_audit_completed: false,
        consent_marketing: false,
        paid_audit_credits: getAuditCreditsByTier(purchaseTier),
        audit_tier: purchaseTier,
        monitoring_active: false,
        monitoring_until: null,
        monitoring_tier: 'none',
        monitoring_domains_limit: 0,
        monitoring_monthly_runs: 0
      })

      if (insertResult.error) {
        console.error('Lemon webhook insert error:', insertResult.error)
        return { statusCode: 500, body: 'Profile insert failed.' }
      }

      return { statusCode: 200, body: 'OK' }
    }

    const hasMonitoringPrerequisite =
      profileResult.data.role === 'admin' || !!profileResult.data.paid_audit_completed
    if (purchaseType === 'monitoring' && !hasMonitoringPrerequisite) {
      return { statusCode: 200, body: 'Monitoring skipped: base audit prerequisite missing.' }
    }

    const updatePayload =
      purchaseType === 'monitoring'
        ? {
            monitoring_active: true,
            monitoring_until: null,
            monitoring_tier: purchaseTier,
            monitoring_domains_limit: getMonitoringLimitsByTier(purchaseTier).domains,
            monitoring_monthly_runs: getMonitoringLimitsByTier(purchaseTier).monthlyRuns
          }
        : {
            plan: 'paid',
            paid_audit_credits:
              Number(profileResult.data?.paid_audit_credits || 0) + getAuditCreditsByTier(purchaseTier),
            audit_tier: purchaseTier
          }

    const updateResult = await supabase.from('profiles').update(updatePayload).eq('id', profileResult.data.id)

    if (updateResult.error) {
      console.error('Lemon webhook update error:', updateResult.error)
      return { statusCode: 500, body: 'Profile update failed.' }
    }

    if (purchaseType === 'audit') {
      const unlocked = await unlockLatestFreeAudit(profileResult.data.id)
      if (unlocked) {
        const { error: paidAuditCompletedError } = await supabase
          .from('profiles')
          .update({ paid_audit_completed: true })
          .eq('id', profileResult.data.id)
          .eq('paid_audit_completed', false)

        if (paidAuditCompletedError) {
          console.error('Lemon webhook paid_audit_completed update error:', paidAuditCompletedError)
        }
      }
    }

    return { statusCode: 200, body: 'OK' }
  } catch (error: any) {
    console.error('Lemon webhook error:', error?.message || error)
    return { statusCode: 500, body: 'Webhook error.' }
  }
}

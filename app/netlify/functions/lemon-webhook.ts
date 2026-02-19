import type { Handler } from '@netlify/functions'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || ''

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null

const monitoringVariantIds = new Set(
  (process.env.LEMON_MONITORING_VARIANT_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
)
const auditVariantIds = new Set(
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

const resolvePurchaseType = (payload: any): PurchaseType => {
  const customType = payload?.meta?.custom_data?.purchase_type
  if (customType === 'monitoring') return 'monitoring'
  if (customType === 'audit') return 'audit'

  const variantId = pickVariantId(payload)
  if (variantId && monitoringVariantIds.has(variantId)) return 'monitoring'
  if (variantId && auditVariantIds.has(variantId)) return 'audit'

  if (monitoringVariantIds.size > 0 && auditVariantIds.size === 0) return 'monitoring'
  return 'audit'
}

const loadProfileByUser = async (userId?: string, userEmail?: string) => {
  if (!supabase) return { data: null, error: new Error('Missing supabase.') }

  const profileQuery = supabase
    .from('profiles')
    .select('id, role, paid_audit_completed, paid_audit_credits, monitoring_active, monitoring_until')

  if (userId) return profileQuery.eq('id', userId).maybeSingle()
  if (userEmail) return profileQuery.eq('email', userEmail).maybeSingle()
  return { data: null, error: null } as any
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

    const purchaseType = resolvePurchaseType(payload)

    if (eventName === 'order_refunded') {
      const updatePayload =
        purchaseType === 'monitoring'
          ? { monitoring_active: false, monitoring_until: null }
          : { plan: 'free', paid_audit_credits: 0 }
      const query = supabase.from('profiles').update(updatePayload)
      const updateResult = userId
        ? await query.eq('id', userId)
        : await query.eq('email', userEmail)

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
        plan: purchaseType === 'audit' ? 'paid' : 'free',
        free_audit_used: false,
        paid_audit_completed: false,
        consent_marketing: false,
        paid_audit_credits: purchaseType === 'audit' ? 1 : 0,
        monitoring_active: purchaseType === 'monitoring',
        monitoring_until: null
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
            monitoring_until: null
          }
        : {
            plan: 'paid',
            paid_audit_credits: Number(profileResult.data?.paid_audit_credits || 0) + 1
          }

    const updateResult = await supabase.from('profiles').update(updatePayload).eq('id', profileResult.data.id)

    if (updateResult.error) {
      console.error('Lemon webhook update error:', updateResult.error)
      return { statusCode: 500, body: 'Profile update failed.' }
    }

    return { statusCode: 200, body: 'OK' }
  } catch (error: any) {
    console.error('Lemon webhook error:', error?.message || error)
    return { statusCode: 500, body: 'Webhook error.' }
  }
}

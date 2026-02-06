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

    const planValue = eventName === 'order_refunded' ? 'free' : 'paid'
    const query = supabase.from('profiles').update({ plan: planValue })

    const updateResult = userId
      ? await query.eq('id', userId)
      : await query.eq('email', userEmail)

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

import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null

const isMonitoringAllowed = (profile: { plan?: string | null; role?: string | null } | null) => {
  if (!profile) return false
  return profile.plan === 'paid' || profile.role === 'admin'
}

export const handler: Handler = async (event) => {
  try {
    if (!supabase) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Supabase config missing.' }) }
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
    }

    const authHeader = event.headers.authorization || event.headers.Authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Chyba autorizacia.' }) }
    }

    const token = authHeader.replace('Bearer ', '').trim()
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Neplatne prihlasenie.' }) }
    }

    let body: Record<string, unknown> = {}
    try {
      body = JSON.parse(event.body || '{}')
    } catch (_error) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Neplatny request payload.' }) }
    }

    const targetId = String(body.targetId || '').trim()
    const active = body.active

    if (!targetId || typeof active !== 'boolean') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Chybaju parametre monitoringu.' }) }
    }

    if (active) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('plan, role')
        .eq('id', userData.user.id)
        .maybeSingle()

      if (!isMonitoringAllowed(profileData || null)) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'Monitoring je dostupny len v platenom plane.' })
        }
      }
    }

    const nowIso = new Date().toISOString()
    const nextRunAt = active ? nowIso : null

    const { data: updated, error: updateError } = await supabase
      .from('monitor_targets')
      .update({
        active,
        next_run_at: nextRunAt,
        updated_at: nowIso
      })
      .eq('id', targetId)
      .eq('user_id', userData.user.id)
      .select('id, url, profile, frequency_days, active, next_run_at, last_run_at, last_status, last_error, created_at')
      .single()

    if (updateError || !updated) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Monitoring target neexistuje.' }) }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: updated })
    }
  } catch (error: any) {
    console.error('Monitoring toggle error:', error?.message || error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Monitoring sa nepodarilo upravit.' }) }
  }
}

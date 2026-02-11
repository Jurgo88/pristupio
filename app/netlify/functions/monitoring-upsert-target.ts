import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null

const normalizeTargetUrl = (rawUrl: unknown) => {
  const value = String(rawUrl || '').trim()
  if (!value || value.length > 2048) return null

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`

  try {
    const parsed = new URL(withProtocol)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    if (parsed.username || parsed.password) return null
    parsed.hash = ''
    return parsed.toString()
  } catch (_error) {
    return null
  }
}

const clampFrequencyDays = (value: unknown) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 14
  return Math.min(30, Math.max(1, Math.round(numeric)))
}

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

    let body: Record<string, unknown> = {}
    try {
      body = JSON.parse(event.body || '{}')
    } catch (_error) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Neplatny request payload.' }) }
    }

    const normalizedUrl = normalizeTargetUrl(body.url)
    if (!normalizedUrl) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Neplatna URL adresa.' }) }
    }

    const frequencyDays = clampFrequencyDays(body.frequencyDays)
    const profile = body.profile === 'eaa' ? 'eaa' : 'wad'
    const nowIso = new Date().toISOString()

    const { data: existingTarget } = await supabase
      .from('monitor_targets')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('url', normalizedUrl)
      .maybeSingle()

    if (existingTarget?.id) {
      const { data: updated, error: updateError } = await supabase
        .from('monitor_targets')
        .update({
          profile,
          frequency_days: frequencyDays,
          active: true,
          next_run_at: nowIso,
          updated_at: nowIso
        })
        .eq('id', existingTarget.id)
        .eq('user_id', userData.user.id)
        .select(
          'id, url, profile, frequency_days, active, next_run_at, last_run_at, last_status, last_error, created_at'
        )
        .single()

      if (updateError) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Ulozenie monitoringu zlyhalo.' }) }
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: updated })
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from('monitor_targets')
      .insert({
        user_id: userData.user.id,
        url: normalizedUrl,
        profile,
        frequency_days: frequencyDays,
        active: true,
        next_run_at: nowIso
      })
      .select(
        'id, url, profile, frequency_days, active, next_run_at, last_run_at, last_status, last_error, created_at'
      )
      .single()

    if (insertError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Ulozenie monitoringu zlyhalo.' }) }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: inserted })
    }
  } catch (error: any) {
    console.error('Monitoring upsert error:', error?.message || error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Monitoring sa nepodarilo ulozit.' }) }
  }
}

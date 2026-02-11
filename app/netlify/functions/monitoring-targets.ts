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

    const canManage = isMonitoringAllowed(profileData || null)

    const { data: targets, error: targetsError } = await supabase
      .from('monitor_targets')
      .select('id, url, profile, frequency_days, active, next_run_at, last_run_at, last_status, last_error, created_at')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })

    if (targetsError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Nacitanie monitoringu zlyhalo.' }) }
    }

    const targetList = Array.isArray(targets) ? targets : []
    const targetIds = targetList.map((target) => target.id).filter(Boolean)

    const latestRuns = new Map<string, any>()
    if (targetIds.length > 0) {
      const { data: runs } = await supabase
        .from('monitor_runs')
        .select('target_id, status, score, summary, top_issues, delta, error, completed_at, created_at')
        .in('target_id', targetIds)
        .order('created_at', { ascending: false })
        .limit(Math.max(50, targetIds.length * 10))

      if (Array.isArray(runs)) {
        for (const run of runs) {
          const targetId = run?.target_id
          if (!targetId || latestRuns.has(targetId)) continue
          latestRuns.set(targetId, run)
        }
      }
    }

    const payload = targetList.map((target) => ({
      ...target,
      latest_run: latestRuns.get(target.id) || null
    }))

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets: payload, canManage })
    }
  } catch (error: any) {
    console.error('Monitoring targets error:', error?.message || error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Monitoring sa nepodarilo nacitat.' }) }
  }
}

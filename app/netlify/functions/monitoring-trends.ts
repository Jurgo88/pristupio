import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null

const parseLimit = (raw: string | undefined) => {
  const parsed = Number(raw || 12)
  if (!Number.isFinite(parsed)) return 12
  return Math.min(30, Math.max(5, Math.round(parsed)))
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

    const limit = parseLimit(event.queryStringParameters?.limit)
    const { data: targets, error: targetsError } = await supabase
      .from('monitor_targets')
      .select('id')
      .eq('user_id', userData.user.id)

    if (targetsError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Nacitanie trendov zlyhalo.' }) }
    }

    const targetIds = (targets || []).map((target: any) => target.id).filter(Boolean)
    if (targetIds.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trends: {} })
      }
    }

    const maxRows = Math.min(2000, targetIds.length * limit * 3)
    const { data: runs, error: runsError } = await supabase
      .from('monitor_runs')
      .select('target_id, score, summary, completed_at, created_at')
      .in('target_id', targetIds)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(maxRows)

    if (runsError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Nacitanie trendov zlyhalo.' }) }
    }

    const grouped = new Map<string, any[]>()
    for (const run of runs || []) {
      const targetId = run?.target_id
      if (!targetId) continue
      if (!grouped.has(targetId)) {
        grouped.set(targetId, [])
      }
      const entries = grouped.get(targetId) || []
      if (entries.length >= limit) continue

      entries.push({
        score: typeof run.score === 'number' ? run.score : null,
        total: Number(run.summary?.total || 0),
        created_at: run.created_at,
        completed_at: run.completed_at || null
      })
      grouped.set(targetId, entries)
    }

    const trends = Object.fromEntries(
      Array.from(grouped.entries()).map(([targetId, items]) => [targetId, [...items].reverse()])
    )

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trends })
    }
  } catch (error: any) {
    console.error('Monitoring trends error:', error?.message || error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Trendy sa nepodarilo nacitat.' }) }
  }
}

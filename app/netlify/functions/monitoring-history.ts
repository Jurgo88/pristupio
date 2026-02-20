import type { Handler } from '@netlify/functions'
import {
  createSupabaseAdminClient,
  getAuthUser,
  getBearerToken,
  getMonitoringTargetById,
  getMonitoringTargets
} from './monitoring-core'

const jsonResponse = (statusCode: number, payload: Record<string, unknown>) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})

const errorResponse = (statusCode: number, message: string) => jsonResponse(statusCode, { error: message })

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.floor(parsed)
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return errorResponse(405, 'Method not allowed.')
    }

    const supabase = createSupabaseAdminClient()
    if (!supabase) {
      return errorResponse(500, 'Supabase config missing.')
    }

    const token = getBearerToken(event)
    if (!token) {
      return errorResponse(401, 'Authorization missing.')
    }

    const auth = await getAuthUser(supabase, token)
    if (!auth.userId) {
      return errorResponse(401, auth.error || 'Invalid login.')
    }

    const requestedTargetId = (event.queryStringParameters?.targetId || '').trim()
    const targetIds: string[] = []

    if (requestedTargetId) {
      const targetResult = await getMonitoringTargetById(supabase, auth.userId, requestedTargetId)
      if (targetResult.error) {
        return errorResponse(500, 'Monitoring target load failed. Apply monitoring migration first.')
      }
      if (targetResult.data?.id) targetIds.push(targetResult.data.id)
    } else {
      const targetsResult = await getMonitoringTargets(supabase, auth.userId)
      if (targetsResult.error) {
        return errorResponse(500, 'Monitoring target load failed. Apply monitoring migration first.')
      }
      ;(targetsResult.data || []).forEach((target: any) => {
        if (target?.id) targetIds.push(target.id)
      })
    }

    if (targetIds.length === 0) {
      return jsonResponse(200, {
        runs: [],
        hasMore: false,
        page: 1
      })
    }

    const page = parsePositiveInt(event.queryStringParameters?.page, 1)
    const limit = Math.min(50, parsePositiveInt(event.queryStringParameters?.limit, 20))
    const from = (page - 1) * limit
    const to = from + limit

    const { data, error } = await supabase
      .from('monitoring_runs')
      .select(
        'id, target_id, trigger, run_url, status, audit_id, summary_json, diff_json, error_message, started_at, finished_at'
      )
      .in('target_id', targetIds)
      .order('started_at', { ascending: false })
      .range(from, to)

    if (error) {
      return errorResponse(500, 'Monitoring history load failed.')
    }

    const safeRuns = Array.isArray(data) ? data : []
    const hasMore = safeRuns.length > limit

    return jsonResponse(200, {
      runs: safeRuns.slice(0, limit),
      hasMore,
      page
    })
  } catch (error) {
    console.error('Monitoring history error:', error)
    return errorResponse(500, 'Monitoring history load failed.')
  }
}

import type { Handler } from '@netlify/functions'
import {
  createSupabaseAdminClient,
  getAuthUser,
  getBearerToken,
  getLatestAuditUrl,
  getMonitoringTarget,
  hasMonitoringAccess,
  loadMonitoringEntitlement
} from './monitoring-core'

const jsonResponse = (statusCode: number, payload: Record<string, unknown>) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})

const errorResponse = (statusCode: number, message: string) => jsonResponse(statusCode, { error: message })

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

    const [entitlement, targetResult, latestAuditUrl] = await Promise.all([
      loadMonitoringEntitlement(supabase, auth.userId),
      getMonitoringTarget(supabase, auth.userId),
      getLatestAuditUrl(supabase, auth.userId)
    ])

    if (targetResult.error) {
      return errorResponse(500, 'Monitoring target load failed. Apply monitoring migration first.')
    }

    let latestRun: Record<string, unknown> | null = null
    if (targetResult.data?.id) {
      const { data: runData } = await supabase
        .from('monitoring_runs')
        .select('id, trigger, run_url, status, audit_id, summary_json, diff_json, error_message, started_at, finished_at')
        .eq('target_id', targetResult.data.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      latestRun = runData || null
    }

    return jsonResponse(200, {
      entitlement: {
        ...entitlement,
        hasAccess: hasMonitoringAccess(entitlement)
      },
      latestAuditUrl,
      target: targetResult.data || null,
      latestRun
    })
  } catch (error) {
    console.error('Monitoring status error:', error)
    return errorResponse(500, 'Monitoring status failed.')
  }
}

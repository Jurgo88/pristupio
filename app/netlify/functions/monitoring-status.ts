import type { Handler } from '@netlify/functions'
import {
  createSupabaseAdminClient,
  getAuthUser,
  getBearerToken,
  getLatestAuditUrl,
  getMonitoringTargets,
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
      return errorResponse(405, 'Metoda nie je povolena.')
    }

    const supabase = createSupabaseAdminClient()
    if (!supabase) {
      return errorResponse(500, 'Chyba konfiguracia Supabase.')
    }

    const token = getBearerToken(event)
    if (!token) {
      return errorResponse(401, 'Chyba autorizacia.')
    }

    const auth = await getAuthUser(supabase, token)
    if (!auth.userId) {
      return errorResponse(401, auth.error || 'Neplatne prihlasenie.')
    }

    const [entitlement, targetsResult, latestAuditUrl] = await Promise.all([
      loadMonitoringEntitlement(supabase, auth.userId),
      getMonitoringTargets(supabase, auth.userId),
      getLatestAuditUrl(supabase, auth.userId)
    ])

    if (targetsResult.error) {
      return errorResponse(500, 'Nacitanie cielov monitoringu zlyhalo. Najprv aplikujte monitoring migraciu.')
    }

    const targets = targetsResult.data || []
    const primaryTarget = targets[0] || null

    let latestRun: Record<string, unknown> | null = null
    const latestSuccessRunByTarget: Record<string, Record<string, unknown>> = {}
    if (primaryTarget?.id) {
      const { data: runData } = await supabase
        .from('monitoring_runs')
        .select('id, trigger, run_url, status, audit_id, summary_json, diff_json, error_message, started_at, finished_at')
        .eq('target_id', primaryTarget.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      latestRun = runData || null
    }

    if (targets.length > 0) {
      const targetIds = targets.map((target: any) => target?.id).filter(Boolean)
      const { data: runs } = await supabase
        .from('monitoring_runs')
        .select('id, target_id, trigger, run_url, status, audit_id, summary_json, diff_json, error_message, started_at, finished_at')
        .in('target_id', targetIds)
        .eq('status', 'success')
        .order('started_at', { ascending: false })
        .limit(Math.max(20, targetIds.length * 4))

      ;(runs || []).forEach((run: any) => {
        const targetId = typeof run?.target_id === 'string' ? run.target_id : ''
        if (!targetId || latestSuccessRunByTarget[targetId]) return
        latestSuccessRunByTarget[targetId] = run
      })
    }

    return jsonResponse(200, {
      entitlement: {
        ...entitlement,
        hasAccess: hasMonitoringAccess(entitlement)
      },
      latestAuditUrl,
      target: primaryTarget,
      targets,
      latestRun,
      latestSuccessRunByTarget
    })
  } catch (error) {
    console.error('Monitoring status error:', error)
    return errorResponse(500, 'Nacitanie stavu monitoringu zlyhalo.')
  }
}

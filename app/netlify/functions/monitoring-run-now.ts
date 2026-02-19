import type { Handler } from '@netlify/functions'
import {
  buildMonitoringDiff,
  createSupabaseAdminClient,
  extractIssueIds,
  getAuthUser,
  getBearerToken,
  getMonitoringTarget,
  hasMonitoringAccess,
  hasMonitoringPrerequisite,
  loadMonitoringEntitlement,
  normalizeAuditUrl,
  normalizeSummary,
  runStoredAudit
} from './monitoring-core'

type RunNowBody = {
  url?: unknown
}

const jsonResponse = (statusCode: number, payload: Record<string, unknown>) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})

const errorResponse = (statusCode: number, message: string) => jsonResponse(statusCode, { error: message })

const parseBody = (rawBody?: string | null): RunNowBody => {
  if (!rawBody) return {}
  try {
    const parsed = JSON.parse(rawBody)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as RunNowBody
  } catch {
    return {}
  }
}

export const handler: Handler = async (event) => {
  let runId: string | null = null

  try {
    if (event.httpMethod !== 'POST') {
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

    const entitlement = await loadMonitoringEntitlement(supabase, auth.userId)
    if (!hasMonitoringPrerequisite(entitlement)) {
      return errorResponse(403, 'Monitoring je dostupny az po zakladnom audite.')
    }
    if (!hasMonitoringAccess(entitlement)) {
      return errorResponse(403, 'Monitoring plan is not active for this account.')
    }

    const targetResult = await getMonitoringTarget(supabase, auth.userId)
    if (targetResult.error) {
      return errorResponse(500, 'Monitoring target load failed. Apply monitoring migration first.')
    }
    if (!targetResult.data?.id) {
      return errorResponse(404, 'Monitoring target does not exist. Activate monitoring first.')
    }

    const body = parseBody(event.body)
    const overrideUrl = normalizeAuditUrl(body.url)
    if (typeof body.url !== 'undefined' && !overrideUrl) {
      return errorResponse(400, 'Invalid URL.')
    }
    const runUrl = overrideUrl || targetResult.data.default_url

    const { data: previousRun } = await supabase
      .from('monitoring_runs')
      .select('summary_json')
      .eq('target_id', targetResult.data.id)
      .eq('status', 'success')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nowIso = new Date().toISOString()
    const runInsert = await supabase
      .from('monitoring_runs')
      .insert({
        target_id: targetResult.data.id,
        trigger: 'manual',
        run_url: runUrl,
        status: 'running',
        started_at: nowIso
      })
      .select('id')
      .single()

    if (runInsert.error || !runInsert.data?.id) {
      return errorResponse(500, 'Monitoring run creation failed.')
    }
    runId = runInsert.data.id

    const auditResult = await runStoredAudit({
      supabase,
      userId: auth.userId,
      url: runUrl,
      auditKind: 'paid'
    })

    const currentIssueIds = extractIssueIds(auditResult.issues)
    const previousSummary = normalizeSummary(previousRun?.summary_json?.summary)
    const previousIssueIds = Array.isArray(previousRun?.summary_json?.issueIds)
      ? previousRun?.summary_json?.issueIds
      : []

    const diff = buildMonitoringDiff({
      previousSummary,
      previousIssueIds,
      currentSummary: auditResult.summary,
      currentIssueIds
    })

    const summaryJson = {
      summary: auditResult.summary,
      issueIds: currentIssueIds
    }

    const finishedAt = new Date().toISOString()
    const { error: updateRunError } = await supabase
      .from('monitoring_runs')
      .update({
        status: 'success',
        audit_id: auditResult.auditId,
        summary_json: summaryJson,
        diff_json: diff,
        finished_at: finishedAt
      })
      .eq('id', runId)

    if (updateRunError) {
      return errorResponse(500, 'Monitoring run finalization failed.')
    }

    await supabase
      .from('monitoring_targets')
      .update({
        last_run_at: finishedAt,
        updated_at: finishedAt
      })
      .eq('id', targetResult.data.id)

    return jsonResponse(200, {
      runId,
      auditId: auditResult.auditId,
      runUrl,
      summary: auditResult.summary,
      diff
    })
  } catch (error: any) {
    console.error('Monitoring run-now error:', error?.message || error)

    if (runId) {
      try {
        await createSupabaseAdminClient()
          ?.from('monitoring_runs')
          .update({
            status: 'failed',
            error_message: error?.message || 'Monitoring run failed.',
            finished_at: new Date().toISOString()
          })
          .eq('id', runId)
      } catch (updateError) {
        console.error('Monitoring run-now fail update error:', updateError)
      }
    }

    return errorResponse(500, error?.message || 'Monitoring run failed.')
  }
}

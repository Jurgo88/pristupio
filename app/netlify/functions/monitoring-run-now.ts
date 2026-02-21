import type { Handler } from '@netlify/functions'
import {
  buildMonitoringDiff,
  createSupabaseAdminClient,
  extractIssueIds,
  getAuthUser,
  getBearerToken,
  getMonitoringTarget,
  getMonitoringTargetById,
  hasMonitoringAccess,
  hasMonitoringPrerequisite,
  loadMonitoringEntitlement,
  normalizeAuditUrl,
  normalizeMonitoringUrlForCompare,
  normalizeSummary,
  runStoredAudit
} from './monitoring-core'
import { sendMonitoringWorseningEmail } from './monitoring-notify'

type RunNowBody = {
  targetId?: unknown
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

    const entitlement = await loadMonitoringEntitlement(supabase, auth.userId)
    if (!hasMonitoringPrerequisite(entitlement)) {
      return errorResponse(403, 'Monitoring je dostupny az po zakladnom audite.')
    }
    if (!hasMonitoringAccess(entitlement)) {
      return errorResponse(403, 'Monitoring plan nie je aktivny pre tento ucet.')
    }

    const body = parseBody(event.body)
    const requestedTargetId = typeof body.targetId === 'string' ? body.targetId.trim() : ''
    const targetResult = requestedTargetId
      ? await getMonitoringTargetById(supabase, auth.userId, requestedTargetId)
      : await getMonitoringTarget(supabase, auth.userId)

    if (targetResult.error) {
      return errorResponse(500, 'Nacitanie ciela monitoringu zlyhalo. Najprv aplikujte monitoring migraciu.')
    }
    if (!targetResult.data?.id) {
      return errorResponse(404, 'Ciel monitoringu neexistuje. Najprv aktivujte monitoring.')
    }

    const overrideUrl = normalizeAuditUrl(body.url)
    if (typeof body.url !== 'undefined' && !overrideUrl) {
      return errorResponse(400, 'Neplatna URL.')
    }
    const runUrl = overrideUrl || targetResult.data.default_url
    const shouldSwitchTargetUrl =
      !!overrideUrl &&
      normalizeMonitoringUrlForCompare(overrideUrl) !==
        normalizeMonitoringUrlForCompare(targetResult.data.default_url)

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
      return errorResponse(500, 'Vytvorenie monitoring behu zlyhalo.')
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
      return errorResponse(500, 'Dokoncenie monitoring behu zlyhalo.')
    }

    await supabase
      .from('monitoring_targets')
      .update({
        ...(shouldSwitchTargetUrl ? { default_url: runUrl } : {}),
        last_run_at: finishedAt,
        updated_at: finishedAt
      })
      .eq('id', targetResult.data.id)
      .eq('user_id', auth.userId)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', auth.userId)
      .maybeSingle()

    if (profileData?.email) {
      await sendMonitoringWorseningEmail({
        to: String(profileData.email),
        runUrl,
        trigger: 'manual',
        diff,
        summary: auditResult.summary
      })
    }

    return jsonResponse(200, {
      runId,
      targetId: targetResult.data.id,
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
            error_message: error?.message || 'Monitoring beh zlyhal.',
            finished_at: new Date().toISOString()
          })
          .eq('id', runId)
      } catch (updateError) {
        console.error('Monitoring run-now fail update error:', updateError)
      }
    }

    return errorResponse(500, error?.message || 'Monitoring beh zlyhal.')
  }
}

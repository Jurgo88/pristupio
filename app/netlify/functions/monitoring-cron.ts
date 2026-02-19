import type { Handler } from '@netlify/functions'
import {
  buildMonitoringDiff,
  computeNextRunAt,
  createSupabaseAdminClient,
  extractIssueIds,
  normalizeCadenceMode,
  normalizeCadenceValue,
  normalizeSummary,
  runStoredAudit
} from './monitoring-core'

export const config = {
  schedule: '0 */6 * * *'
}

const jsonResponse = (statusCode: number, payload: Record<string, unknown>) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})

export const handler: Handler = async () => {
  const supabase = createSupabaseAdminClient()
  if (!supabase) {
    return jsonResponse(500, { error: 'Supabase config missing.' })
  }

  const now = new Date()
  const nowIso = now.toISOString()

  const { data: dueTargets, error: dueError } = await supabase
    .from('monitoring_targets')
    .select('id, user_id, default_url, cadence_mode, cadence_value, next_run_at')
    .eq('active', true)
    .lte('next_run_at', nowIso)
    .order('next_run_at', { ascending: true })
    .limit(10)

  if (dueError) {
    return jsonResponse(500, { error: 'Monitoring due-target lookup failed.' })
  }

  const safeTargets = Array.isArray(dueTargets) ? dueTargets : []
  let processed = 0
  let failed = 0
  let skipped = 0

  for (const target of safeTargets) {
    let runId: string | null = null

    try {
      const claimTime = new Date()
      const mode = normalizeCadenceMode(target.cadence_mode)
      const value = normalizeCadenceValue(mode, target.cadence_value)
      const claimedNextRunAt = computeNextRunAt(claimTime, mode, value).toISOString()

      const { data: claimedTarget, error: claimError } = await supabase
        .from('monitoring_targets')
        .update({
          next_run_at: claimedNextRunAt,
          updated_at: claimTime.toISOString()
        })
        .eq('id', target.id)
        .eq('active', true)
        .lte('next_run_at', nowIso)
        .select('id, user_id, default_url')
        .maybeSingle()

      if (claimError || !claimedTarget) {
        skipped += 1
        continue
      }

      const { data: previousRun } = await supabase
        .from('monitoring_runs')
        .select('summary_json')
        .eq('target_id', target.id)
        .eq('status', 'success')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const runInsert = await supabase
        .from('monitoring_runs')
        .insert({
          target_id: target.id,
          trigger: 'scheduled',
          run_url: claimedTarget.default_url,
          status: 'running',
          started_at: claimTime.toISOString()
        })
        .select('id')
        .single()

      if (runInsert.error || !runInsert.data?.id) {
        failed += 1
        continue
      }
      runId = runInsert.data.id

      const auditResult = await runStoredAudit({
        supabase,
        userId: claimedTarget.user_id,
        url: claimedTarget.default_url,
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

      const finishedAt = new Date().toISOString()
      const summaryJson = {
        summary: auditResult.summary,
        issueIds: currentIssueIds
      }

      await supabase
        .from('monitoring_runs')
        .update({
          status: 'success',
          audit_id: auditResult.auditId,
          summary_json: summaryJson,
          diff_json: diff,
          finished_at: finishedAt
        })
        .eq('id', runId)

      await supabase
        .from('monitoring_targets')
        .update({
          last_run_at: finishedAt,
          updated_at: finishedAt
        })
        .eq('id', target.id)

      processed += 1
    } catch (error: any) {
      failed += 1
      if (runId) {
        await supabase
          .from('monitoring_runs')
          .update({
            status: 'failed',
            error_message: error?.message || 'Monitoring scheduled run failed.',
            finished_at: new Date().toISOString()
          })
          .eq('id', runId)
      }
    }
  }

  return jsonResponse(200, {
    due: safeTargets.length,
    processed,
    failed,
    skipped
  })
}

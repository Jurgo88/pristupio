import type { Handler } from '@netlify/functions'
import {
  computeNextRunAt,
  createSupabaseAdminClient,
  getAuthUser,
  getBearerToken,
  getLatestAuditUrl,
  getMonitoringTarget,
  hasMonitoringAccess,
  hasMonitoringPrerequisite,
  loadMonitoringEntitlement,
  normalizeAuditUrl,
  normalizeCadenceMode,
  normalizeCadenceValue,
  normalizeMonitoringProfile
} from './monitoring-core'

type ActivateBody = {
  defaultUrl?: unknown
  profile?: unknown
  cadenceMode?: unknown
  cadenceValue?: unknown
}

const jsonResponse = (statusCode: number, payload: Record<string, unknown>) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})

const errorResponse = (statusCode: number, message: string) => jsonResponse(statusCode, { error: message })

const parseBody = (rawBody?: string | null): ActivateBody => {
  if (!rawBody) return {}
  try {
    const parsed = JSON.parse(rawBody)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as ActivateBody
  } catch {
    return {}
  }
}

export const handler: Handler = async (event) => {
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

    const body = parseBody(event.body)
    const now = new Date()

    const targetResult = await getMonitoringTarget(supabase, auth.userId)
    if (targetResult.error) {
      return errorResponse(500, 'Monitoring target load failed. Apply monitoring migration first.')
    }

    const latestAuditUrl = await getLatestAuditUrl(supabase, auth.userId)
    const providedUrl = normalizeAuditUrl(body.defaultUrl)
    const defaultUrl = providedUrl || latestAuditUrl || targetResult.data?.default_url || null
    if (!defaultUrl) {
      return errorResponse(400, 'No URL available. Run at least one audit or provide URL explicitly.')
    }

    const mode = normalizeCadenceMode(body.cadenceMode ?? targetResult.data?.cadence_mode)
    const value = normalizeCadenceValue(mode, body.cadenceValue ?? targetResult.data?.cadence_value)
    const profile = normalizeMonitoringProfile(body.profile ?? targetResult.data?.profile)
    const nextRunAt = computeNextRunAt(now, mode, value).toISOString()
    const updatedAt = now.toISOString()

    if (targetResult.data?.id) {
      const { data, error } = await supabase
        .from('monitoring_targets')
        .update({
          default_url: defaultUrl,
          profile,
          active: true,
          cadence_mode: mode,
          cadence_value: value,
          anchor_at: now.toISOString(),
          next_run_at: nextRunAt,
          updated_at: updatedAt
        })
        .eq('id', targetResult.data.id)
        .select(
          'id, user_id, default_url, profile, active, cadence_mode, cadence_value, anchor_at, last_run_at, next_run_at, created_at, updated_at'
        )
        .single()

      if (error || !data) {
        return errorResponse(500, 'Monitoring activation failed.')
      }

      return jsonResponse(200, { target: data })
    }

    const { data, error } = await supabase
      .from('monitoring_targets')
      .insert({
        user_id: auth.userId,
        default_url: defaultUrl,
        profile,
        active: true,
        cadence_mode: mode,
        cadence_value: value,
        anchor_at: now.toISOString(),
        next_run_at: nextRunAt,
        updated_at: updatedAt
      })
      .select(
        'id, user_id, default_url, profile, active, cadence_mode, cadence_value, anchor_at, last_run_at, next_run_at, created_at, updated_at'
      )
      .single()

    if (error || !data) {
      return errorResponse(500, 'Monitoring activation failed.')
    }

    return jsonResponse(200, { target: data })
  } catch (error) {
    console.error('Monitoring activate error:', error)
    return errorResponse(500, 'Monitoring activation failed.')
  }
}

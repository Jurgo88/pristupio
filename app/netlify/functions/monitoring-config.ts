import type { Handler } from '@netlify/functions'
import {
  computeNextRunAt,
  createSupabaseAdminClient,
  getAuthUser,
  getBearerToken,
  getMonitoringTarget,
  normalizeAuditUrl,
  normalizeCadenceMode,
  normalizeCadenceValue,
  normalizeMonitoringProfile
} from './monitoring-core'

type ConfigBody = {
  defaultUrl?: unknown
  profile?: unknown
  cadenceMode?: unknown
  cadenceValue?: unknown
  active?: unknown
}

const jsonResponse = (statusCode: number, payload: Record<string, unknown>) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})

const errorResponse = (statusCode: number, message: string) => jsonResponse(statusCode, { error: message })

const parseBody = (rawBody?: string | null): ConfigBody => {
  if (!rawBody) return {}
  try {
    const parsed = JSON.parse(rawBody)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as ConfigBody
  } catch {
    return {}
  }
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'PUT') {
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

    const targetResult = await getMonitoringTarget(supabase, auth.userId)
    if (targetResult.error) {
      return errorResponse(500, 'Monitoring target load failed. Apply monitoring migration first.')
    }
    if (!targetResult.data?.id) {
      return errorResponse(404, 'Monitoring target does not exist.')
    }

    const body = parseBody(event.body)
    const now = new Date()
    const updates: Record<string, unknown> = {
      updated_at: now.toISOString()
    }

    if (typeof body.defaultUrl !== 'undefined') {
      const parsedUrl = normalizeAuditUrl(body.defaultUrl)
      if (!parsedUrl) {
        return errorResponse(400, 'Invalid URL.')
      }
      updates.default_url = parsedUrl
    }

    if (typeof body.profile !== 'undefined') {
      updates.profile = normalizeMonitoringProfile(body.profile)
    }

    const hasCadenceUpdate =
      typeof body.cadenceMode !== 'undefined' || typeof body.cadenceValue !== 'undefined'
    if (hasCadenceUpdate) {
      const mode = normalizeCadenceMode(body.cadenceMode ?? targetResult.data.cadence_mode)
      const value = normalizeCadenceValue(mode, body.cadenceValue ?? targetResult.data.cadence_value)
      updates.cadence_mode = mode
      updates.cadence_value = value
      updates.next_run_at = computeNextRunAt(now, mode, value).toISOString()
    }

    if (typeof body.active !== 'undefined') {
      updates.active = !!body.active
      if (!!body.active && !hasCadenceUpdate) {
        const mode = normalizeCadenceMode(targetResult.data.cadence_mode)
        const value = normalizeCadenceValue(mode, targetResult.data.cadence_value)
        updates.next_run_at = computeNextRunAt(now, mode, value).toISOString()
      }
    }

    const { data, error } = await supabase
      .from('monitoring_targets')
      .update(updates)
      .eq('id', targetResult.data.id)
      .select(
        'id, user_id, default_url, profile, active, cadence_mode, cadence_value, anchor_at, last_run_at, next_run_at, created_at, updated_at'
      )
      .single()

    if (error || !data) {
      return errorResponse(500, 'Monitoring config update failed.')
    }

    return jsonResponse(200, { target: data })
  } catch (error) {
    console.error('Monitoring config error:', error)
    return errorResponse(500, 'Monitoring config update failed.')
  }
}

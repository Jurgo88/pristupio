import type { Handler } from '@netlify/functions'
import {
  computeNextRunAtByTier,
  createSupabaseAdminClient,
  getAuthUser,
  getBearerToken,
  getMonitoringTarget,
  getMonitoringTargetById,
  getMonitoringTargets,
  loadMonitoringEntitlement,
  normalizeAuditUrl,
  normalizeMonitoringProfile,
  normalizeMonitoringTier
} from './monitoring-core'

type ConfigBody = {
  targetId?: unknown
  defaultUrl?: unknown
  profile?: unknown
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

    const body = parseBody(event.body)
    const targetId = typeof body.targetId === 'string' ? body.targetId.trim() : ''

    const targetResult = targetId
      ? await getMonitoringTargetById(supabase, auth.userId, targetId)
      : await getMonitoringTarget(supabase, auth.userId)

    if (targetResult.error) {
      return errorResponse(500, 'Monitoring target load failed. Apply monitoring migration first.')
    }
    if (!targetResult.data?.id) {
      return errorResponse(404, 'Monitoring target does not exist.')
    }
    const entitlement = await loadMonitoringEntitlement(supabase, auth.userId)
    const monitoringTier = normalizeMonitoringTier(entitlement.monitoringTier)
    const tierCadenceMode = 'monthly_runs'
    const tierCadenceValue = monitoringTier === 'pro' ? 8 : 4

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

    updates.cadence_mode = tierCadenceMode
    updates.cadence_value = tierCadenceValue

    if (typeof body.active !== 'undefined') {
      updates.active = !!body.active
    }

    const isActiveAfterUpdate =
      typeof updates.active === 'boolean' ? !!updates.active : !!targetResult.data.active
    if (isActiveAfterUpdate) {
      updates.next_run_at = computeNextRunAtByTier(now, monitoringTier).toISOString()
    }

    const { data, error } = await supabase
      .from('monitoring_targets')
      .update(updates)
      .eq('id', targetResult.data.id)
      .eq('user_id', auth.userId)
      .select('id, user_id, default_url, profile, active, cadence_mode, cadence_value, anchor_at, last_run_at, next_run_at, created_at, updated_at')
      .single()

    if (error || !data) {
      return errorResponse(500, 'Monitoring config update failed.')
    }

    const refreshed = await getMonitoringTargets(supabase, auth.userId)
    return jsonResponse(200, { target: data, targets: refreshed.data || [] })
  } catch (error) {
    console.error('Monitoring config error:', error)
    return errorResponse(500, 'Monitoring config update failed.')
  }
}

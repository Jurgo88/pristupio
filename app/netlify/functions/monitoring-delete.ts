import type { Handler } from '@netlify/functions'
import {
  createSupabaseAdminClient,
  getAuthUser,
  getBearerToken,
  getMonitoringTargetById,
  getMonitoringTargets
} from './monitoring-core'

type DeleteBody = {
  targetId?: unknown
}

const jsonResponse = (statusCode: number, payload: Record<string, unknown>) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})

const errorResponse = (statusCode: number, message: string) => jsonResponse(statusCode, { error: message })

const parseBody = (rawBody?: string | null): DeleteBody => {
  if (!rawBody) return {}
  try {
    const parsed = JSON.parse(rawBody)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as DeleteBody
  } catch {
    return {}
  }
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'DELETE') {
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

    const body = parseBody(event.body)
    const targetId = typeof body.targetId === 'string' ? body.targetId.trim() : ''
    if (!targetId) {
      return errorResponse(400, 'Target ID je povinne.')
    }

    const targetResult = await getMonitoringTargetById(supabase, auth.userId, targetId)
    if (targetResult.error) {
      return errorResponse(500, 'Nacitanie ciela monitoringu zlyhalo.')
    }
    if (!targetResult.data?.id) {
      return errorResponse(404, 'Ciel monitoringu neexistuje.')
    }

    const { error } = await supabase
      .from('monitoring_targets')
      .delete()
      .eq('id', targetId)
      .eq('user_id', auth.userId)

    if (error) {
      return errorResponse(500, 'Zmazanie ciela monitoringu zlyhalo.')
    }

    const refreshed = await getMonitoringTargets(supabase, auth.userId)
    if (refreshed.error) {
      return errorResponse(500, 'Obnovenie cielov monitoringu zlyhalo.')
    }

    return jsonResponse(200, { targets: refreshed.data || [] })
  } catch (error) {
    console.error('Monitoring delete error:', error)
    return errorResponse(500, 'Zmazanie ciela monitoringu zlyhalo.')
  }
}

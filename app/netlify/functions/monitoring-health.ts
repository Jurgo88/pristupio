import type { Handler } from '@netlify/functions'
import {
  createSupabaseAdminClient,
  getAuthUser,
  getBearerToken,
  hasMonitoringAccess,
  hasMonitoringPrerequisite,
  type MonitoringEntitlement
} from './monitoring-core'

const jsonResponse = (statusCode: number, payload: Record<string, unknown>) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})

const errorResponse = (statusCode: number, message: string) => jsonResponse(statusCode, { error: message })

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.floor(parsed)
}

const normalizeEntitlement = (profile: any): MonitoringEntitlement => {
  const monitoringTier =
    profile?.monitoring_tier === 'pro' || profile?.monitoring_tier === 'basic' ? profile.monitoring_tier : 'none'
  const rawDomainsLimit = Number(profile?.monitoring_domains_limit || 0)
  const rawMonthlyRuns = Number(profile?.monitoring_monthly_runs || 0)
  const fallbackDomainsLimit = monitoringTier === 'pro' ? 8 : monitoringTier === 'basic' ? 2 : 0
  const fallbackMonthlyRuns = monitoringTier === 'pro' ? 8 : monitoringTier === 'basic' ? 4 : 0

  return {
    plan: profile?.plan || 'free',
    role: profile?.role || null,
    paidAuditCompleted: !!profile?.paid_audit_completed,
    monitoringActive: !!profile?.monitoring_active,
    monitoringUntil: profile?.monitoring_until || null,
    monitoringTier,
    monitoringDomainsLimit: rawDomainsLimit > 0 ? rawDomainsLimit : fallbackDomainsLimit,
    monitoringMonthlyRuns: rawMonthlyRuns > 0 ? rawMonthlyRuns : fallbackMonthlyRuns
  }
}

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

    const { data: adminProfile, error: adminError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', auth.userId)
      .single()

    if (adminError || adminProfile?.role !== 'admin') {
      return errorResponse(403, 'Pristup zamietnuty.')
    }

    const staleMinutes = parsePositiveInt(event.queryStringParameters?.staleMinutes, 30)
    const staleCutoffIso = new Date(Date.now() - staleMinutes * 60 * 1_000).toISOString()
    const lookbackHours = parsePositiveInt(event.queryStringParameters?.lookbackHours, 24)
    const lookbackIso = new Date(Date.now() - lookbackHours * 60 * 60 * 1_000).toISOString()

    const [
      targetsQuery,
      activeTargetsQuery,
      staleRunsQuery,
      recentRunsQuery
    ] = await Promise.all([
      supabase.from('monitoring_targets').select('id, user_id, active', { count: 'exact', head: true }),
      supabase
        .from('monitoring_targets')
        .select('id, user_id', { count: 'exact' })
        .eq('active', true),
      supabase
        .from('monitoring_runs')
        .select('id, target_id, started_at, status')
        .in('status', ['running', 'pending'])
        .lte('started_at', staleCutoffIso)
        .order('started_at', { ascending: true })
        .limit(100),
      supabase
        .from('monitoring_runs')
        .select('id, target_id, status, started_at, finished_at')
        .gte('started_at', lookbackIso)
    ])

    const totalTargets = Number(targetsQuery.count || 0)
    const activeTargets = Number(activeTargetsQuery.count || 0)
    const inactiveTargets = Math.max(0, totalTargets - activeTargets)
    const staleRuns = Array.isArray(staleRunsQuery.data) ? staleRunsQuery.data : []
    const recentRuns = Array.isArray(recentRunsQuery.data) ? recentRunsQuery.data : []
    const activeTargetRows = Array.isArray(activeTargetsQuery.data) ? activeTargetsQuery.data : []

    const activeTargetUserIds = Array.from(
      new Set(
        activeTargetRows
          .map((row: any) => (typeof row?.user_id === 'string' ? row.user_id : ''))
          .filter(Boolean)
      )
    )

    let activeTargetsNoAccess = 0
    if (activeTargetUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select(
          'id, role, plan, paid_audit_completed, monitoring_active, monitoring_until, monitoring_tier, monitoring_domains_limit, monitoring_monthly_runs'
        )
        .in('id', activeTargetUserIds)

      const entitlementByUser = new Map<string, MonitoringEntitlement>()
      ;(profiles || []).forEach((profile: any) => {
        if (!profile?.id) return
        entitlementByUser.set(profile.id, normalizeEntitlement(profile))
      })

      activeTargetRows.forEach((target: any) => {
        const userId = typeof target?.user_id === 'string' ? target.user_id : ''
        if (!userId) return
        const entitlement = entitlementByUser.get(userId)
        if (!entitlement) {
          activeTargetsNoAccess += 1
          return
        }
        if (!hasMonitoringPrerequisite(entitlement) || !hasMonitoringAccess(entitlement)) {
          activeTargetsNoAccess += 1
        }
      })
    }

    let recentSuccess = 0
    let recentFailed = 0
    let recentRunning = 0
    let recentPending = 0

    recentRuns.forEach((run: any) => {
      const status = typeof run?.status === 'string' ? run.status : ''
      if (status === 'success') recentSuccess += 1
      else if (status === 'failed') recentFailed += 1
      else if (status === 'running') recentRunning += 1
      else if (status === 'pending') recentPending += 1
    })

    const staleSample = staleRuns.slice(0, 20).map((run: any) => ({
      id: run?.id || null,
      targetId: run?.target_id || null,
      status: run?.status || null,
      startedAt: run?.started_at || null
    }))

    return jsonResponse(200, {
      generatedAt: new Date().toISOString(),
      lookbackHours,
      staleMinutes,
      targets: {
        total: totalTargets,
        active: activeTargets,
        inactive: inactiveTargets,
        activeNoAccess: activeTargetsNoAccess
      },
      runs: {
        recentTotal: recentRuns.length,
        recentSuccess,
        recentFailed,
        recentRunning,
        recentPending,
        staleCount: staleRuns.length
      },
      staleSample
    })
  } catch (error: any) {
    console.error('Monitoring health error:', error?.message || error)
    return errorResponse(500, error?.message || 'Nacitanie monitoring health zlyhalo.')
  }
}

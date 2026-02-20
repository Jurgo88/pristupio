import { defineStore } from 'pinia'
import { supabase } from '@/services/supabase'
import { useAuthStore } from './auth.store'

type MonitoringCadenceMode = 'interval_days' | 'monthly_runs'
type MonitoringProfile = 'wad' | 'eaa'

type MonitoringEntitlement = {
  plan: string
  role: string | null
  monitoringActive: boolean
  monitoringUntil: string | null
  monitoringTier?: 'none' | 'basic' | 'pro' | string
  monitoringDomainsLimit?: number
  monitoringMonthlyRuns?: number
  hasAccess: boolean
}

type MonitoringTarget = {
  id: string
  user_id: string
  default_url: string
  profile: MonitoringProfile
  active: boolean
  cadence_mode: MonitoringCadenceMode
  cadence_value: number
  anchor_at?: string
  last_run_at?: string | null
  next_run_at?: string
  created_at?: string
  updated_at?: string
}

type MonitoringRun = {
  id: string
  target_id?: string
  trigger: 'manual' | 'scheduled' | string
  run_url: string
  status: 'pending' | 'running' | 'success' | 'failed' | string
  audit_id?: string | null
  summary_json?: Record<string, any>
  diff_json?: Record<string, any>
  error_message?: string | null
  started_at?: string
  finished_at?: string | null
}

type ActivatePayload = {
  defaultUrl?: string
  profile?: MonitoringProfile
  cadenceMode?: MonitoringCadenceMode
  cadenceValue?: number
}

type UpdateConfigPayload = {
  targetId?: string
  defaultUrl?: string
  profile?: MonitoringProfile
  cadenceMode?: MonitoringCadenceMode
  cadenceValue?: number
  active?: boolean
}

type RunNowPayload = {
  targetId?: string
  url?: string
}

type DeleteTargetPayload = {
  targetId: string
}

const getErrorMessage = async (response: Response, fallback: string) => {
  try {
    const data = await response.json()
    if (data?.error) return String(data.error)
  } catch (_error) {
    // ignore parse errors
  }
  return fallback
}

export const useMonitoringStore = defineStore('monitoring', {
  state: () => ({
    loadingStatus: false,
    loadingAction: false,
    loadingHistory: false,
    error: null as string | null,
    entitlement: null as MonitoringEntitlement | null,
    targets: [] as MonitoringTarget[],
    target: null as MonitoringTarget | null,
    latestAuditUrl: '' as string,
    latestRun: null as MonitoringRun | null,
    history: [] as MonitoringRun[],
    historyHasMore: false,
    historyPage: 1
  }),

  getters: {
    hasAccess: (state) => !!state.entitlement?.hasAccess,
    isActive: (state) => state.targets.some((target) => !!target.active)
  },

  actions: {
    async getAccessToken() {
      const { data: sessionData } = await supabase.auth.getSession()
      return sessionData.session?.access_token || ''
    },

    async authorizedFetch(path: string, init?: RequestInit) {
      const token = await this.getAccessToken()
      if (!token) {
        throw new Error('Prihlaste sa, aby ste mohli pouzivat monitoring.')
      }
      return fetch(`/.netlify/functions/${path}`, {
        ...(init || {}),
        headers: {
          ...(init?.headers || {}),
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    },

    async fetchStatus() {
      const auth = useAuthStore()
      if (!auth.isLoggedIn) {
        this.entitlement = null
        this.targets = []
        this.target = null
        this.latestRun = null
        this.latestAuditUrl = ''
        return null
      }

      this.loadingStatus = true
      this.error = null

      try {
        const response = await this.authorizedFetch('monitoring-status', { method: 'GET' })
        if (!response.ok) {
          throw new Error(await getErrorMessage(response, 'Monitoring status sa nepodarilo nacitat.'))
        }

        const data = await response.json()
        this.entitlement = data?.entitlement || null
        const targets = Array.isArray(data?.targets) ? data.targets : data?.target ? [data.target] : []
        this.targets = targets
        this.target = data?.target || targets[0] || null
        this.latestRun = data?.latestRun || null
        this.latestAuditUrl = data?.latestAuditUrl || ''
        return data
      } catch (error: any) {
        this.error = error?.message || 'Monitoring status sa nepodarilo nacitat.'
        return null
      } finally {
        this.loadingStatus = false
      }
    },

    async activate(payload?: ActivatePayload) {
      this.loadingAction = true
      this.error = null
      try {
        const response = await this.authorizedFetch('monitoring-activate', {
          method: 'POST',
          body: JSON.stringify(payload || {})
        })
        if (!response.ok) {
          throw new Error(await getErrorMessage(response, 'Monitoring sa nepodarilo aktivovat.'))
        }

        const data = await response.json()
        await this.fetchStatus()
        return data
      } catch (error: any) {
        this.error = error?.message || 'Monitoring sa nepodarilo aktivovat.'
        throw error
      } finally {
        this.loadingAction = false
      }
    },

    async updateConfig(payload: UpdateConfigPayload) {
      this.loadingAction = true
      this.error = null
      try {
        const response = await this.authorizedFetch('monitoring-config', {
          method: 'PUT',
          body: JSON.stringify(payload || {})
        })
        if (!response.ok) {
          throw new Error(await getErrorMessage(response, 'Monitoring konfiguraciu sa nepodarilo ulozit.'))
        }

        const data = await response.json()
        await this.fetchStatus()
        return data
      } catch (error: any) {
        this.error = error?.message || 'Monitoring konfiguraciu sa nepodarilo ulozit.'
        throw error
      } finally {
        this.loadingAction = false
      }
    },

    async runNow(payload?: RunNowPayload | string) {
      this.loadingAction = true
      this.error = null
      try {
        const resolvedPayload =
          typeof payload === 'string' ? ({ url: payload } as RunNowPayload) : payload || {}
        const response = await this.authorizedFetch('monitoring-run-now', {
          method: 'POST',
          body: JSON.stringify(resolvedPayload)
        })
        if (!response.ok) {
          throw new Error(await getErrorMessage(response, 'Monitoring spustenie zlyhalo.'))
        }

        const data = await response.json()
        await this.fetchStatus()
        return data
      } catch (error: any) {
        this.error = error?.message || 'Monitoring spustenie zlyhalo.'
        throw error
      } finally {
        this.loadingAction = false
      }
    },

    async deleteTarget(payload: DeleteTargetPayload) {
      this.loadingAction = true
      this.error = null
      try {
        const targetId = typeof payload?.targetId === 'string' ? payload.targetId.trim() : ''
        if (!targetId) {
          throw new Error('Chyba target id pre zrusenie monitoringu.')
        }

        const response = await this.authorizedFetch('monitoring-delete', {
          method: 'DELETE',
          body: JSON.stringify({ targetId })
        })
        if (!response.ok) {
          throw new Error(await getErrorMessage(response, 'Monitoring sa nepodarilo zrusit.'))
        }

        const data = await response.json()
        const targets = Array.isArray(data?.targets) ? data.targets : []
        this.targets = targets
        this.target = targets[0] || null
        await this.fetchStatus()
        return data
      } catch (error: any) {
        this.error = error?.message || 'Monitoring sa nepodarilo zrusit.'
        throw error
      } finally {
        this.loadingAction = false
      }
    },

    async fetchHistory(options?: { page?: number; limit?: number; append?: boolean }) {
      this.loadingHistory = true
      this.error = null
      try {
        const page = options?.page && options.page > 0 ? options.page : 1
        const limit = options?.limit && options.limit > 0 ? options.limit : 10
        const query = new URLSearchParams({ page: String(page), limit: String(limit) })
        const response = await this.authorizedFetch(`monitoring-history?${query.toString()}`, {
          method: 'GET'
        })
        if (!response.ok) {
          throw new Error(await getErrorMessage(response, 'Historiu monitoringu sa nepodarilo nacitat.'))
        }
        const data = await response.json()
        const runs = Array.isArray(data?.runs) ? data.runs : []
        this.history = options?.append ? [...this.history, ...runs] : runs
        this.historyHasMore = !!data?.hasMore
        this.historyPage = page
        return data
      } catch (error: any) {
        this.error = error?.message || 'Historiu monitoringu sa nepodarilo nacitat.'
        throw error
      } finally {
        this.loadingHistory = false
      }
    }
  }
})

import { defineStore } from 'pinia'
import { supabase } from '@/services/supabase'
import { useAuthStore } from './auth.store'

export type MonitoringRun = {
  status: 'success' | 'failed' | 'disabled' | string
  score: number | null
  summary: {
    total: number
    byImpact: {
      critical: number
      serious: number
      moderate: number
      minor: number
    }
  } | null
  top_issues?: Array<{
    id: string
    title: string
    impact: 'critical' | 'serious' | 'moderate' | 'minor' | string
    nodesCount: number
    helpUrl?: string
  }>
  delta?: {
    firstRun?: boolean
    scoreDiff?: number
    totalDiff?: number
    criticalDiff?: number
    seriousDiff?: number
    moderateDiff?: number
    minorDiff?: number
  } | null
  error: string | null
  completed_at: string | null
  created_at: string
}

export type MonitoringTarget = {
  id: string
  url: string
  profile: 'wad' | 'eaa'
  frequency_days: number
  active: boolean
  next_run_at: string | null
  last_run_at: string | null
  last_status: string | null
  last_error: string | null
  created_at: string
  latest_run: MonitoringRun | null
}

export type MonitoringTrendPoint = {
  score: number | null
  total: number
  created_at: string
  completed_at: string | null
}

export const useMonitoringStore = defineStore('monitoring', {
  state: () => ({
    loading: false,
    trendsLoading: false,
    saving: false,
    error: null as string | null,
    canManage: false,
    targets: [] as MonitoringTarget[],
    trendsByTarget: {} as Record<string, MonitoringTrendPoint[]>
  }),

  actions: {
    async fetchTargets() {
      const auth = useAuthStore()
      if (!auth.isLoggedIn) {
        this.targets = []
        this.trendsByTarget = {}
        this.canManage = false
        return []
      }

      this.loading = true
      this.error = null

      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        if (!accessToken) {
          this.targets = []
          this.trendsByTarget = {}
          this.canManage = false
          return []
        }

        const response = await fetch('/.netlify/functions/monitoring-targets', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data?.error || 'Monitoring sa nepodarilo nacitat.')
        }

        this.targets = Array.isArray(data?.targets) ? data.targets : []
        this.canManage = !!data?.canManage
        return this.targets
      } catch (error: any) {
        this.error = error?.message || 'Monitoring sa nepodarilo nacitat.'
        this.targets = []
        this.trendsByTarget = {}
        this.canManage = false
        return []
      } finally {
        this.loading = false
      }
    },

    async fetchTrends(limit = 12) {
      this.trendsLoading = true
      this.error = null
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        if (!accessToken) {
          this.trendsByTarget = {}
          return {}
        }

        const response = await fetch(`/.netlify/functions/monitoring-trends?limit=${limit}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data?.error || 'Trendy sa nepodarilo nacitat.')
        }

        this.trendsByTarget = (data?.trends || {}) as Record<string, MonitoringTrendPoint[]>
        return this.trendsByTarget
      } catch (error: any) {
        this.error = error?.message || 'Trendy sa nepodarilo nacitat.'
        this.trendsByTarget = {}
        return {}
      } finally {
        this.trendsLoading = false
      }
    },

    async upsertTarget(payload: { url: string; profile: 'wad' | 'eaa'; frequencyDays: number }) {
      this.saving = true
      this.error = null
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        if (!accessToken) {
          throw new Error('Prihlaste sa, aby ste mohli zapnut monitoring.')
        }

        const response = await fetch('/.netlify/functions/monitoring-upsert-target', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(payload)
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data?.error || 'Monitoring sa nepodarilo ulozit.')
        }

        const target = data?.target as MonitoringTarget | undefined
        if (target?.id) {
          const nextTargets = this.targets.filter((item) => item.id !== target.id)
          this.targets = [target, ...nextTargets]
        }

        return target || null
      } catch (error: any) {
        this.error = error?.message || 'Monitoring sa nepodarilo ulozit.'
        return null
      } finally {
        this.saving = false
      }
    },

    async toggleTarget(targetId: string, active: boolean) {
      this.saving = true
      this.error = null
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        if (!accessToken) {
          throw new Error('Prihlaste sa, aby ste mohli upravit monitoring.')
        }

        const response = await fetch('/.netlify/functions/monitoring-toggle-target', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ targetId, active })
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data?.error || 'Monitoring sa nepodarilo upravit.')
        }

        const target = data?.target as MonitoringTarget | undefined
        if (target?.id) {
          const current = this.targets.find((item) => item.id === target.id)
          const merged = current ? { ...current, ...target } : target
          const nextTargets = this.targets.filter((item) => item.id !== target.id)
          this.targets = [merged, ...nextTargets]
        }

        return target || null
      } catch (error: any) {
        this.error = error?.message || 'Monitoring sa nepodarilo upravit.'
        return null
      } finally {
        this.saving = false
      }
    }
  }
})

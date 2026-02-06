import { defineStore } from 'pinia'
import { supabase } from '@/services/supabase'
import { useAuthStore } from './auth.store'

type Impact = 'critical' | 'serious' | 'moderate' | 'minor'

type AuditReport = {
  summary: {
    total: number
    byImpact: Record<Impact, number>
  }
  issues: Array<{
    id: string
    title: string
    impact: Impact
    description: string
    recommendation?: string
    wcag: string
    wcagLevel: string
    principle: string
    helpUrl?: string
    nodesCount?: number
    nodes?: Array<{
      target: string[]
      html: string
      failureSummary?: string
    }>
  }>
}

export const useAuditStore = defineStore('audit', {
  state: () => ({
    loading: false,
    currentAudit: null as any,
    accessLevel: null as null | 'free' | 'paid',
    report: null as null | AuditReport,
    error: null as string | null,
    history: [] as Array<{
      id: string
      url: string
      audit_kind: 'free' | 'paid'
      summary: AuditReport['summary']
      created_at: string
    }>
  }),

  actions: {
    async runManualAudit(url: string) {
      this.loading = true
      this.error = null
      this.report = null
      this.accessLevel = null
      const auth = useAuthStore()

      try {
        if (!auth.isLoggedIn) {
          throw new Error('Prihlaste sa, aby ste mohli spustit audit.')
        }

        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        if (!accessToken) {
          throw new Error('Prihlaste sa, aby ste mohli spustit audit.')
        }

        const response = await fetch('/.netlify/functions/audit-run', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ url })
        })

        if (!response.ok) {
          let message = 'Audit zlyhal'
          try {
            const data = await response.json()
            if (data?.error) message = data.error
          } catch (_error) {
            // ignore json parsing errors
          }
          throw new Error(message)
        }

        const data = await response.json()
        this.currentAudit = data
        this.report = data.report
        this.accessLevel = data.accessLevel || 'paid'
        if (this.accessLevel === 'free') {
          auth.freeAuditUsed = true
        } else if (this.accessLevel === 'paid' && !auth.isAdmin) {
          auth.paidAuditCompleted = true
          auth.paidAuditCredits = Math.max(0, (auth.paidAuditCredits || 0) - 1)
        }
      } catch (err: any) {
        this.error = err.message
        this.accessLevel = null
      } finally {
        this.loading = false
      }
    },

    async fetchLatestAudit() {
      const auth = useAuthStore()
      if (!auth.isLoggedIn) return null

      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        if (!accessToken) return null

        const response = await fetch('/.netlify/functions/audit-latest', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        if (!response.ok) return null

        const data = await response.json()
        if (!data?.auditId || !data?.report) return null

        this.currentAudit = data
        this.report = data.report
        this.accessLevel = data.accessLevel || 'paid'
        return data
      } catch (_error) {
        return null
      }
    },

    async fetchAuditHistory() {
      const auth = useAuthStore()
      if (!auth.isLoggedIn) return []
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        if (!accessToken) return []

        const response = await fetch('/.netlify/functions/audit-history', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        if (!response.ok) return []
        const data = await response.json()
        this.history = Array.isArray(data?.audits) ? data.audits : []
        return this.history
      } catch (_error) {
        return []
      }
    },

    async loadAuditById(auditId: string) {
      const auth = useAuthStore()
      if (!auth.isLoggedIn || !auditId) return null
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        if (!accessToken) return null

        const response = await fetch(`/.netlify/functions/audit-detail?id=${auditId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        if (!response.ok) return null
        const data = await response.json()
        if (!data?.auditId || !data?.report) return null

        this.currentAudit = data
        this.report = data.report
        this.accessLevel = data.accessLevel || 'paid'
        return data
      } catch (_error) {
        return null
      }
    }
  }
})

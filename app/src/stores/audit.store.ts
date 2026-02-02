import { defineStore } from 'pinia'
import { useAuthStore } from './auth.store'

export const useAuditStore = defineStore('audit', {
  state: () => ({
    loading: false,
    currentAudit: null as any,
    error: null as string | null
  }),

  actions: {
    async runManualAudit(url: string) {
      this.loading = true
      this.error = null
      const auth = useAuthStore()

      try {
        const response = await fetch('/.netlify/functions/audit-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            url, 
            userId: auth.userId 
          })
        })

        if (!response.ok) throw new Error('Audit zlyhal')

        const data = await response.json()
        this.currentAudit = data
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    }
  }
})
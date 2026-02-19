import { defineStore } from 'pinia'
import { supabase } from '@/services/supabase'
import type { User } from '@supabase/supabase-js'

type UserRole = 'guest' | 'user' | 'admin'
type UserPlan = 'free' | 'paid'

const isAbortError = (error: unknown) => {
  const name = typeof error === 'object' && error && 'name' in error ? String((error as any).name) : ''
  const message =
    typeof error === 'object' && error && 'message' in error ? String((error as any).message) : ''
  return name === 'AbortError' || message.toLowerCase().includes('signal is aborted')
}

const resetGuestState = (store: any) => {
  store.user = null
  store.userRole = 'guest'
  store.userPlan = 'free'
  store.freeAuditUsed = false
  store.paidAuditCompleted = false
  store.paidAuditCredits = 0
  store.consentMarketing = false
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    loadingSession: true,
    loading: false,
    authError: null as string | null,
    userRole: 'guest' as UserRole,
    userPlan: 'free' as UserPlan,
    freeAuditUsed: false,
    paidAuditCompleted: false,
    paidAuditCredits: 0,
    consentMarketing: false,
    _listenerInitialized: false
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
    isAdmin: (state) => state.userRole === 'admin',
    isPaid: (state) => state.userPlan === 'paid'
  },

  actions: {
    async init() {
      this.loadingSession = true
      this.authError = null
      try {
        const { data } = await supabase.auth.getSession()
        this.user = data.session?.user ?? null

        if (this.user) await this.fetchUserProfile()
      } catch (error: any) {
        if (!isAbortError(error)) {
          this.authError = error?.message || 'Inicializacia prihlasenia zlyhala.'
        }
        resetGuestState(this)
      } finally {
        this.loadingSession = false
        this.initAuthListener()
      }
    },

    initAuthListener() {
      if (this._listenerInitialized) return
      this._listenerInitialized = true

      supabase.auth.onAuthStateChange(async (_event, session) => {
        try {
          this.user = session?.user ?? null
          if (!this.user) {
            resetGuestState(this)
            return
          }
          await this.fetchUserProfile()
        } catch (error: any) {
          if (!isAbortError(error)) {
            this.authError = error?.message || 'Aktualizacia prihlasenia zlyhala.'
          }
        }
      })
    },

    async signIn(email: string, password: string) {
      this.loading = true
      this.authError = null
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } catch (error: any) {
        this.authError = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async signUp({
      email,
      password,
      metadata
    }: {
      email: string
      password: string
      metadata: Record<string, any>
    }) {
      this.loading = true
      this.authError = null
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata
          }
        })
        if (error) throw error
      } catch (error: any) {
        this.authError = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async signOut() {
      await supabase.auth.signOut()
      resetGuestState(this)
    },

    async fetchUserProfile() {
      if (!this.user) return
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, plan, free_audit_used, paid_audit_completed, paid_audit_credits, consent_marketing')
          .eq('id', this.user.id)
          .single()

        if (error || !data) {
          this.userRole = 'user'
          this.userPlan = 'free'
          this.freeAuditUsed = false
          this.paidAuditCompleted = false
          this.paidAuditCredits = 0
          this.consentMarketing = false
          return
        }

        this.userRole = (data.role as UserRole) || 'user'
        this.userPlan = (data.plan as UserPlan) || 'free'
        this.freeAuditUsed = !!data.free_audit_used
        this.paidAuditCompleted = !!data.paid_audit_completed
        this.paidAuditCredits = Number(data.paid_audit_credits || 0)
        this.consentMarketing = !!data.consent_marketing
      } catch (_error) {
        this.userRole = 'user'
        this.userPlan = 'free'
        this.freeAuditUsed = false
        this.paidAuditCompleted = false
        this.paidAuditCredits = 0
        this.consentMarketing = false
      }
    }
  }
})

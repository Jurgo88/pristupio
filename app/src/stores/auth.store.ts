import { defineStore } from 'pinia'
import { supabase } from '@/services/supabase'
import type { User } from '@supabase/supabase-js'

type UserRole = 'guest' | 'user' | 'admin'
type UserPlan = 'free' | 'paid'

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
      const { data } = await supabase.auth.getSession()
      this.user = data.session?.user ?? null

      if (this.user) await this.fetchUserProfile()

      this.loadingSession = false
      this.initAuthListener()
    },

    initAuthListener() {
      if (this._listenerInitialized) return
      this._listenerInitialized = true

      supabase.auth.onAuthStateChange(async (_event, session) => {
        this.user = session?.user ?? null
        if (!this.user) {
          this.userRole = 'guest'
          this.userPlan = 'free'
          this.freeAuditUsed = false
          this.paidAuditCompleted = false
          this.consentMarketing = false
        } else {
          await this.fetchUserProfile()
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

    async signUp(email: string, password: string, consentMarketing: boolean) {
      this.loading = true
      this.authError = null
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              consent_marketing: consentMarketing
            }
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
      this.user = null
      this.userRole = 'guest'
      this.userPlan = 'free'
      this.freeAuditUsed = false
      this.paidAuditCompleted = false
      this.consentMarketing = false
    },

    async fetchUserProfile() {
      if (!this.user) return
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, plan, free_audit_used, paid_audit_completed, consent_marketing')
          .eq('id', this.user.id)
          .single()

        if (error || !data) {
          this.userRole = 'user'
          this.userPlan = 'free'
          this.freeAuditUsed = false
          this.paidAuditCompleted = false
          this.consentMarketing = false
          return
        }

        this.userRole = (data.role as UserRole) || 'user'
        this.userPlan = (data.plan as UserPlan) || 'free'
        this.freeAuditUsed = !!data.free_audit_used
        this.paidAuditCompleted = !!data.paid_audit_completed
        this.consentMarketing = !!data.consent_marketing
      } catch (_error) {
        this.userRole = 'user'
        this.userPlan = 'free'
        this.freeAuditUsed = false
        this.paidAuditCompleted = false
        this.consentMarketing = false
      }
    }
  }
})

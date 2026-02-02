import { defineStore } from 'pinia'
import { supabase } from '@/services/supabase'
import type { User, Session } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    loadingSession: true, // Čakáme na odpoveď od Supabase pri štarte
    loading: false,        // Pre tlačidlá (spinner)
    authError: null as string | null,
    userRole: 'guest' as 'guest' | 'user' | 'admin',
    _listenerInitialized: false,
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
    isAdmin: (state) => state.userRole === 'admin',
  },

  actions: {
    async init() {
      // 1. Získaj aktuálnu session
      const { data } = await supabase.auth.getSession()
      this.user = data.session?.user ?? null
      
      if (this.user) await this.fetchUserRole()
      
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
        } else {
          await this.fetchUserRole()
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

    async signUp(email: string, password: string) {
      this.loading = true
      this.authError = null
      try {
        const { error } = await supabase.auth.signUp({ email, password })
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
    },

    async fetchUserRole() {
      // Tu neskôr pridáš SELECT z tabuľky profiles
      // Pre test: ak je email tvoj, daj si admina
      this.userRole = 'user'
    }
  }
})
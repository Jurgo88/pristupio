import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as null | {
      id: string
      email: string
    },
    loading: false,
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
  },

  actions: {
    loginMock() {
      this.user = {
        id: '1',
        email: 'user@pristupio.com',
      }
    },

    logout() {
      this.user = null
    },
  },
})

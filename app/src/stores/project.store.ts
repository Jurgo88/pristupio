import { defineStore } from 'pinia'
import { supabase } from '@/services/supabase'

export const useProjectStore = defineStore('projects', {
  state: () => ({
    projects: [] as any[],
    loading: false,
  }),

  actions: {
    async loadProjects() {
      this.loading = true

      const { data, error } = await supabase
        .from('projects')
        .select('*')

      if (error) throw error
      this.projects = data || []

      this.loading = false
    },
  },
})

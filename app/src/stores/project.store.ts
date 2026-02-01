import { defineStore } from 'pinia'

export interface Project {
  id: string
  name: string
  url: string
}

export const useProjectStore = defineStore('projects', {
  state: () => ({
    projects: [] as Project[],
    loading: false,
  }),

  actions: {
    loadMockProjects() {
      this.projects = [
        {
          id: '1',
          name: 'Firemný web',
          url: 'https://example.com',
        },
        {
          id: '2',
          name: 'E-shop',
          url: 'https://shop.example.com',
        },
      ]
    },
  },
})

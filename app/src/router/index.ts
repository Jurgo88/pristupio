import { createRouter, createWebHistory } from 'vue-router'

import Login from '@/pages/auth/Login.vue'
import Dashboard from '@/pages/dashboard/Dashboard.vue'
import ProjectDetail from '@/pages/dashboard/ProjectDetail.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      component: Login,
    },
    {
      path: '/dashboard',
      component: Dashboard,
    },
    {
      path: '/project/:id',
      component: ProjectDetail,
    },
  ],
})

export default router

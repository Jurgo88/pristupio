import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

import Home from '@/pages/Home.vue'
import Login from '@/pages/auth/Login.vue'
import Dashboard from '@/pages/dashboard/Dashboard.vue'
import ProjectDetail from '@/pages/dashboard/ProjectDetail.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: Home
    },
    {
      path: '/login',
      component: Login
    },
    {
      path: '/register',
      component: () => import('@/pages/auth/Register.vue')
    },
    {
      path: '/dashboard',
      component: Dashboard,
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      component: () => import('@/pages/admin/AdminAudits.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/project/:id',
      component: ProjectDetail,
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (auth.loadingSession) return true

  if (to.meta.requiresAuth && !auth.user) {
    return '/login'
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return '/dashboard'
  }

  if (to.path === '/login' && auth.user) {
    return '/dashboard'
  }

  return true
})

export default router

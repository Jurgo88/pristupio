import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

import Home from '@/pages/Home.vue'
import Login from '@/pages/auth/Login.vue'
import Dashboard from '@/pages/dashboard/Dashboard.vue'
import ProjectDetail from '@/pages/dashboard/ProjectDetail.vue'
import Terms from '@/pages/legal/Terms.vue'
import Privacy from '@/pages/legal/Privacy.vue'
import Refunds from '@/pages/legal/Refunds.vue'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
        top: 80
      }
    }
    return { top: 0 }
  },
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
    },
    {
      path: '/terms',
      component: Terms
    },
    {
      path: '/privacy',
      component: Privacy
    },
    {
      path: '/refunds',
      component: Refunds
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

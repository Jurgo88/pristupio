import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

import Login from '@/pages/auth/Login.vue'
import Dashboard from '@/pages/dashboard/Dashboard.vue'
import ProjectDetail from '@/pages/dashboard/ProjectDetail.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      component: Login,
    },
    {
      path: '/register',
      component: () => import('@/pages/auth/Register.vue'),
    },
    {
      path: '/dashboard',
      component: Dashboard,
      meta: { requiresAuth: true },
    },
    {
      path: '/project/:id',
      component: ProjectDetail,
      meta: { requiresAuth: true },
    },
  ],
})

/* =========================
   AUTH GUARD
========================= */
router.beforeEach((to) => {
  const auth = useAuthStore()

  // auth ešte nie je pripravený → pusti ďalej
  if (auth.loadingSession) return true

  // neprihlásený user ide na chránenú stránku
  if (to.meta.requiresAuth && !auth.user) {
    return '/login'
  }

  // prihlásený user ide na login
  if (to.path === '/login' && auth.user) {
    return '/dashboard'
  }

  return true
})

export default router

import { createRouter, createWebHistory } from 'vue-router'
import authRoutes from '@/features/auth/routes'
import dashboardRoutes from '@/features/dashboard/routes'
import usersRoutes from '@/features/users/routes'
import parkingRoutes from '@/features/parking/routes'
import violationsRoutes from '@/features/violations/routes'
import vehiclesRoutes from '@/features/vehicles/routes'
import reportsRoutes from '@/features/reports/routes'
import registrationsRoutes from '@/features/registrations/routes'
import reservationsRoutes from '@/features/reservations/routes'
import settingsRoutes from '@/features/settings/routes'
import feedbackRoutes from '@/features/feedback/routes'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    ...authRoutes,
    {
      path: '/',
      component: () => import('@/layouts/AdminLayout.vue'),
      children: [
        { path: '', redirect: '/dashboard' },
        ...dashboardRoutes,
        ...registrationsRoutes,
        ...reservationsRoutes,
        ...usersRoutes,
        ...parkingRoutes,
        ...violationsRoutes,
        ...vehiclesRoutes,
        ...feedbackRoutes,
        ...reportsRoutes,
        ...settingsRoutes,
      ]
    },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
  ]
})

router.beforeEach((to, from, next) => {
  const rawToken = localStorage.getItem('parkflow_token')
  const token = rawToken && rawToken !== 'undefined' && rawToken !== 'null' && rawToken.trim() !== '' ? rawToken.trim() : null

  if (!token && rawToken) {
    localStorage.removeItem('parkflow_token')
  }

  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !token) {
    if (to.name !== 'Login') {
      next({ name: 'Login' })
    } else {
      next()
    }
  } else if (to.name === 'Login' && token) {
    next({ name: 'Dashboard' })
  } else if (to.meta.requiresSuperAdmin) {
    const storedEmail = (localStorage.getItem('parkflow_user_email') || '').toLowerCase().trim()
    const storedRole = (localStorage.getItem('parkflow_user_role') || '').toLowerCase().trim()
    const isSuperAdmin = storedRole === 'superadmin' || storedRole === 'super_admin' || storedEmail.includes('superadmin') || storedEmail === 'superadmin@parkflow.com' || storedEmail === 'admin@parkflow.com' || !storedEmail
    if (!isSuperAdmin) {
      next({ name: 'Dashboard' })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router

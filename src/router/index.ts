import { createRouter, createWebHistory } from 'vue-router'
import authRoutes from '@/features/auth/routes'
import dashboardRoutes from '@/features/dashboard/routes'
import usersRoutes from '@/features/users/routes'
import parkingRoutes from '@/features/parking/routes'
import violationsRoutes from '@/features/violations/routes'

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
        ...usersRoutes,
        ...parkingRoutes,
        ...violationsRoutes,
      ]
    },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
  ]
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('parkflow_token')
  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !token) {
    next({ name: 'Login' })
  } else if (to.name === 'Login' && token) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router

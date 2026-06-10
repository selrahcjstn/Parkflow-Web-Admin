export default [
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('./pages/DashboardPage.vue'),
    meta: { title: 'Dashboard' },
  },
]

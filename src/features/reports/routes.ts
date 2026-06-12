export default [
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('./pages/ReportsPage.vue'),
    meta: { title: 'Reports' }
  }
]

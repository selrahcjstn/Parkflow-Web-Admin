export default [
  {
    path: '/violations',
    name: 'Violations',
    component: () => import('./pages/ViolationsPage.vue'),
    meta: { title: 'Collections' }
  },
  {
    path: '/violations/:id',
    name: 'ViolationDetail',
    component: () => import('./pages/ViolationDetailPage.vue'),
    meta: { title: 'Collection Details' }
  }
]

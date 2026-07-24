export default [
  {
    path: '/registrations',
    name: 'Registrations',
    component: () => import('./pages/RegistrationsPage.vue'),
    meta: { title: 'Pending Registrations' },
  },
]

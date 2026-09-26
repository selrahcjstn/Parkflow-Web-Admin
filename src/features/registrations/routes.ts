export default [
  {
    path: '/registrations',
    name: 'Registrations',
    component: () => import('./pages/RegistrationsPage.vue'),
    meta: { title: 'Approvals & Document Verification' },
  },
  {
    path: '/schedule-approvals',
    redirect: '/registrations'
  },
]

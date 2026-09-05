export default [
  {
    path: '/registrations',
    name: 'Registrations',
    component: () => import('./pages/RegistrationsPage.vue'),
    meta: { title: 'Pending Registrations' },
  },
  {
    path: '/schedule-approvals',
    name: 'ScheduleApprovals',
    component: () => import('./pages/ScheduleApprovalPage.vue'),
    meta: { title: 'Schedule & COR Verification' },
  },
]

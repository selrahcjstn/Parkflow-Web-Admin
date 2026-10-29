export default [
  { path: '/employee-verification', name: 'EmployeeVerification', component: () => import('./pages/VerificationPage.vue') },
  {
    path: '/vehicle-approvals',
    name: 'VehicleApprovals',
    redirect: { path: '/vehicles', query: { status: 'pending' } },
  },
  // Retired approval URLs keep bookmarks and old notification links usable.
  ...[
    '/approvals', '/approvals/verification', '/approvals/new-users', '/approvals/schedules', '/approvals/vehicles',
    '/registrations', '/registrations/new-users', '/registrations/schedules', '/registrations/vehicles',
    '/schedule-approvals', '/schedule-approval', '/vehicle-approval',
  ].map(path => ({ path, redirect: { path: '/vehicles', query: { status: 'pending' } } })),
]

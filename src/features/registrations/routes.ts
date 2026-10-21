export default [
  {
    path: '/vehicle-approvals',
    name: 'VehicleApprovals',
    component: () => import('./pages/VehicleApprovalsPage.vue'),
    meta: { title: 'Vehicle Approvals' },
  },
  // Retired approval URLs keep bookmarks and old notification links usable.
  ...[
    '/approvals', '/approvals/verification', '/approvals/new-users', '/approvals/schedules', '/approvals/vehicles',
    '/registrations', '/registrations/new-users', '/registrations/schedules', '/registrations/vehicles',
    '/schedule-approvals', '/schedule-approval', '/vehicle-approval',
  ].map(path => ({ path, redirect: '/vehicle-approvals' })),
]

export default [
  {
    path: '/employee-approvals',
    name: 'EmployeeApprovals',
    component: () => import('./pages/NewUserApprovalsPage.vue'),
  },
  {
    path: '/vehicle-approvals',
    name: 'VehicleApprovals',
    redirect: { path: '/vehicles', query: { status: 'pending' } },
  },
  // Legacy / retired employee approval links
  ...[
    '/employee-verification',
    '/approvals/new-users',
    '/registrations/new-users',
  ].map((path) => ({ path, redirect: { path: '/employee-approvals' } })),
  // Retired approval URLs keep bookmarks and old notification links usable.
  ...[
    '/approvals',
    '/approvals/verification',
    '/approvals/schedules',
    '/approvals/vehicles',
    '/registrations',
    '/registrations/schedules',
    '/registrations/vehicles',
    '/schedule-approvals',
    '/schedule-approval',
    '/vehicle-approval',
  ].map((path) => ({ path, redirect: { path: '/vehicles', query: { status: 'pending' } } })),
]

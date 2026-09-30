export default [
  {
    path: '/approvals/new-users',
    name: 'NewUserApprovals',
    component: () => import('./pages/NewUserApprovalsPage.vue'),
    meta: { title: 'New User Approvals' }
  },
  {
    path: '/approvals/schedules',
    name: 'ScheduleApprovals',
    component: () => import('./pages/ScheduleApprovalsPage.vue'),
    meta: { title: 'COR & Schedule Approvals' }
  },
  {
    path: '/approvals/vehicles',
    name: 'VehicleApprovals',
    component: () => import('./pages/VehicleApprovalsPage.vue'),
    meta: { title: 'Vehicle Approvals' }
  },
  {
    path: '/registrations',
    redirect: '/approvals/new-users'
  },
  {
    path: '/registrations/new-users',
    redirect: '/approvals/new-users'
  },
  {
    path: '/registrations/schedules',
    redirect: '/approvals/schedules'
  },
  {
    path: '/registrations/vehicles',
    redirect: '/approvals/vehicles'
  },
  {
    path: '/schedule-approvals',
    redirect: '/approvals/schedules'
  },
  {
    path: '/vehicle-approvals',
    redirect: '/approvals/vehicles'
  }
]

export default [
  {
    path: '/vehicles',
    name: 'Vehicles',
    component: () => import('./pages/VehiclesPage.vue'),
    meta: { title: 'Vehicles' }
  },
  {
    path: '/vehicle-approvals',
    name: 'VehicleApprovals',
    component: () => import('./pages/VehicleApprovalPage.vue'),
    meta: { title: 'Vehicle Approvals' }
  }
]

export default [
  {
    path: '/vehicles',
    name: 'Vehicles',
    component: () => import('./pages/VehiclesPage.vue'),
    meta: { title: 'Vehicles' }
  },
  {
    path: '/vehicles/:id',
    name: 'VehicleDetail',
    component: () => import('./pages/VehicleDetailPage.vue'),
    meta: { title: 'Vehicle Details' }
  },
  {
    path: '/vehicle-approvals',
    redirect: '/registrations'
  }
]

export default [
  {
    path: '/vehicles',
    name: 'Vehicles',
    component: () => import('./pages/VehiclesPage.vue'),
    meta: { title: 'Vehicles' }
  }
]

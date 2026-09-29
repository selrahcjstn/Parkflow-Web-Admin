export default [
  {
    path: '/parking',
    name: 'Parking',
    component: () => import('./pages/ParkingPage.vue'),
    meta: { title: 'Parking' }
  },
  {
    path: '/parking/:id',
    name: 'ParkingSessionDetail',
    component: () => import('./pages/ParkingSessionDetailPage.vue'),
    meta: { title: 'Parking Session Details' }
  }
]

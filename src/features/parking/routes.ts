export default [
  {
    path: '/parking',
    name: 'Parking',
    component: () => import('./pages/ParkingPage.vue'),
    meta: { title: 'Parking' }
  },
  {
    path: '/parking/manual-entry',
    name: 'ParkingManualEntry',
    component: () => import('./pages/ManualEntryPage.vue'),
    meta: { title: 'Log Manual Entry' }
  }
]

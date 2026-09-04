export default [
  {
    path: '/reservations',
    name: 'Reservations',
    component: () => import('./pages/ReservationsPage.vue'),
    meta: { title: 'Parking Reservations & Schedules' }
  }
]

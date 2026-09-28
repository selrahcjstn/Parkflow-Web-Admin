export default [
  {
    path: '/reservations',
    name: 'Reservations',
    component: () => import('./pages/ReservationsPage.vue'),
    meta: { title: 'Parking Reservations & Schedules' }
  },
  {
    path: '/reservations/:id/pass',
    name: 'ReservationPass',
    component: () => import('./pages/ReservationPassPage.vue'),
    meta: { title: 'Official Parking Pass' }
  }
]

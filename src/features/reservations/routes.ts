export default [
  {
    path: '/reservations',
    name: 'Reservations',
    component: () => import('./pages/ReservationsPage.vue'),
    meta: { title: 'Parking Reservations & Schedules' }
  },
  {
    path: '/reservations/create',
    name: 'CreateReservation',
    component: () => import('./pages/CreateReservationPage.vue'),
    meta: { title: 'Reserve Schedule' }
  },
  {
    path: '/reservations/:id',
    name: 'ReservationDetail',
    component: () => import('./pages/ReservationDetailPage.vue'),
    meta: { title: 'Reservation Inspection' }
  },
  {
    path: '/reservations/:id/pass',
    name: 'ReservationPass',
    component: () => import('./pages/ReservationPassPage.vue'),
    meta: { title: 'Official Parking Pass' }
  }
]

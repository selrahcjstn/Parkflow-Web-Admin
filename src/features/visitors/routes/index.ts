export default [{
  path: '/visitors/:id?',
  name: 'Visitors',
  component: () => import('../pages/VisitorsPage.vue'),
  meta: { title: 'Visitors' },
}]

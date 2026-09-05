export default [
  {
    path: '/feedback',
    name: 'Feedback',
    component: () => import('./pages/FeedbackPage.vue'),
    meta: { title: 'Feedback & Suggestions' }
  }
]

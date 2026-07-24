export default [
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('./pages/SettingsPage.vue'),
    meta: { title: 'Settings & Customization' }
  }
]

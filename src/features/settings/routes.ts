export default [
  { path: '/verification-settings', name: 'VerificationSettings', redirect: '/settings' },
  {
    path: '/account-settings',
    name: 'AccountSettings',
    component: () => import('./pages/AccountSettingsPage.vue'),
    meta: { title: 'Account Settings' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('./pages/SettingsPage.vue'),
    meta: { title: 'System Settings & Customization', requiresSuperAdmin: true }
  }
]

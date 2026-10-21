export default [
  { path: '/verification-settings', name: 'VerificationSettings', component: () => import('./pages/VerificationSettingsPage.vue'), meta: { title: 'Verification & Approval Settings' } },
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

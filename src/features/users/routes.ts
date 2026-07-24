export default [
  { path: '/users', name: 'Users', component: () => import('./pages/UsersPage.vue'), meta: { title: 'Clients' } },
  { path: '/users/create', name: 'RegisterUser', component: () => import('./pages/RegisterUserPage.vue'), meta: { title: 'Register Client' } }
]

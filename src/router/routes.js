const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'), // App.vue Anda pindah ke sini
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('pages/DashboardPage.vue') },
      { path: 'kelas', name: 'data-kelas', component: () => import('pages/master/KelasPage.vue') },
      { path: 'guru', name: 'data-guru', component: () => import('pages/master/GuruPage.vue') },
      { path: 'murid', name: 'data-murid', component: () => import('pages/master/MuridPage.vue') },
      { path: 'mapel', name: 'data-mapel', component: () => import('pages/master/MapelPage.vue') },
      {
        path: 'jamsat',
        name: 'data-jamsat',
        component: () => import('pages/master/JamsatPage.vue'),
      },
      {
        path: 'jampeltemplate',
        name: 'data-jampeltemplate',
        component: () => import('pages/master/JampelTemplatePage.vue'),
      },
      // ... rute lain tambahkan di sini
    ],
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('pages/LoginPage.vue'),
  },
  // Tangkap halaman 404
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes

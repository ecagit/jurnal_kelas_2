const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'), // App.vue Anda pindah ke sini
    meta: { requiresAuth: true },
    children: [
      {
        path: 'profil',
        name: 'user-profil',
        component: () => import('pages/setup/UserProfilPage.vue'),
      },
      { path: '', name: 'dashboard', component: () => import('pages/DashboardPage.vue') },
      { path: 'kelas', name: 'data-kelas', component: () => import('pages/master/KelasPage.vue') },
      { path: 'guru', name: 'data-guru', component: () => import('pages/master/GuruPage.vue') },
      { path: 'murid', name: 'data-murid', component: () => import('pages/master/MuridPage.vue') },
      { path: 'mapel', name: 'data-mapel', component: () => import('pages/master/MapelPage.vue') },
      {
        path: 'jamsat',
        name: 'data-jamsat',
        component: () => import('pages/setup/JamsatPage.vue'),
      },
      {
        path: 'jampeltemplate',
        name: 'data-jampeltemplate',
        component: () => import('pages/setup/JampelTemplatePage.vue'),
      },
      {
        path: 'jadwal',
        name: 'data-jadwal',
        component: () => import('pages/setup/JadwalPage.vue'),
      },
      {
        path: 'jadwalperguru',
        name: 'data-jadwal-perguru',
        component: () => import('pages/setup/JadwalPerGuruPage.vue'),
      },

      {
        path: 'harilibur',
        name: 'data-harilibur',
        component: () => import('pages/master/HariLiburPage.vue'),
      },

      {
        path: 'jurnalguruperkelas',
        name: 'jurnal-guru-perkelas',
        component: () => import('pages/master/JurnalGuruPerKelasPage.vue'),
      },
      {
        path: 'jurnalguruperguru',
        name: 'jurnal-guru-perguru',
        component: () => import('pages/master/JurnalGuruPerGuruPage.vue'),
      },
      {
        path: 'absenmurid',
        name: 'absen-murid',
        component: () => import('pages/setup/AbsenMuridPage.vue'),
      },

      {
        path: 'periode',
        name: 'data-periode',
        //component: () => import('pages/master/PeriodePage.vue'),
        component: () => import('pages/setup/_PostPage.vue'),
      },
      {
        path: 'jampel',
        name: 'seting-jampel',
        component: () => import('pages/setup/SetupJamPelajaran.vue'),
        //component: () => import('pages/master/PeriodePage.vue'),
      },

      {
        path: 'permission',
        name: 'data-permission',
        component: () => import('pages/setup/PermissionPage.vue'),
      },
      {
        path: 'dataakun',
        name: 'data-akun',
        component: () => import('pages/setup/UserAdminPage.vue'),
      },
      {
        path: 'backuprestore',
        name: 'backup-restore',
        //component: () => import('pages/setup/BackupRestorePage.vue'),
        component: () => import('pages/setup/UserGuruPage.vue'),
      },
      {
        path: 'school',
        name: 'data-school',
        //component: () => import('pages/setup/BackupRestorePage.vue'),
        component: () => import('pages/setup/UserMuridPage2.vue'),
      },
      {
        path: 'laporanjurnalguru',
        name: 'laporan-jurnal-guru',
        //component: () => import('pages/setup/BackupRestorePage.vue'),
        component: () => import('pages/laporan/LaporanJurnal1.vue'),
      },
      {
        path: 'laporanjurnalgurudetail',
        name: 'laporan-jurnal-guru-dtl',
        //component: () => import('pages/setup/BackupRestorePage.vue'),
        component: () => import('pages/laporan/LaporanJurnal2.vue'),
      },
      /*{
        path: 'laporanjurnalgurudetail',
        name: 'laporan-jurnal-guru-dtl',
        //component: () => import('pages/setup/BackupRestorePage.vue'),
        component: () => import('pages/laporan/LaporanJurnal1.vue'),
      },
*/
      {
        path: 'laporankehadiranmurid',
        name: 'laporan-kehadiran-murid',
        //component: () => import('pages/setup/BackupRestorePage.vue'),
        component: () => import('pages/laporan/LaporanKehadiran2.vue'),
      },
      {
        path: 'laporankehadiranmuriddetail',
        name: 'laporan-kehadiran-murid-dtl',
        //component: () => import('pages/setup/BackupRestorePage.vue'),
        component: () => import('pages/laporan/LaporanKehadiran1.vue'),
      },
      {
        path: 'test1',
        name: 'test-1',
        //component: () => import('pages/setup/BackupRestorePage.vue'),
        component: () => import('src/pages/setup/_ArsipManager.vue'),
      },
      {
        path: 'test2',
        name: 'test-2',
        //component: () => import('pages/setup/BackupRestorePage.vue'),
        component: () => import('src/components/DashboardJadwal.vue'),
      },
      /*
      {
        path: 'test3',
        name: 'test-3',
        //component: () => import('pages/setup/BackupRestorePage.vue'),
        component: () => import('src/pages/setup/_AllowScoreEdit.vue'),
      },
      */
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

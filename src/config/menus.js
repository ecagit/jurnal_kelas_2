/**
 * src/config/menus.js
 * * Single Source of Truth untuk Struktur Navigasi Aplikasi Jurnal Kelas.
 * Digunakan untuk render menu otomatis di MainLayout.vue (v-for)
 * sekaligus sebagai data Seeder otomatis untuk tabel tb_mst_permission di PocketBase.
 */

export const menuConfig = [
  // ==========================================
  // MENU UTAMA: DASHBOARD (Menu Tunggal Root)
  // ==========================================
  {
    c_code: 'menu:dashboard',
    c_nama: 'Dashboard',
    c_tipe: 'menu',
    c_parent: null,
    icon: 'home',
    path: '/', // Navigasi Halaman Utama
  },

  // ==========================================
  // GRUP MENU: JADWAL (Expansion Item)
  // ==========================================
  {
    c_code: 'menu:group_jadwal',
    c_nama: 'Jadwal',
    c_tipe: 'menu',
    c_parent: null,
    icon: 'receipt',
    children: [
      /*     {
        c_code: 'menu:jamsat',
        c_nama: 'Data Jam Satuan',
        c_tipe: 'menu',
        c_parent: 'menu:group_jadwal',
        icon: 'schedule',
        path: '/jamsat',
      },
      {
        c_code: 'menu:jampeltemplate',
        c_nama: 'Data Template Jam Pelajaran',
        c_tipe: 'menu',
        c_parent: 'menu:group_jadwal',
        icon: 'layers',
        path: '/jampeltemplate',
      },
*/ {
        c_code: 'menu:jadwal',
        c_nama: 'Data Jadwal',
        c_tipe: 'menu',
        c_parent: 'menu:group_jadwal',
        icon: 'calendar_month',
        path: '/jadwal',
      },
      {
        c_code: 'menu:jadwalperguru',
        c_nama: 'Data Jadwal Per Guru',
        c_tipe: 'menu',
        c_parent: 'menu:group_jadwal',
        icon: 'calendar_month',
        path: '/jadwalperguru',
      },

      {
        c_code: 'menu:jampel',
        c_nama: 'Pengaturan Jam Pelajaran',
        c_tipe: 'menu',
        c_parent: 'menu:group_jadwal',
        icon: 'schedule',
        path: '/jampel',
      },
      {
        c_code: 'menu:harilibur',
        c_nama: 'Pengaturan Hari Libur',
        c_tipe: 'menu',
        c_parent: 'menu:group_jadwal',
        icon: 'event',
        path: '/harilibur',
      },
    ],
  },

  // ==========================================
  // MENU UTAMA TUNGGAL: JURNAL & ABSENSI
  // ==========================================
  {
    c_code: 'menu:jurnalguruperkelas',
    c_nama: 'Jurnal Guru Per Kelas',
    c_tipe: 'menu',
    c_parent: null,
    icon: 'area_chart',
    path: '/jurnalguruperkelas',
  },
  {
    c_code: 'menu:jurnalguruperguru',
    c_nama: 'Jurnal Guru Per Guru',
    c_tipe: 'menu',
    c_parent: null,
    icon: 'line_axis',
    path: '/jurnalguruperguru',
  },
  {
    c_code: 'menu:absenmurid',
    c_nama: 'Absensi Murid',
    c_tipe: 'menu',
    c_parent: null,
    icon: 'groups',
    path: '/absenmurid',
  },

  // ==========================================
  // GRUP MENU: DATA MASTER (Expansion Item)
  // ==========================================
  {
    c_code: 'menu:group_masterdata',
    c_nama: 'Data Master',
    c_tipe: 'menu',
    c_parent: null,
    icon: 'archive',
    children: [
      {
        c_code: 'menu:kelas',
        c_nama: 'Data Kelas',
        c_tipe: 'menu',
        c_parent: 'menu:group_masterdata',
        icon: 'class',
        path: '/kelas',
      },
      {
        c_code: 'menu:guru',
        c_nama: 'Data Guru',
        c_tipe: 'menu',
        c_parent: 'menu:group_masterdata',
        icon: 'person',
        path: '/guru',
      },
      {
        c_code: 'menu:murid',
        c_nama: 'Data Murid',
        c_tipe: 'menu',
        c_parent: 'menu:group_masterdata',
        icon: 'people',
        path: '/murid',
      },
      {
        c_code: 'menu:mapel',
        c_nama: 'Data Mapel',
        c_tipe: 'menu',
        c_parent: 'menu:group_masterdata',
        icon: 'menu_book',
        path: '/mapel',
      },
    ],
  },

  // ==========================================
  // GRUP MENU: LAPORAN (Expansion Item)
  // ==========================================
  {
    c_code: 'menu:group_laporan',
    c_nama: 'Laporan',
    c_tipe: 'menu',
    c_parent: null,
    icon: 'library_books',
    children: [
      {
        c_code: 'menu:laporankehadiranmurid',
        c_nama: 'Laporan Kehadiran Murid',
        c_tipe: 'menu',
        c_parent: 'menu:group_laporan',
        icon: 'summarize',
        path: '/laporankehadiranmurid',
      },
      {
        c_code: 'menu:laporankehadiranmuriddetail',
        c_nama: 'Laporan Kehadiran Murid (Detail)',
        c_tipe: 'menu',
        c_parent: 'menu:group_laporan',
        icon: 'summarize',
        path: '/laporankehadiranmuriddetail',
      },

      {
        c_code: 'menu:laporanjurnalguru',
        c_nama: 'Laporan Jurnal Guru',
        c_tipe: 'menu',
        c_parent: 'menu:group_laporan',
        icon: 'summarize',
        path: '/laporanjurnalguru',
      },
      {
        c_code: 'menu:laporanjurnalgurudetail',
        c_nama: 'Laporan Jurnal Guru (Detail)',
        c_tipe: 'menu',
        c_parent: 'menu:group_laporan',
        icon: 'summarize',
        path: '/laporanjurnalgurudetail',
      },
    ],
  },

  // ==========================================
  // GRUP MENU: PENGATURAN (Expansion Item)
  // ==========================================
  {
    c_code: 'menu:group_pengaturan',
    c_nama: 'Pengaturan',
    c_tipe: 'menu',
    c_parent: null,
    icon: 'settings',
    children: [
      {
        c_code: 'menu:school',
        c_nama: 'Sekolah',
        c_tipe: 'menu',
        c_parent: 'menu:group_pengaturan',
        icon: 'school',
        path: '/school',
      },
      {
        c_code: 'menu:periode',
        c_nama: 'Periode',
        c_tipe: 'menu',
        c_parent: 'menu:group_pengaturan',
        icon: 'event',
        path: '/periode',
      },
      {
        c_code: 'menu:dataakun',
        c_nama: 'Data Akun',
        c_tipe: 'menu',
        c_parent: 'menu:group_pengaturan',
        icon: 'people',
        path: '/dataakun', // Navigasi Halaman
      },
      {
        c_code: 'menu:permission',
        c_nama: 'Permission',
        c_tipe: 'menu',
        c_parent: 'menu:group_pengaturan',
        icon: 'key',
        path: '/permission',
      },
      {
        c_code: 'menu:backuprestore',
        c_nama: 'Akun Guru - Backup & Restore',
        c_tipe: 'menu',
        c_parent: 'menu:group_pengaturan',
        icon: 'backup',
        path: '/backuprestore',
      },
      {
        c_code: 'menu:sinkronmenu',
        c_nama: 'Sinkronisasi Menu',
        c_tipe: 'menu',
        c_parent: 'menu:group_pengaturan',
        icon: 'sync',
        action: 'synchmenu',
      },
      //tester menu
      {
        c_code: 'menu:test1',
        c_nama: 'Test Menu 1',
        c_tipe: 'menu',
        c_parent: 'menu:group_pengaturan',
        icon: 'test',
        path: '/test1',
      },
      {
        c_code: 'menu:test2',
        c_nama: 'Test Menu 2',
        c_tipe: 'menu',
        c_parent: 'menu:group_pengaturan',
        icon: 'sync',
        path: '/test2',
      },
      /*
      {
        c_code: 'menu:test3',
        c_nama: 'Test Menu 3',
        c_tipe: 'menu',
        c_parent: 'menu:group_pengaturan',
        icon: 'sync',
        path: '/test3',
      },
      */
      /*
      {
        c_code: 'menu:sinkronmenu',
        c_nama: 'Sinkronisasi Menu',
        c_tipe: 'menu',
        c_parent: 'menu:group_pengaturan',
        icon: 'sync',
        path: '/test2',
      },
      {
        c_code: 'menu:sinkronmenu',
        c_nama: 'Sinkronisasi Menu',
        c_tipe: 'menu',
        c_parent: 'menu:group_pengaturan',
        icon: 'sync',
        path: '/test3',
      },*/
    ],
  },

  // ==========================================
  // GRUP MENU: AKUN (Expansion Item)
  // ==========================================
  {
    c_code: 'menu:group_akun',
    c_nama: 'Akun',
    c_tipe: 'menu',
    c_parent: null,
    icon: 'account_circle',
    children: [
      {
        c_code: 'menu:login',
        c_nama: 'Login',
        c_tipe: 'menu',
        c_parent: 'menu:group_akun',
        icon: 'login',
        path: '/login', // Navigasi Halaman
      },
      {
        c_code: 'menu:gantiperan',
        c_nama: 'Ganti Peran',
        c_tipe: 'menu',
        c_parent: 'menu:group_akun',
        icon: 'perm_identity',
        //path: '/gantiperan', // Navigasi Halaman
        action: 'gantiperan',
      },
      {
        c_code: 'menu:profil',
        c_nama: 'Profil',
        c_tipe: 'menu',
        c_parent: 'menu:group_akun',
        icon: 'person',
        path: '/profil', // Navigasi Halaman
      },
      {
        c_code: 'menu:logout',
        c_nama: 'Keluar',
        c_tipe: 'menu',
        c_parent: 'menu:group_akun',
        icon: 'logout',
        action: 'logout', // Memicu Fungsi JavaScript (@click="confirmLogout")
      },
    ],
  },
]

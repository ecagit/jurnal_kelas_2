<script setup>
import { pb } from 'src/boot/pocketbase'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/authStore'
import { useQuasar } from 'quasar'
import { storeToRefs } from 'pinia'
import { usePeriodeStore } from 'src/stores/periode'
import { menuConfig } from 'src/config/menus'

//const authStore = useAuthStore()
const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()
const leftDrawerOpen = ref(false)

const toggleLeftDrawer = () => {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

// Inisialisasi store
const periodeStore = usePeriodeStore()

// Gunakan storeToRefs agar state tetap reaktif ketika dibaca di template
const { activePeriodeId } = storeToRefs(periodeStore)

const syncPermissionsToDB = async () => {
  try {
    // Ekstrak menu dari struktur bersarang menjadi array 1 dimensi (flat)
    const flatMenus = []
    menuConfig.forEach((parent) => {
      flatMenus.push({
        c_code: parent.c_code,
        c_nama: parent.c_nama,
        c_tipe: parent.c_tipe,
        c_parent: parent.c_parent,
        b_aktif: true,
      })
      if (parent.children) {
        parent.children.forEach((child) => {
          flatMenus.push({
            c_code: child.c_code,
            c_nama: child.c_nama,
            c_tipe: child.c_tipe,
            c_parent: child.c_parent,
            b_aktif: true,
          })
        })
      }
    })

    // Looping dan simpan ke PocketBase
    for (const menu of flatMenus) {
      // Cek dulu apakah kode menu ini sudah ada di database untuk mencegah duplikasi
      const exist = await pb.collection('tb_mst_permission').getFullList({
        filter: `c_code = "${menu.c_code}"`,
      })

      if (exist.length === 0) {
        await pb.collection('tb_mst_permission').create({
          c_code: menu.c_code,
          c_nama: menu.c_nama,
          c_tipe: menu.c_tipe,
          c_parent: menu.c_parent,
          b_aktif: true,
        })
        console.log(`Berhasil insert: ${menu.c_nama}`)
      }
    }
    alert('Sinkronisasi Menu ke Database Berhasil!')
  } catch (error) {
    console.error('Error saat sync:', error)
  }
}

// =======================================================
// KUMPULAN FUNGSI INTERNAL (AKSI)
// =======================================================
const confirmLogout = () => {
  $q.dialog({
    title: 'Konfirmasi',
    message: 'Apakah Anda yakin ingin keluar dari aplikasi?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    // 1. Jalankan proses hapus sesi/token di store
    auth.logout()

    // 2. Arahkan kembali ke halaman login
    router.push('/login')
  })
}

// =======================================================
// FUNGSI PEMETA AKSI (CENTRAL HANDLER)
// =======================================================
const executeAction = (actionName) => {
  if (!actionName) return

  switch (actionName) {
    case 'logout':
      confirmLogout()
      break

    case 'synchmenu':
      syncPermissionsToDB()
      break

    // --- TAMBAHKAN BLOK GANTI PERAN DI SINI ---
    case 'gantiperan':
      // 1. Pastikan user punya lebih dari 1 role
      if (auth.allRoles.length <= 1) {
        $q.notify({
          type: 'warning',
          message: 'Anda hanya memiliki satu peran (Role).',
          position: 'top',
        })
        return
      }

      // 2. Munculkan Dialog Pemilihan Role
      $q.dialog({
        title: 'Ganti Peran Akses',
        message: `Peran Anda saat ini: ${auth.activeRole}`,
        options: {
          type: 'radio',
          model: auth.activeRole, // Set default pilihan ke role yang sedang aktif
          // Mapping array allRoles menjadi format opsi yang diminta Quasar {label, value}
          items: auth.allRoles.map((role) => ({ label: role, value: role })),
        },
        cancel: true,
        persistent: true,
      }).onOk(async (newSelectedRole) => {
        // Jika user memilih role yang sama, abaikan
        if (newSelectedRole === auth.activeRole) return

        try {
          // 3. Ubah state aktif di Pinia
          await auth.switchRole(newSelectedRole)

          // 5. Lempar user kembali ke dashboard/root agar halaman refresh dengan menu baru
          router.push('/')

          $q.notify({
            type: 'positive',
            message: `Berhasil beralih ke peran: ${newSelectedRole}`,
            position: 'bottom',
          })
        } catch (error) {
          console.error(error)
          $q.notify({ type: 'negative', message: 'Gagal mengganti peran' })
        }
      })
      break

    default:
      console.warn(`Action "${actionName}" belum didaftarkan di executeAction()`)
  }
}

// =======================================================
// HOOKS & VALIDASI AKSES
// =======================================================
onMounted(async () => {
  // --- MODIFIKASI TERBARU: AUTO REDIRECT LOGIN BILA TOKEN EXPIRED / BELUM LOGIN ---
  if (!pb.authStore.isValid || !auth.isLoggedIn) {
    auth.logout() // Bersihkan data store Pinia jika ada sisa state menggantung
    router.push('/login')
    return // Hentikan eksekusi kode di bawahnya
  }

  periodeStore.fetchActivePeriode()

  // --- HANDLE REFRESH HALAMAN ---
  if (auth.isLoggedIn && auth.activePermissions.length === 0) {
    await auth.getUserPermission(auth.activeRole)
  }
})
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-white text-grey-9">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
        <q-toolbar-title class="text-weight-bold" style="font-size: 18px">
          {{ activePeriodeId ? `${activePeriodeId}` : '...' }}
        </q-toolbar-title>

        <div class="row items-center q-gutter-sm">
          <div class="text-caption text-weight-bold">{{ auth.user?.email }}</div>
          <q-btn flat round dense icon="logout" title="Keluar" @click="confirmLogout">
            <q-tooltip>Keluar</q-tooltip>
          </q-btn>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      :width="240"
      class="bg-grey-10 text-white"
      :behavior="$q.screen.lt.md ? 'mobile' : 'desktop'"
    >
      <q-toolbar>
        <q-icon name="query_stats" size="md" />
        <q-toolbar-title class="text-subtitle1 text-weight-bold"> Jurnal Kelas J</q-toolbar-title>
        <q-btn
          class="lt-md"
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />
      </q-toolbar>

      <q-list separator dark>
        <template v-for="menu in auth.currentMenu" :key="menu.c_code">
          <q-expansion-item
            v-if="menu.children && menu.children.length > 0"
            expand-separator
            :icon="menu.icon"
            :label="menu.c_nama"
            dense
            dark
            class="text-white"
          >
            <q-item
              v-for="child in menu.children"
              :key="child.c_code"
              clickable
              v-ripple
              :to="child.path || undefined"
              :exact="!!child.path"
              active-class="bg-primary text-white"
              dense
              class="submenu-item"
              @click="child.action ? executeAction(child.action) : null"
            >
              <q-item-section avatar style="min-width: 40px">
                <q-icon :name="child.icon" />
              </q-item-section>
              <q-item-section>{{ child.c_nama }}</q-item-section>
            </q-item>
          </q-expansion-item>

          <q-item
            v-else
            clickable
            v-ripple
            :to="menu.path || undefined"
            :exact="!!menu.path"
            active-class="bg-primary text-white"
            dense
            class="q-py-sm"
            @click="menu.action ? executeAction(menu.action) : null"
          >
            <q-item-section avatar style="min-width: 40px">
              <q-icon :name="menu.icon" />
            </q-item-section>
            <q-item-section>{{ menu.c_nama }}</q-item-section>
          </q-item>
        </template>
      </q-list>
    </q-drawer>
    <q-page-container class="bg-grey-2">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<!--
  2026-05-19
  - -ok Perlu revisi Menu penambahan jadwal pada JadwalPage.vue harus diubah berdasarkan c_jam_id
  - --- Perlu revisi Generate jadwal di JurnalGuruPerKelasPage.vue dari JadwalPage.vue yg ditambahkan manual tidak muncul di JurnalGuruPerKelasPage.vue, karena hanya c_jam_id tunggal yg bisa masuk. (jika dimasukkan c_jam_id sama untuk guru yg agama islam dan non islam)

  2026-05-24
  - Dinamic Menu Ok
  - Perlu koreksi pada authStore.js apakah default role 'Guru'
      const defaultRoleStr = authData.record.c_default_role || 'Guru' //!perlu koreksi jika nama field default role di tabel users bukan c_default_role
      activeRole.value = defaultRoleStr
  - Perlu memastikan debug role masing2 user untuk fungsi switchRole
  - Perlu menerapkan activeUserID(c_guru_id/c_murid_id) pada halaman JurnalGuruPerGuruPage.vue, sehingga hanya guru bersangkutan yg bisa melihat data transaksinya




  NAMA: Try Seksa Wharid Hidayat
  NIP: 197408052009031002
  ASAL SEKOLAH: SMPN 1 Palu
  -->

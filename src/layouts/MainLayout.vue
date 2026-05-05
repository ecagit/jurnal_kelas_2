<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-white text-grey-9">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
        <q-toolbar-title class="text-weight-bold"> Jurnal Kelas </q-toolbar-title>

        <div class="row items-center q-gutter-sm">
          <div class="text-caption text-weight-bold">{{ auth.user?.email }}</div>
          <!-- <q-btn flat round dense icon="logout" color="negative" @click="confirmLogout"> -->
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
      class="bg-grey-10 text-white"
      :behavior="$q.screen.lt.md ? 'mobile' : 'desktop'"
    >
      <q-toolbar>
        <q-icon name="school" size="sm" />
        <q-toolbar-title class="text-subtitle1 text-weight-bold"> Jurnal Kelas </q-toolbar-title>

        <q-btn
          class="lt-md"
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />
        <!--<q-btn class="lt-md" flat dense round icon="close" @click="toggleLeftDrawer" />-->
      </q-toolbar>

      <q-list>
        <q-item clickable v-ripple to="/" exact active-class="bg-primary text-white">
          <q-item-section avatar><q-icon name="home" /></q-item-section>
          <q-item-section>Dashboard</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/kelas" active-class="bg-primary text-white">
          <q-item-section avatar><q-icon name="meeting_room" /></q-item-section>
          <q-item-section>Data Kelas</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/guru" active-class="bg-primary text-white">
          <q-item-section avatar><q-icon name="person" /></q-item-section>
          <q-item-section>Data Guru</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/murid" active-class="bg-primary text-white">
          <q-item-section avatar><q-icon name="people" /></q-item-section>
          <q-item-section>Data Murid</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/mapel" active-class="bg-primary text-white">
          <q-item-section avatar><q-icon name="menu_book" /></q-item-section>
          <q-item-section>Data Mapel</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/jamsat" active-class="bg-primary text-white">
          <q-item-section avatar><q-icon name="menu_book" /></q-item-section>
          <q-item-section>Data Jam Satuan</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/jampeltemplate" active-class="bg-primary text-white">
          <q-item-section avatar><q-icon name="menu_book" /></q-item-section>
          <q-item-section>Data Jam Pelajaran Template</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container class="bg-grey-2">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/authStore'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()
const leftDrawerOpen = ref(false)

const toggleLeftDrawer = () => {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

const confirmLogout = () => {
  $q.dialog({
    title: 'Konfirmasi',
    message: 'Apakah Anda yakin ingin keluar dari aplikasi?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    // 1. Jalankan proses hapus sesi/token di store
    auth.logout()

    // 2. Arahkan kembali ke halaman login (gunakan void agar TypeScript aman)
    void router.push('/login')
  })
}
</script>

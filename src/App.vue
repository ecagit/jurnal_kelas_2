<script setup>
// Di dalam <script setup> src/App.vue atau MainLayout.vue
import { onMounted } from 'vue'
import { useAuthStore } from 'src/stores/authStore'

const authStore = useAuthStore()

onMounted(async () => {
  // Jika user terdeteksi login di local storage dan memiliki role aktif
  if (authStore.isLoggedIn && authStore.activeRole) {
    console.log('Memicu ulang sinkronisasi Konteks Peran pasca-refresh...')
    await authStore.fetchRoleContext(authStore.activeRole)
  }
})
</script>

<template>
  <router-view />
</template>

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pb } from 'boot/pocketbase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(pb.authStore.model)
  const isLoggedIn = ref(pb.authStore.isValid)

  async function login(email, password) {
    const authData = await pb.collection('users').authWithPassword(email, password)
    user.value = pb.authStore.model
    isLoggedIn.value = true
    return authData
  }

  function logout() {
    pb.authStore.clear()
    user.value = null
    isLoggedIn.value = false
  }

  return { user, isLoggedIn, login, logout }
})

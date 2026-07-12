<script setup>
import { ref } from 'vue'
//import pb from 'src/lib/pb'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/authStore'

const email = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

// State untuk mengontrol visibilitas (mata terbuka/tertutup)
const showPassword = ref(false)

const router = useRouter()
const auth = useAuthStore()

const handleLogin = async () => {
  loading.value = true
  errorMsg.value = ''

  try {
    await auth.login(email.value, password.value)
    await router.push('/')
  } catch (err) {
    console.error(err)
    errorMsg.value = 'Login gagal. Cek kembali email/password.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <q-layout>
    <q-page-container>
      <q-page class="flex flex-center bg-blue-grey-1">
        <q-card class="shadow-10" style="width: 360px; border-radius: 12px">
          <q-card-section class="text-center q-pt-xl q-pb-none">
            <q-img
              src="~assets/logo250.png"
              style="width: 90px; height: 90px"
              class="q-mb-sm"
              fit="contain"
            />
            <div class="text-h5 text-weight-bold">Login Jurnal</div>
          </q-card-section>

          <q-card-section>
            <q-form @submit.prevent="handleLogin" class="q-gutter-md">
              <q-input
                v-model="email"
                label="Email atau Username"
                type="text"
                outlined
                dense
                lazy-rules
                :rules="[(val) => (val && val.length > 0) || 'Email tidak boleh kosong']"
              />
              <q-input
                v-model="password"
                label="Password"
                :type="showPassword ? 'text' : 'password'"
                outlined
                dense
                lazy-rules
                :rules="[(val) => (val && val.length > 0) || 'Password tidak boleh kosong']"
              >
                <template v-slot:append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>
              <div v-if="errorMsg" class="text-negative text-center text-caption q-mt-sm">
                {{ errorMsg }}
              </div>

              <div class="row justify-center q-mt-md">
                <q-btn
                  type="submit"
                  color="primary"
                  label="Masuk"
                  class="q-px-xl"
                  :loading="loading"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

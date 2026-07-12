<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from 'src/stores/authStore'
import { useQuasar } from 'quasar'
import { pb } from 'src/boot/pocketbase'

const $q = useQuasar()
const authStore = useAuthStore()

// --- 1. STATE DARI AUTH STORE ---
const currentUser = computed(() => authStore.user || {})

// Fungsi pembantu pengecekan role secara keseluruhan
const isRole = (roleName) => {
  if (!roleNames.value.length) return false
  return roleNames.value.includes(roleName)
}

// --- 2. STATE DATA RELASIONAL (DATABASE) ---
const isLoading = ref(false)
const mapelGuru = ref([])
const kelasWali = ref('')
const kelasMurid = ref('')

const roleNames = ref([])

const userRoles = computed(() => {
  return roleNames.value.map((name) => ({
    name: name,
    isActive: name === authStore.activeRole,
  }))
})

// =================================================================
// 💡 STATE & FUNGSI UPLOAD AVATAR
// =================================================================
const fileInput = ref(null)
const isUploadingAvatar = ref(false)

// Menghasilkan URL gambar dari PocketBase
const avatarUrl = computed(() => {
  if (currentUser.value?.avatar) {
    // Generate URL gambar dengan ukuran thumbnail 100x100
    return pb.files.getURL(currentUser.value, currentUser.value.avatar, { thumb: '100x100' })
  }
  return null
})

// Memicu klik pada input file yang disembunyikan
const triggerUpload = () => {
  fileInput.value.click()
}

// Menangani proses unggah ke PocketBase
const handleAvatarUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  isUploadingAvatar.value = true
  try {
    const formData = new FormData()
    formData.append('avatar', file) // Pastikan nama field 'avatar' sesuai dengan di database

    // Update data user di database
    const updatedUser = await pb.collection('users').update(currentUser.value.id, formData)

    // Perbarui state lokal di Pinia (sesuaikan dengan metode di authStore Bapak)
    authStore.user = updatedUser

    $q.notify({ type: 'positive', message: 'Foto profil berhasil diperbarui!', position: 'top' })
  } catch (error) {
    console.error('Gagal mengunggah avatar:', error)
    $q.notify({ type: 'negative', message: 'Gagal mengunggah foto profil', position: 'top' })
  } finally {
    isUploadingAvatar.value = false
    event.target.value = '' // Reset input agar file yang sama bisa diunggah lagi jika gagal
  }
}
// =================================================================

/**
 * Fungsi untuk menarik data spesifik role dari PocketBase
 */
async function fetchProfileDetails() {
  const empId = currentUser.value.c_emp_id
  if (!empId) return

  isLoading.value = true
  try {
    if (currentUser.value.expand?.c_role) {
      const expandedRoles = currentUser.value.expand.c_role
      const rolesArray = Array.isArray(expandedRoles) ? expandedRoles : [expandedRoles]
      roleNames.value = rolesArray.map((r) => r.c_role)
    } else if (currentUser.value.c_role && currentUser.value.c_role.length > 0) {
      try {
        const masterRole = await pb.collection('tb_mst_role').getFullList({ requestKey: null })
        const roleMap = new Map(masterRole.map((r) => [r.id, r.c_role]))
        roleNames.value = currentUser.value.c_role.map((id) => roleMap.get(id) || id)
      } catch (roleErr) {
        console.error('Gagal memuat master role:', roleErr)
        roleNames.value = currentUser.value.c_role
      }
    }

    if (isRole('Guru') || isRole('Walikelas')) {
      try {
        const guruRecord = await pb
          .collection('tb_mst_guru')
          .getFirstListItem(`c_guru_id="${empId}"`, { requestKey: null })

        if (isRole('Guru') && guruRecord.j_mapel_id && guruRecord.j_mapel_id.length > 0) {
          try {
            const masterMapel = await pb
              .collection('tb_mst_mapel')
              .getFullList({ requestKey: null })
            const mapelMap = new Map(masterMapel.map((m) => [m.id, m.c_nama_mapel]))
            mapelGuru.value = guruRecord.j_mapel_id.map((id) => mapelMap.get(id) || id)
          } catch (e) {
            console.error('Gagal memetakan mata pelajaran:', e)
          }
        }

        if (isRole('Walikelas')) {
          try {
            const kelasRecord = await pb
              .collection('tb_mst_kelas')
              .getFirstListItem(`c_wali_kelas_id="${guruRecord.c_guru_id}"`, { requestKey: null })
            kelasWali.value = kelasRecord.c_nama_kelas || kelasRecord.c_kelas_id
          } catch (e) {
            console.warn('Wali kelas belum ditugaskan ke kelas manapun.', e)
          }
        }
      } catch (guruErr) {
        console.warn('Data detail guru tidak ditemukan untuk c_emp_id ini.', guruErr)
      }
    }

    if (isRole('Murid') || isRole('Adminkelas')) {
      try {
        const muridRecord = await pb
          .collection('tb_mst_murid')
          .getFirstListItem(`c_murid_id="${empId}"`, {
            expand: 'c_kelas_id',
            requestKey: null,
          })
        kelasMurid.value = muridRecord.expand?.c_kelas_id?.c_nama_kelas || muridRecord.c_kelas_id
      } catch (muridErr) {
        console.warn('Data detail murid tidak ditemukan untuk c_emp_id ini.', muridErr)
      }
    }
  } catch (error) {
    console.error('Gagal menarik detail profil:', error)
  } finally {
    isLoading.value = false
  }
}

// --- 3. STATE & FUNGSI GANTI PASSWORD ---
const isSaving = ref(false)
const passwordForm = ref({
  oldPassword: '',
  password: '',
  passwordConfirm: '',
})

async function handleChangePassword() {
  isSaving.value = true
  try {
    const recordId = currentUser.value.id

    await pb.collection('users').update(recordId, {
      oldPassword: passwordForm.value.oldPassword,
      password: passwordForm.value.password,
      passwordConfirm: passwordForm.value.passwordConfirm,
    })

    $q.notify({ type: 'positive', message: 'Password berhasil diperbarui!', position: 'top' })
    passwordForm.value = { oldPassword: '', password: '', passwordConfirm: '' }
  } catch (error) {
    console.error('Gagal update password:', error)
    $q.notify({
      type: 'negative',
      message:
        error?.response?.message || 'Gagal memperbarui password. Pastikan password lama benar.',
      position: 'top',
    })
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  await fetchProfileDetails()
})
</script>

<template>
  <q-page padding>
    <div class="row q-col-gutter-sm justify-center">
      <div class="col-12 col-md-6">
        <q-card bordered class="shadow-2">
          <q-card-section class="bg-primary text-white text-center">
            <div class="relative-position" style="display: inline-block">
              <q-avatar
                size="100px"
                class="shadow-5 q-mb-md bg-grey-3 cursor-pointer"
                @click="triggerUpload"
              >
                <template v-if="isUploadingAvatar">
                  <q-spinner color="primary" size="3em" />
                </template>
                <template v-else-if="avatarUrl">
                  <img :src="avatarUrl" style="object-fit: cover" />
                </template>
                <template v-else>
                  <q-icon name="person" size="80px" color="primary" />
                </template>
              </q-avatar>

              <q-btn
                round
                color="secondary"
                icon="edit"
                size="sm"
                class="absolute-bottom-right shadow-4"
                style="bottom: 16px; right: 0"
                @click="triggerUpload"
                :disable="isUploadingAvatar"
              />

              <input
                type="file"
                ref="fileInput"
                style="display: none"
                accept="image/*"
                @change="handleAvatarUpload"
              />
            </div>
            <div class="text-h5 q-mb-xs">{{ currentUser.name }}</div>

            <div class="row justify-center q-gutter-xs q-mt-xs">
              <template v-if="userRoles.length > 0">
                <q-chip
                  v-for="role in userRoles"
                  :key="role.name"
                  :color="role.isActive ? 'green-2' : 'grey-4'"
                  :text-color="role.isActive ? 'green-9' : 'grey-7'"
                  :icon="role.isActive ? 'check_circle' : 'radio_button_unchecked'"
                  class="text-weight-bold"
                  size="md"
                >
                  {{ role.name }}
                </q-chip>
              </template>
              <div v-else class="text-caption text-grey-4">Memuat hak akses...</div>
            </div>
          </q-card-section>

          <q-card-section>
            <q-list separator>
              <q-item>
                <q-item-section avatar><q-icon name="badge" color="primary" /></q-item-section>
                <q-item-section>
                  <q-item-label caption>ID Pengguna (c_emp_id)</q-item-label>
                  <q-item-label class="text-weight-medium">{{ currentUser.c_emp_id }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section avatar><q-icon name="email" color="primary" /></q-item-section>
                <q-item-section>
                  <q-item-label caption>Email / Username</q-item-label>
                  <q-item-label class="text-weight-medium">{{ currentUser.email }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="isRole('Guru')">
                <q-item-section avatar><q-icon name="menu_book" color="positive" /></q-item-section>
                <q-item-section>
                  <q-item-label caption>Mata Pelajaran yang Diampu</q-item-label>
                  <q-item-label v-if="isLoading">Memuat data...</q-item-label>
                  <q-item-label v-else-if="mapelGuru?.length">
                    <q-chip
                      v-for="(mapel, index) in mapelGuru"
                      :key="index"
                      color="positive"
                      text-color="white"
                      size="md"
                      dense
                    >
                      {{ mapel }}
                    </q-chip>
                  </q-item-label>
                  <q-item-label v-else class="text-grey">Belum ada mapel diatur</q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="isRole('Walikelas')">
                <q-item-section avatar
                  ><q-icon name="supervisor_account" color="warning"
                /></q-item-section>
                <q-item-section>
                  <q-item-label caption>Wali Kelas Dari</q-item-label>
                  <q-item-label v-if="isLoading">Memuat data...</q-item-label>
                  <q-item-label v-else class="text-weight-bold text-warning">
                    {{ kelasWali || 'Belum ditugaskan ke kelas' }}
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="isRole('Murid') || isRole('Adminkelas')">
                <q-item-section avatar><q-icon name="school" color="info" /></q-item-section>
                <q-item-section>
                  <q-item-label caption>Kelas Saat Ini</q-item-label>
                  <q-item-label v-if="isLoading">Memuat data...</q-item-label>
                  <q-item-label v-else class="text-weight-bold text-info">
                    {{ kelasMurid || 'Belum terdaftar di kelas' }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card bordered class="shadow-2">
          <q-card-section>
            <div class="text-h6 q-mb-md">Keamanan & Ganti Password</div>
            <q-form @submit.prevent="handleChangePassword" class="q-gutter-md">
              <q-input
                v-model="passwordForm.oldPassword"
                type="password"
                label="Password Lama"
                outlined
                dense
                :rules="[(val) => !!val || 'Password lama wajib diisi']"
              />
              <q-input
                v-model="passwordForm.password"
                type="password"
                label="Password Baru"
                outlined
                dense
                :rules="[(val) => val.length >= 8 || 'Minimal 8 karakter']"
              />
              <q-input
                v-model="passwordForm.passwordConfirm"
                type="password"
                label="Konfirmasi Password Baru"
                outlined
                dense
                :rules="[
                  (val) => !!val || 'Konfirmasi wajib diisi',
                  (val) => val === passwordForm.password || 'Password baru tidak cocok',
                ]"
              />

              <div class="row justify-end q-mt-md">
                <q-btn
                  label="Perbarui Password"
                  type="submit"
                  color="primary"
                  :loading="isSaving"
                  icon="save"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

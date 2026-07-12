<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { pb } from 'boot/pocketbase'
import { handlePBError } from 'src/lib/errorHandler'
import { getGuruLookup } from 'src/lib/utils'
import { watch } from 'vue'

const $q = useQuasar()

// State Data Table & UI
const rows = ref([])
const loading = ref(false)
const filter = ref('')
const showForm = ref(false)
const isEdit = ref(false)

// State Pagination & Sorting Server-Side
const pagination = ref({
  sortBy: 'name',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

// Options untuk dropdown role & Guru
const roleOptions = ref([])
const guruOptions = ref([])
const filteredGuruOptions = ref([])
const filtermain = 'Guru'

// Konstanta Password Default
const defaultPass = 'Smpn1palu'

// State Form
const form = ref({
  id: '',
  email: '',
  //password: '',
  //passwordConfirm: '',
  emailVisibility: true,
  name: '',
  avatar: '',
  c_role: '',
  c_default_role: 'Guru',
  c_emp_id: '',
  b_aktif: '',
})

// Kolom default yang ditampilkan
const kolomAktif = ref(['no', 'name', 'email', 'c_role', 'emailVisibility', 'b_aktif', 'actions'])

// ============================================
// KONFIGURASI KOLOM Q-TABLE
// ============================================
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no' },
  { name: 'email', label: 'EMAIL / USERNAME', align: 'left', field: 'email', sortable: true },
  { name: 'name', label: 'NAMA', align: 'left', field: 'name', sortable: true },
  { name: 'avatar', label: 'AVATAR', align: 'left', field: 'avatar' },
  //  {
  //    name: 'c_role',
  //    label: 'ROLE (RELASI)',
  //    align: 'left',
  //    field: (row) => row.c_role_label,
  //    sortable: true,
  //  },
  {
    name: 'c_default_role',
    label: 'DEFAULT ROLE',
    align: 'left',
    field: 'c_default_role',
    sortable: true,
  },
  { name: 'c_emp_id', label: 'EMP ID', align: 'left', field: 'c_emp_id', sortable: true },
  { name: 'b_aktif', label: 'AKTIF', align: 'left', field: 'b_aktif', sortable: true },
  { name: 'actions', label: 'EDIT   RESET-PWD   HAPUS', align: 'center', field: 'actions' },
]

// ============================================
// FUNGSI UTILITAS
// ============================================
const loadRoleOptions = async () => {
  try {
    const roles = await pb.collection('tb_mst_role').getFullList({
      sort: 'c_role',
    })
    roleOptions.value = roles.map((role) => ({
      label: role.c_role,
      value: role.id,
    }))
  } catch (error) {
    console.error('Gagal memuat data role:', error)
    roleOptions.value = []
  }
}

const loadDropdowns = async () => {
  try {
    const [guruList] = await Promise.all([getGuruLookup()])
    guruOptions.value = guruList
    filteredGuruOptions.value = [...guruList]
  } catch (error) {
    console.error('Gagal memuat opsi dropdown:', error)
  }
}

const filterGuruFn = (val, update) => {
  if (val === '') {
    update(() => {
      filteredGuruOptions.value = guruOptions.value
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    filteredGuruOptions.value = guruOptions.value.filter(
      (v) => v.label.toLowerCase().indexOf(needle) > -1,
    )
  })
}

// Fungsi Bantuan untuk mendapatkan ID Role Default ('Guru')
const getDefaultRoleArray = () => {
  const defaultRole = roleOptions.value.find((r) => r.label === filtermain)
  return defaultRole ? [defaultRole.value] : []
}

// ============================================
// FUNGSI FETCH DATA (DIPANGGIL OLEH Q-TABLE)
// ============================================
const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  const filterValue = props.filter

  loading.value = true

  try {
    let sortString = sortBy ? (descending ? `-${sortBy}` : `+${sortBy}`) : ''
    let filterString = `c_default_role = "${filtermain}"`

    if (filterValue) {
      filterString += ` && (name ~ "${filterValue}" || email ~ "${filterValue}" || c_emp_id ~ "${filterValue}")`
    }

    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage

    const result = await pb.collection('users').getList(page, fetchLimit, {
      sort: sortString,
      filter: filterString,
      expand: 'c_role',
    })

    pagination.value.page = page
    pagination.value.rowsPerPage = rowsPerPage
    pagination.value.rowsNumber = result.totalItems
    pagination.value.sortBy = sortBy
    pagination.value.descending = descending

    rows.value = result.items.map((item) => {
      let roleLabel = '-'
      if (item.expand && item.expand.c_role) {
        if (Array.isArray(item.expand.c_role)) {
          roleLabel = item.expand.c_role.map((r) => r.c_role).join(', ')
        } else {
          roleLabel = item.expand.c_role.c_role
        }
      }

      return {
        ...item,
        c_role_label: roleLabel,
      }
    })
  } catch (error) {
    handlePBError(error)
  } finally {
    loading.value = false
  }
}

// ============================================
// FUNGSI GENERATE & RESET MASSAL
// ============================================
const confirmGenerate = () => {
  $q.dialog({
    title: 'Konfirmasi Generate Akun',
    message: 'Proses ini akan men-generate akun untuk guru yang belum memiliki akun. Lanjutkan?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    loading.value = true
    try {
      const roleToSave = getDefaultRoleArray()

      const gurus = await pb.collection('tb_mst_guru').getFullList()
      // Ambil semua user sekaligus untuk cek duplikasi
      const users = await pb.collection('users').getFullList()

      // 1. Kumpulkan daftar ID yang sudah dipakai untuk validasi
      const existingEmpIds = users.map((u) => u.c_emp_id)
      const existingEmails = users.map((u) => u.email)

      let successCount = 0
      let skipCount = 0

      for (const guru of gurus) {
        // Cek berdasarkan ID Guru
        if (existingEmpIds.includes(guru.c_guru_id)) {
          skipCount++
          continue
        }

        const identifier = guru.c_nip ? guru.c_nip : guru.id.substring(0, 8)
        const email = `${identifier}@spensa.com`

        // Cek berdasarkan Email (Penting untuk menghindari Error 400 unik)
        if (existingEmails.includes(email)) {
          console.warn(`Email ${email} sudah terdaftar, melewati user ${guru.c_nama}`)
          skipCount++
          continue
        }

        const payload = {
          email: email,
          password: defaultPass,
          passwordConfirm: defaultPass,
          name: guru.c_nama,
          c_role: roleToSave,
          c_default_role: filtermain,
          c_emp_id: guru.c_guru_id,
          b_aktif: true, // Set default aktif
          emailVisibility: true,
        }

        try {
          await pb.collection('users').create(payload)
          successCount++
        } catch (e) {
          console.error(`Gagal membuat akun untuk ${guru.c_nama}`, e)
        }
      }

      $q.notify({
        type: 'positive',
        message: `Berhasil generate ${successCount} akun. (${skipCount} akun dilewati karena sudah ada).`,
      })
      onRequest({ pagination: pagination.value, filter: filter.value })
    } catch (error) {
      console.error(error)
      $q.notify({ type: 'negative', message: 'Terjadi kesalahan saat generate akun.' })
    } finally {
      loading.value = false
    }
  })
}
const confirmReset = () => {
  $q.dialog({
    title: 'Konfirmasi Reset Massal (HARD RESET)',
    message: `PERINGATAN! Proses ini akan MENGHAPUS akun dan membuatnya kembali dengan password <strong>${defaultPass}</strong>. Pastikan tidak ada aturan Cascade Delete di database Anda! Yakin ingin melanjutkan?`,
    html: true,
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(async () => {
    loading.value = true
    try {
      const roleToSave = getDefaultRoleArray()

      const gurus = await pb.collection('tb_mst_guru').getFullList()
      const users = await pb
        .collection('users')
        .getFullList({ filter: `c_default_role = "${filtermain}"` })

      let successCount = 0
      for (const user of users) {
        if (!user.c_emp_id) continue

        const guru = gurus.find((g) => g.c_guru_id === user.c_emp_id)
        if (!guru) continue

        // 1. Simpan ID dan Email lama
        const oldId = user.id
        const oldEmail = user.email

        // 2. Siapkan Payload untuk user baru (MASUKKAN ID LAMA)
        const payload = {
          id: oldId, // PENTING: Pertahankan ID agar relasi tabel lain tidak rusak
          email: oldEmail,
          password: defaultPass,
          passwordConfirm: defaultPass,
          name: guru.c_nama,
          c_role: roleToSave.length > 0 ? roleToSave : user.c_role,
          c_default_role: filtermain,
          c_emp_id: guru.c_guru_id,
          b_aktif: guru.b_aktif,
          emailVisibility: true,
        }

        try {
          // 3. Eksekusi: Hapus user lama
          await pb.collection('users').delete(oldId)

          // 4. Eksekusi: Buat user baru dengan ID yang sama persis
          await pb.collection('users').create(payload)

          successCount++
        } catch (e) {
          console.error(`Gagal hard-reset akun ${user.email}`, e)
        }
      }

      $q.notify({ type: 'positive', message: `Berhasil me-reset ulang ${successCount} akun guru.` })
      onRequest({ pagination: pagination.value, filter: filter.value })
    } catch (error) {
      console.error(error)
      $q.notify({ type: 'negative', message: 'Terjadi kesalahan saat reset akun.' })
    } finally {
      loading.value = false
    }
  })
}

// Fungsi Reset untuk 1 User Saja
const resetPassword = (row) => {
  $q.dialog({
    title: 'Konfirmasi Reset (HARD RESET)',
    message: `PERINGATAN! Proses ini akan MENGHAPUS akun <strong>${row.name || row.email}</strong> dan membuatnya kembali dengan password <strong>${defaultPass}</strong>. Pastikan tidak ada aturan Cascade Delete! Yakin ingin melanjutkan?`,
    html: true,
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(async () => {
    loading.value = true
    try {
      // 1. Validasi awal
      if (!row.c_emp_id) {
        $q.notify({
          type: 'warning',
          message: 'Gagal: User ini tidak memiliki EMP ID (tidak terkait dengan Master Guru).',
        })
        loading.value = false
        return
      }

      const roleToSave = getDefaultRoleArray()

      // 2. Ambil data spesifik dari master guru berdasarkan c_emp_id milik user tersebut
      const gurus = await pb.collection('tb_mst_guru').getFullList({
        filter: `c_guru_id = "${row.c_emp_id}"`,
      })

      if (gurus.length === 0) {
        $q.notify({ type: 'negative', message: 'Data master guru tidak ditemukan untuk user ini.' })
        loading.value = false
        return
      }

      const guru = gurus[0] // Ambil data guru yang cocok

      // 3. Simpan ID dan Email lama
      const oldId = row.id
      const oldEmail = row.email

      // 4. Siapkan Payload untuk user baru
      const payload = {
        id: oldId, // Pertahankan ID
        email: oldEmail,
        password: defaultPass,
        passwordConfirm: defaultPass,
        name: guru.c_nama,
        c_role: roleToSave.length > 0 ? roleToSave : row.c_role, // Amankan role array
        c_default_role: filtermain,
        c_emp_id: guru.c_guru_id,
        b_aktif: guru.b_aktif,
        emailVisibility: true,
      }

      // 5. Eksekusi: Hapus user lama
      await pb.collection('users').delete(oldId)

      // 6. Eksekusi: Buat user baru dengan ID yang sama
      await pb.collection('users').create(payload)

      $q.notify({ type: 'positive', message: `Berhasil me-reset ulang akun ${oldEmail}.` })

      // Refresh tabel
      onRequest({ pagination: pagination.value, filter: filter.value })
    } catch (error) {
      console.error(`Gagal hard-reset akun ${row.email}`, error)
      $q.notify({ type: 'negative', message: 'Terjadi kesalahan saat mereset akun. Cek console.' })
    } finally {
      loading.value = false
    }
  })
}

// ============================================
// FUNGSI CRUD
// ============================================
const simpanData = async () => {
  if (!filteredGuruOptions.value) {
    $q.notify({
      type: 'warning',
      message: '⚠️ Peringatan: Anda harus memilih salah satu data Guru terlebih dahulu!',
      position: 'top',
      timeout: 4000,
      actions: [{ icon: 'close', color: 'white' }],
    })
    return
  }

  // Jika c_role tidak diisi, otomatis set ke role 'Guru'
  let roleToSave = form.value.c_role
  if (!roleToSave || roleToSave.length === 0) {
    roleToSave = getDefaultRoleArray()
    if (roleToSave.length === 0) {
      $q.notify({ type: 'warning', message: 'Role default tidak ditemukan!' })
      return
    }
  }

  try {
    if (isEdit.value) {
      // ==========================================
      // 1. PAYLOAD EDIT (Hanya Profil, TANPA Email & Password)
      // ==========================================
      const payloadUpdate = {
        name: form.value.name,
        avatar: form.value.avatar || null,
        c_role: roleToSave,
        c_default_role: form.value.c_default_role,
        c_emp_id: form.value.c_emp_id || null,
        b_aktif: form.value.b_aktif,
        emailVisibility: true,
      }

      await pb.collection('users').update(form.value.id, payloadUpdate)
      $q.notify({ type: 'positive', message: 'Data profil berhasil diupdate!', position: 'bottom' })
    } else {
      // ==========================================
      // 2. PAYLOAD CREATE (Lengkap dengan Email & Password Default)
      // ==========================================
      const payloadCreate = {
        email: form.value.email, // Email wajib dikirim saat Create
        password: defaultPass, // Password wajib disuntikkan saat Create
        passwordConfirm: defaultPass,
        name: form.value.name,
        avatar: form.value.avatar || null,
        c_role: roleToSave,
        c_default_role: form.value.c_default_role,
        c_emp_id: form.value.c_emp_id || null,
        b_aktif: form.value.b_aktif,
        emailVisibility: true,
      }

      await pb.collection('users').create(payloadCreate)
      $q.notify({
        type: 'positive',
        message: 'Data user berhasil ditambahkan!',
        position: 'bottom',
      })
    }

    tutupForm()
    onRequest({ pagination: pagination.value, filter: filter.value })
  } catch (error) {
    console.error('Proses simpan gagal:', error)
    handlePBError(error, {
      email: {
        validation_not_unique: `Email "${form.value.email}" sudah terdaftar. Gunakan email lain.`,
      },
    })
  }
}

const hapusData = (id, userName) => {
  $q.dialog({
    title: 'Konfirmasi',
    message: `Yakin ingin menghapus user <strong>${userName || id}</strong>?`,
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await pb.collection('users').delete(id)
      $q.notify({ type: 'positive', message: 'Data user berhasil dihapus!', position: 'bottom' })
      onRequest({ pagination: pagination.value, filter: filter.value })
    } catch (error) {
      handlePBError(error)
    }
  })
}

// ============================================
// KONTROL FORM
// ============================================
const bukaFormTambah = () => {
  isEdit.value = false
  form.value = {
    id: '',
    email: '',
    //password: '',
    //passwordConfirm: '',
    //emailVisibility: true,
    name: '',
    avatar: '',
    c_role: [],
    c_default_role: filtermain,
    c_emp_id: '',
    b_aktif: true, // ✅ default aktif
  }
  showForm.value = true
}

const bukaFormEdit = (item) => {
  isEdit.value = true
  let roles = []
  if (Array.isArray(item.c_role)) {
    roles = item.c_role
  } else if (item.c_role) {
    roles = [item.c_role]
  }

  form.value = {
    id: item.id,
    email: item.email,
    //password: '',
    //passwordConfirm: '',
    //emailVisibility: item.emailVisibility === true,
    name: item.name || '',
    avatar: item.avatar || '',
    c_role: roles || '',
    c_default_role: item.c_default_role || filtermain,
    c_emp_id: item.c_emp_id || '',
    b_aktif: item.b_aktif, // ✅ langsung assign (boolean true/false)
  }
  showForm.value = true
}

watch(
  () => form.value.c_emp_id,
  (newVal) => {
    if (newVal) {
      const selected = guruOptions.value.find((opt) => opt.value === newVal)
      if (selected) {
        const nama = selected.label.replace(/\s*\([^)]*\)\s*$/, '').trim()
        form.value.name = nama
      }
    } else {
      form.value.name = ''
    }
  },
)

// Watch untuk mengisi email otomatis berdasarkan pilihan guru
watch(
  () => form.value.c_emp_id,
  async (newVal, oldVal) => {
    // Hanya proses jika nilai berubah dan tidak kosong
    if (newVal && newVal !== oldVal) {
      try {
        // Cari guru berdasarkan c_guru_id (nilai dari c_emp_id)
        const guru = await pb.collection('tb_mst_guru').getFirstListItem(`c_guru_id = "${newVal}"`)
        if (guru && guru.c_nip) {
          form.value.email = `${guru.c_nip}@spensa.com`
        } else {
          form.value.email = ''
          $q.notify({
            type: 'warning',
            message: 'Guru ini tidak memiliki NIP, email tidak bisa digenerate otomatis.',
            position: 'top',
          })
        }
      } catch (error) {
        console.error('Gagal mengambil data guru:', error)
        form.value.email = ''
        $q.notify({
          type: 'negative',
          message: 'Gagal mengambil data guru untuk generate email.',
          position: 'top',
        })
      }
    } else if (!newVal) {
      // Jika pilihan guru dikosongkan, kosongkan juga email (optional)
      form.value.email = ''
    }
  },
)

const tutupForm = () => {
  showForm.value = false
}

// Lifecycle
onMounted(async () => {
  await loadDropdowns()
  await loadRoleOptions()
  onRequest({ pagination: pagination.value, filter: filter.value })
})
</script>

<template>
  <q-page class="q-pa-sm">
    <q-card v-if="!showForm" flat bordered>
      <q-table
        title="Manajemen User Guru"
        :rows="rows"
        :columns="columns"
        :visible-columns="kolomAktif"
        row-key="id"
        v-model:pagination="pagination"
        :loading="loading"
        :filter="filter"
        @request="onRequest"
        flat
        bordered
        separator="cell"
        binary-state-sort
        no-data-label="Data user tidak ditemukan"
        no-results-label="Pencarian tidak ditemukan"
        class="my-zebra-table"
      >
        <template v-slot:top-right>
          <q-input
            debounce="300"
            v-model="filter"
            placeholder="Cari Nama / Email / Emp ID"
            label="Cari Nama / Email / Emp ID"
            outlined
            clearable
            dense
            style="min-width: 250px; background: white"
            class="q-mr-sm"
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>

          <q-btn
            color="primary"
            icon="add"
            label="Tambah"
            @click="bukaFormTambah"
            class="q-mr-sm"
            unelevated
          />

          <q-btn
            round
            color="teal"
            icon="refresh"
            @click="onRequest({ pagination, filter })"
            unelevated
          >
            <q-tooltip>Refresh Data</q-tooltip>
          </q-btn>
        </template>

        <template v-slot:body-cell-no="props">
          <q-td :props="props" class="text-center">
            {{ props.rowIndex + 1 }}
          </q-td>
        </template>

        <template v-slot:body-cell-emailVisibility="props">
          <q-td :props="props" class="text-center">
            <q-chip :color="props.row.emailVisibility ? 'positive' : 'negative'" text-color="white">
              {{ props.row.emailVisibility ? 'Publik' : 'Tersembunyi' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-c_role="props">
          <q-td :props="props">
            {{ props.row.c_role_label }}
          </q-td>
        </template>

        <template v-slot:body-cell-c_default_role="props">
          <q-td :props="props">
            <q-chip outline :color="props.row.c_default_role === 'Admin' ? 'red' : 'primary'">
              {{ props.row.c_default_role || '-' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-b_aktif="props">
          <q-td :props="props" class="text-center">
            <q-chip
              :color="props.row.b_aktif ? 'positive' : 'negative'"
              text-color="white"
              dense
              icon="check"
              size="sm"
            >
              {{ props.row.b_aktif ? 'Ya' : 'Tdk' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-x-sm">
            <q-btn
              flat
              dense
              color="primary"
              icon="edit"
              @click="bukaFormEdit(props.row)"
              title="Edit User"
            />
            <q-btn
              flat
              dense
              color="primary"
              icon="restart_alt"
              @click="resetPassword(props.row)"
              title="Reset Password"
            />
            <q-btn
              flat
              dense
              color="negative"
              icon="delete"
              @click="hapusData(props.row.id, props.row.name)"
              title="Hapus User"
            />
          </q-td>
        </template>
      </q-table>

      <q-separator />
      <q-card-actions class="q-pa-md justify-end q-gutter-sm">
        <q-btn
          color="indigo"
          icon="auto_awesome"
          label="Buat Semua Akun"
          @click="confirmGenerate"
          unelevated
        >
          <q-tooltip>Generate akun untuk semua guru baru</q-tooltip>
        </q-btn>

        <q-btn
          color="negative"
          icon="restart_alt"
          label="Reset Semua Akun"
          @click="confirmReset"
          unelevated
        >
          <q-tooltip>Reset data & password semua guru ke default</q-tooltip>
        </q-btn>
      </q-card-actions>
    </q-card>

    <q-card v-else flat bordered>
      <q-card-section class="row items-center q-pb-none">
        <q-btn flat round dense icon="arrow_back" @click="tutupForm" class="q-mr-sm" />
        <div class="text-h6">{{ isEdit ? 'Edit Data User' : 'Tambah User Baru' }}</div>
      </q-card-section>

      <q-card-section class="q-pa-md">
        <q-form @submit.prevent="simpanData" class="q-gutter-y-md">
          <div class="row q-col-gutter-lg">
            <div class="col-12 col-md-6">
              <q-select
                v-model="form.c_emp_id"
                :options="filteredGuruOptions"
                option-label="label"
                option-value="value"
                label="Pilih Guru (Emp ID) *"
                emit-value
                map-options
                outlined
                clearable
                dense
                use-input
                input-debounce="300"
                @filter="filterGuruFn"
                hint="Ketik nama guru untuk mencari data"
                :disable="isEdit"
                class="full-width"
              />
            </div>

            <div class="col-12 col-md-6">
              <q-input
                v-model="form.email"
                label="Email User *"
                type="email"
                outlined
                dense
                required
                hint="Digunakan sebagai ID utama untuk login sistem"
                :disable="isEdit"
                class="full-width"
              />
            </div>

            <div class="col-12 col-md-6">
              <q-select
                v-model="form.c_default_role"
                :options="['Admin', 'Guru', 'Murid']"
                label="Default Role *"
                outlined
                dense
                required
                disable
                hint="Role utama untuk filter hak akses"
                class="full-width"
              />
            </div>

            <div class="col-12 col-md-6">
              <q-select
                v-model="form.c_role"
                :options="roleOptions"
                option-label="label"
                option-value="value"
                label="Role Akses Terkait (Relasi Master Role)"
                emit-value
                map-options
                multiple
                outlined
                dense
                clearable
                disable
                hint="Daftar role sekunder terintegrasi"
                class="full-width"
              />
            </div>

            <div class="col-12 col-md-6">
              <q-input
                v-model="form.avatar"
                label="Avatar (URL / Path)"
                outlined
                dense
                clearable
                hint="Tautan URL / alamat lokasi file foto profil"
                class="full-width"
              />
            </div>

            <div class="col-12 col-md-6 flex items-center">
              <div
                class="full-width q-px-md rounded-borders flex items-center"
                style="border: 1px solid rgba(0, 0, 0, 0.24); height: 40px; margin-top: -4px"
              >
                <q-toggle
                  v-model="form.b_aktif"
                  label="Status Aktif Akun Guru"
                  color="green"
                  keep-color
                  icon="check"
                  dense
                  unchecked-icon="clear"
                />
              </div>
              <div class="text-caption text-grey-7 q-mt-xs q-pl-xs">
                Tentukan apakah user ini diizinkan masuk ke sistem aplikasi
              </div>
            </div>
          </div>

          <q-separator class="q-my-md" />
          <div class="row justify-end q-gutter-sm">
            <q-btn label="Batal" color="secondary" flat @click="tutupForm" />
            <q-btn
              type="submit"
              :label="isEdit ? 'Update Data User' : 'Simpan User Baru'"
              color="primary"
              icon="save"
              unelevated
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { pb } from 'boot/pocketbase'
import { handlePBError } from 'src/lib/errorHandler'

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

// Options untuk dropdown role
const roleOptions = ref([])

// State Form
const form = ref({
  id: '',
  email: '',
  password: '',
  passwordConfirm: '',
  emailVisibility: true,
  verified: false,
  name: '',
  avatar: '',
  c_role: '',
  c_default_role: '',
  c_emp_id: '',
})

// Kolom default yang ditampilkan
const kolomAktif = ref([
  'name',
  'email',
  'c_default_role',
  'c_role',
  'emailVisibility',
  'verified',
  'c_emp_id',
  'actions',
])

// ============================================
// KONFIGURASI KOLOM Q-TABLE
// ============================================
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no' },
  { name: 'email', label: 'EMAIL', align: 'left', field: 'email', sortable: true },
  {
    name: 'emailVisibility',
    label: 'VISIBILITAS',
    align: 'center',
    field: 'emailVisibility',
    sortable: true,
  },
  { name: 'verified', label: 'VERIFIED', align: 'center', field: 'verified', sortable: true },
  { name: 'name', label: 'NAMA', align: 'left', field: 'name', sortable: true },
  { name: 'avatar', label: 'AVATAR', align: 'left', field: 'avatar' },
  {
    name: 'c_role',
    label: 'ROLE (RELASI)',
    align: 'left',
    field: 'c_role',
    sortable: true,
  },
  {
    name: 'c_default_role',
    label: 'DEFAULT ROLE',
    align: 'left',
    field: 'c_default_role',
    sortable: true,
  },
  { name: 'c_emp_id', label: 'EMP ID', align: 'left', field: 'c_emp_id', sortable: true },
  { name: 'actions', label: 'AKSI', align: 'center', field: 'actions' },
]

// ============================================
// FUNGSI UTILITAS
// ============================================
/*
const getRoleName = (roleId) => {
  if (!roleId) return '-'
  const found = roleOptions.value.find((opt) => opt.value === roleId)
  return found ? found.label : roleId
}
*/
const loadRoleOptions = async () => {
  try {
    const roles = await pb.collection('tb_mst_role').getFullList({
      sort: 'c_role_name',
    })
    roleOptions.value = roles.map((role) => ({
      label: role.c_role_name,
      value: role.id,
    }))
  } catch (error) {
    console.error('Gagal memuat data role:', error)
    roleOptions.value = []
  }
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

    // Filter dasar: hanya Guru
    let filterString = `c_default_role = "Admin"`

    // Jika ada pencarian, tambahkan dengan operator AND
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

    rows.value = result.items.map((item) => ({
      ...item,
      c_role_label: item.expand?.c_role?.c_role_name || item.c_role || '-',
    }))
  } catch (error) {
    handlePBError(error)
  } finally {
    loading.value = false
  }
}

/*
const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  const filterValue = props.filter

  loading.value = true

  try {
    let sortString = sortBy ? (descending ? `-${sortBy}` : `+${sortBy}`) : ''
    let filterString = filterValue
      ? `name ~ "${filterValue}" || email ~ "${filterValue}" || c_emp_id ~ "${filterValue}"`
      : ''

    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage

    // Ambil data dari collection 'users' dengan expand relasi c_role
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

    // Proses rows untuk menampilkan nama role dari expand
    rows.value = result.items.map((item) => ({
      ...item,
      c_role_label: item.expand?.c_role?.c_role_name || item.c_role || '-',
    }))
  } catch (error) {
    handlePBError(error)
  } finally {
    loading.value = false
  }
}
*/

// ============================================
// FUNGSI CRUD
// ============================================
const simpanData = async () => {
  // Validasi password & konfirmasi untuk mode tambah
  if (!isEdit.value && form.value.password !== form.value.passwordConfirm) {
    $q.notify({
      type: 'negative',
      message: 'Password dan Konfirmasi Password tidak cocok!',
      position: 'bottom',
    })
    return
  }

  try {
    const payload = {
      email: form.value.email,
      emailVisibility: form.value.emailVisibility,
      verified: form.value.verified,
      name: form.value.name,
      avatar: form.value.avatar || null,
      c_role: form.value.c_role || null,
      c_default_role: form.value.c_default_role,
      c_emp_id: form.value.c_emp_id || null,
    }

    // Hanya tambah password jika diisi (untuk create wajib, untuk update optional)
    if (!isEdit.value) {
      payload.password = form.value.password
      payload.passwordConfirm = form.value.passwordConfirm
    } else if (form.value.password) {
      // Jika edit dan password diisi, maka update password
      payload.password = form.value.password
      payload.passwordConfirm = form.value.passwordConfirm
    }

    if (isEdit.value) {
      await pb.collection('users').update(form.value.id, payload)
      $q.notify({ type: 'positive', message: 'Data user berhasil diupdate!', position: 'bottom' })
    } else {
      await pb.collection('users').create(payload)
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
    password: '',
    passwordConfirm: '',
    emailVisibility: true,
    verified: false,
    name: '',
    avatar: '',
    c_role: '',
    c_default_role: '',
    c_emp_id: '',
  }
  showForm.value = true
}

const bukaFormEdit = (item) => {
  isEdit.value = true
  form.value = {
    id: item.id,
    email: item.email,
    password: '',
    passwordConfirm: '',
    emailVisibility: item.emailVisibility === true,
    verified: item.verified === true,
    name: item.name || '',
    avatar: item.avatar || '',
    c_role: item.c_role || '',
    c_default_role: item.c_default_role || '',
    c_emp_id: item.c_emp_id || '',
  }
  showForm.value = true
}

const tutupForm = () => {
  showForm.value = false
}

// Lifecycle
onMounted(async () => {
  await loadRoleOptions()
  onRequest({ pagination: pagination.value, filter: filter.value })
})
</script>

<template>
  <q-page class="q-pa-sm">
    <q-card v-if="!showForm" flat bordered>
      <q-table
        title="Manajemen User"
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
            style="min-width: 200px; background: white"
            class="q-mr-sm"
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>

          <q-btn
            color="primary"
            icon="add"
            label="Tambah User"
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
            {{ (pagination.page - 1) * pagination.rowsPerPage + props.rowIndex + 1 }}
          </q-td>
        </template>

        <template v-slot:body-cell-emailVisibility="props">
          <q-td :props="props" class="text-center">
            <q-chip :color="props.row.emailVisibility ? 'positive' : 'negative'" text-color="white">
              {{ props.row.emailVisibility ? 'Publik' : 'Tersembunyi' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-verified="props">
          <q-td :props="props" class="text-center">
            <q-chip :color="props.row.verified ? 'positive' : 'warning'" text-color="white">
              {{ props.row.verified ? 'Terverifikasi' : 'Belum' }}
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
              color="negative"
              icon="delete"
              @click="hapusData(props.row.id, props.row.name)"
              title="Hapus User"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Form Tambah / Edit User -->
    <q-card v-else flat bordered>
      <q-card-section class="row items-center q-pb-none">
        <q-btn flat round dense icon="arrow_back" @click="tutupForm" class="q-mr-sm" />
        <div class="text-h6">{{ isEdit ? 'Edit Data User' : 'Tambah User Baru' }}</div>
      </q-card-section>

      <q-card-section class="q-pa-sm">
        <q-form @submit.prevent="simpanData" class="q-gutter-y-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.name"
                label="Nama Lengkap *"
                outlined
                dense
                required
                hint="Nama user"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.email"
                label="Email *"
                type="email"
                outlined
                dense
                required
                hint="Digunakan untuk login"
              />
            </div>

            <!-- Password hanya ditampilkan saat tambah, saat edit bisa dikosongkan jika tidak ingin ganti -->
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.password"
                :type="isEdit ? 'password' : 'password'"
                label="Password"
                outlined
                dense
                :required="!isEdit"
                :hint="
                  isEdit ? 'Kosongkan jika tidak ingin mengubah password' : 'Minimal 8 karakter'
                "
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.passwordConfirm"
                type="password"
                label="Konfirmasi Password"
                outlined
                dense
                :required="!isEdit"
                :hint="isEdit ? 'Isi jika password diubah' : ''"
              />
            </div>

            <div class="col-12 col-md-4">
              <q-select
                v-model="form.c_default_role"
                :options="['Admin', 'Guru', 'Murid']"
                label="Default Role *"
                outlined
                dense
                required
                hint="Role untuk filter akses"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-select
                v-model="form.c_role"
                :options="roleOptions"
                option-label="label"
                option-value="value"
                label="Role (Relasi Tb Role)"
                emit-value
                map-options
                outlined
                dense
                clearable
                hint="Pilih dari master role"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input v-model="form.c_emp_id" label="Employee ID" outlined dense clearable />
            </div>

            <div class="col-12 col-md-6">
              <q-toggle v-model="form.emailVisibility" label="Email Visible untuk publik" />
            </div>
            <div class="col-12 col-md-6">
              <q-toggle v-model="form.verified" label="User Terverifikasi" />
            </div>

            <div class="col-12">
              <q-input v-model="form.avatar" label="Avatar (URL / Path)" outlined dense clearable />
            </div>
          </div>

          <div class="row justify-end q-mt-lg q-gutter-sm">
            <q-btn label="Batal" color="secondary" flat @click="tutupForm" />
            <q-btn
              type="submit"
              :label="isEdit ? 'Update User' : 'Simpan User'"
              color="primary"
              icon="save"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

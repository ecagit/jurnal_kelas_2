<template>
  <q-page class="q-pa-sm">
    <q-card v-if="!showForm" flat bordered>
      <q-table
        title="Manajemen User Murid"
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
        :no-data-label="tabelKosongMessage"
        no-results-label="Pencarian tidak ditemukan"
        class="my-zebra-table"
      >
        <template v-slot:top-left>
          <div class="row items-center q-gutter-sm">
            <div class="text-h6 q-mr-md">User Murid</div>
            <q-select
              v-model="filterKelas"
              :options="filteredKelasOptions"
              option-label="label"
              option-value="value"
              label="Filter Kelas *"
              emit-value
              map-options
              outlined
              clearable
              dense
              use-input
              input-debounce="300"
              @filter="filterKelasFn"
              @update:model-value="onFilterKelasChange"
              style="min-width: 200px; background: #f1f5f9; border-radius: 4px"
            >
              <template v-slot:no-option>
                <q-item><q-item-section class="text-grey">Tidak ada hasil</q-item-section></q-item>
              </template>
              <template v-slot:prepend><q-icon name="class" color="primary" /></template>
            </q-select>
          </div>
        </template>

        <template v-slot:top-right>
          <q-input
            debounce="300"
            v-model="filter"
            placeholder="Cari Nama / Email / NIS"
            label="Cari Nama / Email / NIS"
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
          <q-td :props="props" class="text-center">{{ props.rowIndex + 1 }}</q-td>
        </template>
        <template v-slot:body-cell-emailVisibility="props">
          <q-td :props="props" class="text-center">
            <q-chip :color="props.row.emailVisibility ? 'positive' : 'negative'" text-color="white">
              {{ props.row.emailVisibility ? 'Publik' : 'Tersembunyi' }}
            </q-chip>
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
        <template v-slot:body-cell-c_kelas_id="props">
          <q-td :props="props">
            {{ getKelasFromMurid(props.row.c_emp_id) }}
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
          <q-tooltip>Generate akun untuk semua murid yang belum memiliki akun</q-tooltip>
        </q-btn>
        <q-btn
          color="negative"
          icon="restart_alt"
          label="Reset Semua Akun"
          @click="confirmReset"
          unelevated
        >
          <q-tooltip>Reset data & password semua akun murid ke default</q-tooltip>
        </q-btn>
      </q-card-actions>
    </q-card>

    <q-card v-else flat bordered>
      <q-card-section class="row items-center q-pb-none">
        <q-btn flat round dense icon="arrow_back" @click="tutupForm" class="q-mr-sm" />
        <div class="text-h6">{{ isEdit ? 'Edit Data User Murid' : 'Tambah User Murid Baru' }}</div>
      </q-card-section>
      <q-card-section class="q-pa-md">
        <q-form @submit.prevent="simpanData" class="q-gutter-y-md">
          <div class="row q-col-gutter-lg">
            <div class="col-12 col-md-6">
              <q-select
                v-model="form.c_emp_id"
                :options="filteredMuridOptions"
                option-label="label"
                option-value="value"
                label="Pilih Murid *"
                emit-value
                map-options
                outlined
                clearable
                dense
                use-input
                input-debounce="300"
                @filter="filterMuridFn"
                hint="Ketik nama murid untuk mencari"
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
                hint="Digunakan untuk login"
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
                hint="Role utama (Murid)"
                class="full-width"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-select
                v-model="form.c_role"
                :options="roleOptions"
                option-label="label"
                option-value="value"
                label="Role Akses Terkait"
                emit-value
                map-options
                multiple
                outlined
                dense
                clearable
                disable
                hint="Role sekunder (dari master role)"
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
                hint="Tautan foto profil"
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
                  label="Status Aktif Akun"
                  color="green"
                  keep-color
                  icon="check"
                  dense
                  unchecked-icon="clear"
                />
              </div>
              <div class="text-caption text-grey-7 q-mt-xs q-pl-xs">
                Tentukan apakah user ini diizinkan masuk sistem
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

<script setup>
import { ref, onMounted, watch, computed } from 'vue' // [MODIFIKASI] Import 'computed'
import { useQuasar } from 'quasar'
import { pb } from 'boot/pocketbase'
import { handlePBError } from 'src/lib/errorHandler'
import { useAuthStore } from 'stores/authStore'

const $q = useQuasar()
const auth = useAuthStore()

// State Data Table & UI
const rows = ref([])
const loading = ref(false)
const filter = ref('')
const showForm = ref(false)
const isEdit = ref(false)

// Pagination
const pagination = ref({
  sortBy: 'name',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

// Options dropdown
const roleOptions = ref([])
const muridOptions = ref([])
const filteredMuridOptions = ref([])
const defaultRoleName = 'Murid'
const defaultPassword = 'Smpn1palu'

// Data murid mapping untuk kelas
const muridMap = ref(new Map())

// State untuk filter kelas
const filterKelas = ref(null)
const kelasOptions = ref([])
const filteredKelasOptions = ref([])

// [MODIFIKASI] Dinamis label jika tabel kosong
const tabelKosongMessage = computed(() => {
  const isAdmin = pb.authStore.model?.c_default_role === 'Admin'
  if (!isAdmin && !filterKelas.value) {
    return 'Silakan pilih Kelas terlebih dahulu untuk menampilkan data murid.'
  }
  return 'Data user murid tidak ditemukan'
})

// State Form
const form = ref({
  id: '',
  email: '',
  name: '',
  avatar: '',
  c_role: [],
  c_default_role: defaultRoleName,
  c_emp_id: '',
  b_aktif: true,
  emailVisibility: true,
})

// Kolom yang ditampilkan di tabel
const kolomAktif = ref([
  'no',
  'name',
  'email',
  'c_default_role',
  'emailVisibility',
  'b_aktif',
  'c_kelas_id',
  'actions',
])

// Konfigurasi kolom Q-Table
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no' },
  { name: 'email', label: 'EMAIL / USERNAME', align: 'left', field: 'email', sortable: true },
  { name: 'name', label: 'NAMA', align: 'left', field: 'name', sortable: true },
  { name: 'avatar', label: 'AVATAR', align: 'left', field: 'avatar' },
  {
    name: 'c_default_role',
    label: 'DEFAULT ROLE',
    align: 'left',
    field: 'c_default_role',
    sortable: true,
  },
  {
    name: 'emailVisibility',
    label: 'VISIBILITAS',
    align: 'center',
    field: 'emailVisibility',
    sortable: true,
  },
  { name: 'b_aktif', label: 'AKTIF', align: 'center', field: 'b_aktif', sortable: true },
  { name: 'c_kelas_id', label: 'KELAS', align: 'left', field: 'c_kelas_id', sortable: false },
  { name: 'actions', label: 'EDIT | RESET | HAPUS', align: 'center', field: 'actions' },
]

// ============================================
// FUNGSI UTILITAS & LOOKUP
// ============================================
const loadRoleOptions = async () => {
  try {
    const roles = await pb.collection('tb_mst_role').getFullList({ sort: 'c_role' })
    roleOptions.value = roles.map((role) => ({ label: role.c_role, value: role.id }))
  } catch (error) {
    console.error('Gagal memuat role:', error)
    roleOptions.value = []
  }
}

const loadMuridOptions = async () => {
  try {
    const murids = await pb.collection('tb_mst_murid').getFullList({ sort: 'c_nama' })
    muridOptions.value = murids.map((m) => ({
      value: m.c_murid_id,
      label: `${m.c_nama} (${m.c_nis || m.c_murid_id})`,
      nama_lengkap: m.c_nama,
      nis: m.c_nis,
      kelas_id: m.c_kelas_id,
    }))
    filteredMuridOptions.value = [...muridOptions.value]

    muridMap.value.clear()
    for (const m of murids) {
      const kelasNama = getKelasNama(m.c_kelas_id)
      muridMap.value.set(m.c_murid_id, {
        nama: m.c_nama,
        kelas_id: m.c_kelas_id,
        kelas_nama: kelasNama,
      })
    }
  } catch (error) {
    console.error('Gagal memuat data murid:', error)
    muridOptions.value = []
    filteredMuridOptions.value = []
  }
}

const loadKelasOptions = async () => {
  try {
    const kelasData = await auth.getKelasLookup()
    kelasOptions.value = kelasData
    filteredKelasOptions.value = [...kelasData]

    if (kelasData.length === 1) {
      filterKelas.value = kelasData[0].value
    }
  } catch (error) {
    console.error('Gagal memuat opsi kelas:', error)
  }
}

const getKelasNama = (idKelas) => {
  if (!idKelas) return '-'
  const kelas = kelasOptions.value.find((k) => k.value === idKelas)
  return kelas ? kelas.label : idKelas
}

const getKelasFromMurid = (c_emp_id) => {
  if (!c_emp_id) return '-'
  const murid = muridMap.value.get(c_emp_id)
  return murid ? murid.kelas_nama : '-'
}

const filterMuridFn = (val, update) => {
  if (val === '') {
    update(() => {
      filteredMuridOptions.value = muridOptions.value
    })
    return
  }
  update(() => {
    const needle = val.toLowerCase()
    filteredMuridOptions.value = muridOptions.value.filter(
      (v) => v.label.toLowerCase().indexOf(needle) > -1,
    )
  })
}

const filterKelasFn = (val, update) => {
  if (val === '') {
    update(() => {
      filteredKelasOptions.value = kelasOptions.value
    })
    return
  }
  update(() => {
    const needle = val.toLowerCase()
    filteredKelasOptions.value = kelasOptions.value.filter(
      (v) => v.label.toLowerCase().indexOf(needle) > -1,
    )
  })
}

const getDefaultRoleArray = () => {
  const defaultRole = roleOptions.value.find((r) => r.label === defaultRoleName)
  return defaultRole ? [defaultRole.value] : []
}

// ============================================
// FETCH DATA USER (MURID) dengan filter kelas
// ============================================
const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  const filterValue = props.filter
  loading.value = true

  // [MODIFIKASI] Ambil identitas user dari token lokal PocketBase
  // Memastikan bahwa role 'Admin' digunakan sebagai patokan otoritas
  const currentUser = pb.authStore.model
  const isAdmin = currentUser?.c_default_role === 'Admin'

  try {
    let sortString = sortBy ? (descending ? `-${sortBy}` : `+${sortBy}`) : ''
    let filterString = `c_default_role = "${defaultRoleName}"`

    if (filterValue) {
      filterString += ` && (name ~ "${filterValue}" || email ~ "${filterValue}" || c_emp_id ~ "${filterValue}")`
    }

    if (filterKelas.value) {
      const muridConditions = []

      // Kumpulkan ID murid yang berada di kelas yang dicari
      for (const [id, data] of muridMap.value.entries()) {
        if (data.kelas_id === filterKelas.value) {
          muridConditions.push(`c_emp_id="${id}"`)
        }
      }

      if (muridConditions.length > 0) {
        // Gabungkan seluruh kondisi dengan OR ( || )
        filterString += ` && (${muridConditions.join(' || ')})`
      } else {
        // Jika tidak ada murid di kelas tersebut
        rows.value = []
        pagination.value.rowsNumber = 0
        loading.value = false
        return
      }
    } else {
      // [MODIFIKASI] LOGIKA BARU KETIKA FILTER KELAS KOSONG
      if (!isAdmin) {
        // Jika user BUKAN Admin dan filter kosong, paksa kembalikan array kosong (Tolak akses ke "Semua Data")
        rows.value = []
        pagination.value.rowsNumber = 0
        loading.value = false
        return
      }
      // Jika user ADALAH Admin, biarkan kode berlanjut mengeksekusi request di bawah tanpa filter tambahan (Menampilkan Semua Data)
    }

    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage
    const result = await pb.collection('users').getList(page, fetchLimit, {
      sort: sortString,
      filter: filterString,
    })

    pagination.value = {
      ...pagination.value,
      page,
      rowsPerPage,
      rowsNumber: result.totalItems,
      sortBy,
      descending,
    }
    rows.value = result.items
  } catch (error) {
    handlePBError(error)
  } finally {
    loading.value = false
  }
}

const onFilterKelasChange = () => {
  pagination.value.page = 1
  onRequest({ pagination: pagination.value, filter: filter.value })
}

// ============================================
// GENERATE MASSAL AKUN MURID
// ============================================
const confirmGenerate = () => {
  $q.dialog({
    title: 'Konfirmasi Generate Akun Murid',
    message: 'Proses ini akan membuat akun untuk semua murid yang belum memiliki akun. Lanjutkan?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    loading.value = true
    try {
      const roleToSave = getDefaultRoleArray()
      const murids = await pb.collection('tb_mst_murid').getFullList()
      const users = await pb
        .collection('users')
        .getFullList({ filter: `c_default_role = "${defaultRoleName}"` })

      const existingEmpIds = users.map((u) => u.c_emp_id)
      const existingEmails = users.map((u) => u.email)

      let successCount = 0
      let skipCount = 0

      for (const murid of murids) {
        if (existingEmpIds.includes(murid.c_murid_id)) {
          skipCount++
          continue
        }

        const identifier = murid.c_nis ? murid.c_nis : murid.c_murid_id.substring(0, 8)
        const email = `${identifier}@murid.com`

        if (existingEmails.includes(email)) {
          console.warn(`Email ${email} sudah terdaftar, melewati murid ${murid.c_nama}`)
          skipCount++
          continue
        }

        const payload = {
          email: email,
          password: defaultPassword,
          passwordConfirm: defaultPassword,
          name: murid.c_nama,
          c_role: roleToSave,
          c_default_role: defaultRoleName,
          c_emp_id: murid.c_murid_id,
          b_aktif: true,
          emailVisibility: true,
        }

        try {
          await pb.collection('users').create(payload)
          successCount++
        } catch (e) {
          console.error(`Gagal membuat akun untuk ${murid.c_nama}`, e)
        }
      }

      $q.notify({
        type: 'positive',
        message: `Berhasil generate ${successCount} akun murid. (${skipCount} akun dilewati karena sudah ada).`,
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

// ============================================
// RESET MASSAL AKUN MURID (HARD RESET)
// ============================================
const confirmReset = () => {
  $q.dialog({
    title: 'Konfirmasi Reset Massal (HARD RESET)',
    message: `PERINGATAN! Proses ini akan MENGHAPUS akun murid dan membuatnya kembali dengan password <strong>${defaultPassword}</strong>. Pastikan tidak ada aturan Cascade Delete di database Anda! Yakin ingin melanjutkan?`,
    html: true,
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(async () => {
    loading.value = true
    try {
      const roleToSave = getDefaultRoleArray()
      const murids = await pb.collection('tb_mst_murid').getFullList()
      const users = await pb
        .collection('users')
        .getFullList({ filter: `c_default_role = "${defaultRoleName}"` })

      let successCount = 0
      for (const user of users) {
        if (!user.c_emp_id) continue

        const murid = murids.find((m) => m.c_murid_id === user.c_emp_id)
        if (!murid) continue

        const oldId = user.id
        const oldEmail = user.email

        const payload = {
          id: oldId,
          email: oldEmail,
          password: defaultPassword,
          passwordConfirm: defaultPassword,
          name: murid.c_nama,
          c_role: roleToSave,
          c_default_role: defaultRoleName,
          c_emp_id: murid.c_murid_id,
          b_aktif: true,
          emailVisibility: true,
        }

        try {
          await pb.collection('users').delete(oldId)
          await pb.collection('users').create(payload)
          successCount++
        } catch (e) {
          console.error(`Gagal hard-reset akun ${user.email}`, e)
        }
      }

      $q.notify({
        type: 'positive',
        message: `Berhasil me-reset ulang ${successCount} akun murid.`,
      })
      onRequest({ pagination: pagination.value, filter: filter.value })
    } catch (error) {
      console.error(error)
      $q.notify({ type: 'negative', message: 'Terjadi kesalahan saat reset akun.' })
    } finally {
      loading.value = false
    }
  })
}

// ============================================
// CRUD (tambah, edit, hapus, reset satu user)
// ============================================
const simpanData = async () => {
  if (!form.value.c_emp_id) {
    $q.notify({ type: 'warning', message: 'Pilih murid terlebih dahulu!' })
    return
  }

  let roleToSave = form.value.c_role
  if (!roleToSave || roleToSave.length === 0) {
    roleToSave = getDefaultRoleArray()
    if (roleToSave.length === 0) {
      $q.notify({ type: 'warning', message: 'Role default Murid tidak ditemukan!' })
      return
    }
  }

  try {
    if (isEdit.value) {
      await pb.collection('users').update(form.value.id, {
        name: form.value.name,
        avatar: form.value.avatar || null,
        c_role: roleToSave,
        c_default_role: form.value.c_default_role,
        c_emp_id: form.value.c_emp_id,
        b_aktif: form.value.b_aktif,
        emailVisibility: true,
      })
      $q.notify({ type: 'positive', message: 'Data profil berhasil diupdate!', position: 'bottom' })
    } else {
      await pb.collection('users').create({
        email: form.value.email,
        password: defaultPassword,
        passwordConfirm: defaultPassword,
        name: form.value.name,
        avatar: form.value.avatar || null,
        c_role: roleToSave,
        c_default_role: form.value.c_default_role,
        c_emp_id: form.value.c_emp_id,
        b_aktif: form.value.b_aktif,
        emailVisibility: true,
      })
      $q.notify({
        type: 'positive',
        message: 'User murid berhasil ditambahkan!',
        position: 'bottom',
      })
    }
    tutupForm()
    onRequest({ pagination: pagination.value, filter: filter.value })
  } catch (error) {
    console.error(error)
    handlePBError(error, {
      email: { validation_not_unique: `Email "${form.value.email}" sudah terdaftar.` },
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
      $q.notify({ type: 'positive', message: 'User berhasil dihapus!' })
      onRequest({ pagination: pagination.value, filter: filter.value })
    } catch (error) {
      handlePBError(error)
    }
  })
}

const resetPassword = async (row) => {
  $q.dialog({
    title: 'Konfirmasi Reset Password',
    message: `Proses ini akan menghapus akun <strong>${row.name || row.email}</strong> dan membuat ulang dengan password default (<strong>${defaultPassword}</strong>). Lanjutkan?`,
    html: true,
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(async () => {
    loading.value = true
    try {
      if (!row.c_emp_id) {
        $q.notify({
          type: 'warning',
          message: 'User ini tidak memiliki referensi murid (c_emp_id kosong).',
        })
        loading.value = false
        return
      }

      const muridList = await pb.collection('tb_mst_murid').getFullList({
        filter: `c_murid_id = "${row.c_emp_id}"`,
      })
      if (muridList.length === 0) {
        $q.notify({ type: 'negative', message: 'Data murid tidak ditemukan.' })
        loading.value = false
        return
      }
      const murid = muridList[0]
      const roleToSave = getDefaultRoleArray()

      const oldId = row.id
      const oldEmail = row.email

      await pb.collection('users').delete(oldId)
      await pb.collection('users').create({
        id: oldId,
        email: oldEmail,
        password: defaultPassword,
        passwordConfirm: defaultPassword,
        name: murid.c_nama,
        c_role: roleToSave,
        c_default_role: defaultRoleName,
        c_emp_id: murid.c_murid_id,
        b_aktif: true,
        emailVisibility: true,
      })

      $q.notify({ type: 'positive', message: `Password user ${oldEmail} berhasil direset.` })
      onRequest({ pagination: pagination.value, filter: filter.value })
    } catch (error) {
      console.error(error)
      $q.notify({ type: 'negative', message: 'Gagal mereset password.' })
    } finally {
      loading.value = false
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
    name: '',
    avatar: '',
    c_role: [],
    c_default_role: defaultRoleName,
    c_emp_id: '',
    b_aktif: true,
    emailVisibility: true,
  }
  showForm.value = true
}

const bukaFormEdit = (item) => {
  isEdit.value = true
  let roles = []
  if (Array.isArray(item.c_role)) roles = item.c_role
  else if (item.c_role) roles = [item.c_role]

  form.value = {
    id: item.id,
    email: item.email,
    name: item.name || '',
    avatar: item.avatar || '',
    c_role: roles,
    c_default_role: item.c_default_role || defaultRoleName,
    c_emp_id: item.c_emp_id || '',
    b_aktif: item.b_aktif ?? true,
    emailVisibility: true,
  }
  showForm.value = true
}

const tutupForm = () => {
  showForm.value = false
}

watch(
  () => form.value.c_emp_id,
  async (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      const selected = muridOptions.value.find((opt) => opt.value === newVal)
      if (selected) {
        form.value.name = selected.nama_lengkap
        const identifier = selected.nis || selected.value
        form.value.email = `${identifier}@murid.com`
      } else {
        try {
          const murid = await pb
            .collection('tb_mst_murid')
            .getFirstListItem(`c_murid_id = "${newVal}"`)
          form.value.name = murid.c_nama
          const identifier = murid.c_nis || murid.c_murid_id
          form.value.email = `${identifier}@murid.com`
        } catch (error) {
          console.error('Gagal mengambil data murid:', error)
          form.value.name = ''
          form.value.email = ''
        }
      }
    } else if (!newVal) {
      form.value.name = ''
      form.value.email = ''
    }
  },
)

// Lifecycle
onMounted(async () => {
  await loadRoleOptions()
  await loadKelasOptions()
  await loadMuridOptions()
  onRequest({ pagination: pagination.value, filter: filter.value })
})
</script>

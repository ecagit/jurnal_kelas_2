<script setup>
import { ref, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { pb } from 'boot/pocketbase'
import { handlePBError } from 'src/lib/errorHandler'

const $q = useQuasar()

// =======================================================
// STATE DATA TABEL & UI
// =======================================================
const rows = ref([])
const loading = ref(false)
const filter = ref('')
const showForm = ref(false)
const isEdit = ref(false)

const pagination = ref({
  sortBy: 'name',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

// =======================================================
// STATE DROPDOWN OPTIONS (LOOKUP)
// =======================================================
const optionGuru = ref([])
const optionMurid = ref([])
const optionRole = ref([])

const loadingGuru = ref(false)
const loadingMurid = ref(false)

// State penampung sementara untuk komponen UI Dropdown
const lookupGuru = ref(null)
const lookupMurid = ref(null)

// =======================================================
// STATE FORM USERS (SESUAI STRUKTUR BARU POINT 1)
// =======================================================
const form = ref({
  id: '',
  email: '',
  password: '',
  emailVisibility: true,
  verified: true,
  b_aktif: true,
  name: '',
  c_role: [], // Multiple select (Array ID Role)
  c_emp_id: '', // Berisi ID dari tb_mst_guru ATAU tb_mst_murid
  c_default_role: '', // Berisi teks "Guru" atau "Murid"
})

// Konfigurasi Kolom Utama Tabel
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no' },
  { name: 'name', label: 'NAMA LENGKAP', align: 'left', field: 'name', sortable: true },
  { name: 'email', label: 'EMAIL', align: 'left', field: 'email', sortable: true },
  {
    name: 'c_default_role',
    label: 'DEFAULT',
    align: 'center',
    field: 'c_default_role',
    sortable: true,
  },
  { name: 'c_role', label: 'HAK AKSES AKTIF (MULTIPLE)', align: 'left', field: 'expand_role' },
  { name: 'b_aktif', label: 'AKTIF', align: 'center', field: 'aktif', sortable: true },
  { name: 'actions', label: 'AKSI', align: 'center', field: 'actions' },
]

// =======================================================
// FETCH DATA UTAMA (SERVER-SIDE)
// =======================================================
const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  const filterValue = props.filter

  loading.value = true
  try {
    let sortString = sortBy ? (descending ? `-${sortBy}` : `+${sortBy}`) : ''
    let filterString = filterValue
      ? `name ~ "${filterValue}" || email ~ "${filterValue}" || c_default_role ~ "${filterValue}"`
      : ''
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
      expand_role: item.expand?.c_role ? item.expand.c_role.map((r) => r.c_role).join(', ') : '-',
      //b_aktif: item.b_aktif,
    }))
  } catch {
    $q.notify({ type: 'negative', message: 'Gagal memuat data pengguna.' })
  } finally {
    loading.value = false
  }
}

// Load Master Role untuk Isian users.c_role
const fetchOptionsRole = async () => {
  try {
    const records = await pb.collection('tb_mst_role').getFullList({ filter: 'b_aktif = true' })
    optionRole.value = records.map((r) => ({ label: r.c_role, value: r.id }))
  } catch {
    console.error('Gagal memuat opsi master role.')
  }
}

// Server-Side Live Search Guru
const filterGuru = async (val, update, abort) => {
  if (val.length < 2) {
    update(() => {
      optionGuru.value = []
    })
    return
  }
  loadingGuru.value = true
  try {
    const records = await pb.collection('tb_mst_guru').getList(1, 20, {
      filter: `c_nama ~ "${val}" || c_guru_id ~ "${val}"`,
    })
    update(() => {
      optionGuru.value = records.items.map((g) => ({
        label: `${g.c_guru_id} - ${g.c_nama}`,
        //value: g.id,
        value: g.c_guru_id,
        rawName: g.c_nama,
      }))
    })
  } catch {
    abort()
  } finally {
    loadingGuru.value = false
  }
}

// Server-Side Live Search Murid
const filterMurid = async (val, update, abort) => {
  if (val.length < 2) {
    update(() => {
      optionMurid.value = []
    })
    return
  }
  loadingMurid.value = true
  try {
    const records = await pb.collection('tb_mst_murid').getList(1, 20, {
      filter: `c_nama ~ "${val}" || c_murid_id ~ "${val}"`,
    })
    update(() => {
      optionMurid.value = records.items.map((m) => ({
        label: `${m.c_murid_id} - ${m.c_nama}`,
        value: m.c_murid_id,
        rawName: m.c_nama,
      }))
    })
  } catch {
    abort()
  } finally {
    loadingMurid.value = false
  }
}

// =======================================================
// WATCHERS (KETENTUAN POINT 4: SALING CLEAR OTOMATIS)
// =======================================================
watch(lookupGuru, (newVal) => {
  if (newVal) {
    lookupMurid.value = null // Otomatis bersihkan dropdown murid
    form.value.name = newVal.rawName // Isi usulan nama sementara
  }
})

watch(lookupMurid, (newVal) => {
  if (newVal) {
    lookupGuru.value = null // Otomatis bersihkan dropdown guru
    form.value.name = newVal.rawName // Isi usulan nama sementara
  }
})

// =======================================================
// PROSES SIMPAN DATA & MANIPULASI ROLE (POINT 5, 6, 7)
// =======================================================
const simpanData = async () => {
  if (!lookupGuru.value && !lookupMurid.value) {
    $q.notify({
      type: 'warning',
      message: '⚠️ Peringatan: Anda harus memilih salah satu data Guru atau Murid terlebih dahulu!',
      position: 'top',
      timeout: 4000,
      actions: [{ icon: 'close', color: 'white' }],
    })
    return
  }
  try {
    // Ambil ID unik master role "Guru" & "Murid" secara dinamis dari database
    const idRoleGuru = optionRole.value.find((r) => r.label.toLowerCase() === 'guru')?.value
    const idRoleMurid = optionRole.value.find((r) => r.label.toLowerCase() === 'murid')?.value

    let rolesResult = [...form.value.c_role]

    // Evaluasi Dropdown yang Aktif sebelum Push ke PocketBase
    if (lookupGuru.value) {
      form.value.c_default_role = 'Guru' // Ketentuan Point 2
      form.value.c_emp_id = lookupGuru.value.value // Ketentuan Point 1
      form.value.name = lookupGuru.value.rawName // Ketentuan Point 7

      // Ketentuan Point 5: Inject Role Guru, basmi Role Murid jika ada
      if (idRoleGuru && !rolesResult.includes(idRoleGuru)) rolesResult.push(idRoleGuru)
      if (idRoleMurid) rolesResult = rolesResult.filter((id) => id !== idRoleMurid)
    } else if (lookupMurid.value) {
      form.value.c_default_role = 'Murid' // Ketentuan Point 2
      form.value.c_emp_id = lookupMurid.value.value // Ketentuan Point 1
      form.value.name = lookupMurid.value.rawName // Ketentuan Point 7

      // Ketentuan Point 6: Inject Role Murid, basmi Role Guru jika ada
      if (idRoleMurid && !rolesResult.includes(idRoleMurid)) rolesResult.push(idRoleMurid)
      if (idRoleGuru) rolesResult = rolesResult.filter((id) => id !== idRoleGuru)
    } else {
      // Jika kedua lookup kosong (Pembuatan Manual Admin / Akun Umum diluar warga sekolah)
      form.value.c_default_role = ''
      form.value.c_emp_id = ''
    }

    const payload = {
      email: form.value.email,
      emailVisibility: form.value.emailVisibility,
      verified: form.value.verified,
      b_aktif: form.value.b_aktif,
      name: form.value.name,
      c_role: rolesResult, // Hasil kompilasi akhir mutasi role
      c_emp_id: form.value.c_emp_id,
      c_default_role: form.value.c_default_role,
    }

    if (isEdit.value) {
      await pb.collection('users').update(form.value.id, payload)
      $q.notify({ type: 'positive', message: 'Data user berhasil diperbarui.' })
    } else {
      payload.password = form.value.password
      payload.passwordConfirm = form.value.password
      await pb.collection('users').create(payload)
      $q.notify({ type: 'positive', message: 'User baru berhasil didaftarkan.' })
    }

    tutupForm()
    onRequest({ pagination: pagination.value, filter: filter.value })
  } catch (error) {
    handlePBError(error, {
      email: { validation_not_unique: 'Gagal! Email tersebut sudah terdaftar di sistem.' },
    })
  }
}

// =======================================================
// POPULATE DATA SAAT EDIT AKUN (RE-CONSTRUCT OBJECT)
// =======================================================
const bukaFormEdit = async (item) => {
  isEdit.value = true

  let guruObj = null
  let muridObj = null

  // Deteksi asal default role untuk memicu rekonstruksi label text dropdown
  if (item.c_default_role === 'Guru' && item.c_emp_id) {
    try {
      const g = await pb.collection('tb_mst_guru').getOne(item.c_emp_id)
      guruObj = { value: g.c_guru_id, label: `${g.c_guru_id} - ${g.c_nama}`, rawName: g.c_nama }
    } catch {
      console.error('Gagal fetch detail data relasi guru.')
    }
  } else if (item.c_default_role === 'Murid' && item.c_emp_id) {
    try {
      const m = await pb.collection('tb_mst_murid').getOne(item.c_emp_id)
      muridObj = {
        value: m.c_murid_id,
        label: `${m.c_murid_id} - ${m.c_nama}`,
        rawName: m.c_nama,
      }
    } catch {
      console.error('Gagal fetch detail data relasi murid.')
    }
  }

  lookupGuru.value = guruObj
  lookupMurid.value = muridObj

  form.value = {
    id: item.id,
    email: item.email,
    password: '',
    emailVisibility: item.emailVisibility,
    verified: item.verified,
    name: item.name,
    b_aktif: item.b_aktif,
    c_role: item.c_role || [],
    c_emp_id: item.c_emp_id || '',
    c_default_role: item.c_default_role || '',
  }
  showForm.value = true
}

const hapusData = (id, name) => {
  $q.dialog({
    title: 'Hapus Pengguna',
    message: `Apakah Anda yakin ingin menghapus pengguna <strong>${name}</strong>?`,
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await pb.collection('users').delete(id)
      $q.notify({ type: 'positive', message: 'User berhasil dihapus.' })
      onRequest({ pagination: pagination.value, filter: filter.value })
    } catch (error) {
      handlePBError(error)
    }
  })
}

const bukaFormTambah = () => {
  isEdit.value = false
  lookupGuru.value = null
  lookupMurid.value = null
  form.value = {
    id: '',
    email: '',
    password: 'Palu' + Math.floor(1000 + Math.random() * 9000),
    emailVisibility: true,
    verified: true,
    b_aktif: true,
    name: '',
    c_role: [],
    c_emp_id: '',
    c_default_role: '',
  }
  showForm.value = true
}

const tutupForm = () => {
  showForm.value = false
}

onMounted(async () => {
  await fetchOptionsRole()
  onRequest({ pagination: pagination.value, filter: filter.value })
})
</script>

<template>
  <q-page class="q-pa-sm">
    <q-card v-if="!showForm" flat bordered>
      <q-table
        title="Manajemen Pengguna Sistem (Users)"
        :rows="rows"
        :columns="columns"
        row-key="id"
        v-model:pagination="pagination"
        :loading="loading"
        :filter="filter"
        @request="onRequest"
        flat
        bordered
        separator="cell"
        binary-state-sort
        class="my-zebra-table"
      >
        <template v-slot:top-right>
          <q-input
            debounce="300"
            v-model="filter"
            placeholder="Cari user..."
            outlined
            clearable
            dense
            style="min-width: 200px"
            class="q-mr-sm"
          >
            <template v-slot:append><q-icon name="search" /></template>
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
          />
        </template>

        <template v-slot:body-cell-no="props">
          <q-td :props="props" class="text-center">
            {{ (pagination.page - 1) * pagination.rowsPerPage + props.rowIndex + 1 }}
          </q-td>
        </template>

        <template v-slot:body-cell-c_default_role="props">
          <q-td :props="props" class="text-center">
            <q-chip
              v-if="props.row.c_default_role"
              :color="props.row.c_default_role === 'Guru' ? 'blue-1' : 'orange-1'"
              :text-color="props.row.c_default_role === 'Guru' ? 'blue-9' : 'orange-9'"
              :label="props.row.c_default_role"
              size="sm"
              class="text-weight-bold"
            />
            <span v-else class="text-grey-5">-</span>
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
              {{ props.row.b_aktif ? 'Ya' : 'Tidak' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center q-gutter-x-sm">
            <q-btn flat dense color="primary" icon="edit" @click="bukaFormEdit(props.row)" />
            <q-btn
              flat
              dense
              color="negative"
              icon="delete"
              @click="hapusData(props.row.id, props.row.name)"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-card v-else flat bordered>
      <q-card-section
        class="row items-center q-pb-none"
        style="border-bottom: 1px solid #e0e0e0; padding-bottom: 10px"
      >
        <q-btn flat round dense icon="arrow_back" @click="tutupForm" class="q-mr-sm" />
        <div class="text-h6">
          {{ isEdit ? 'Modifikasi Akun Pengguna' : 'Registrasi Akun Pengguna Baru' }}
        </div>
      </q-card-section>

      <q-card-section class="q-pa-md">
        <q-form @submit.prevent="simpanData" class="q-gutter-y-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-select
                v-model="lookupGuru"
                use-input
                clearable
                outlined
                dense
                fill-input
                hide-selected
                behavior="menu"
                input-debounce="300"
                label="LookUp Data Master Guru (Ketik min 2 huruf)"
                :options="optionGuru"
                @filter="filterGuru"
                :loading="loadingGuru"
              >
                <template v-slot:no-option>
                  <q-item
                    ><q-item-section class="text-grey"
                      >Ketik nama guru untuk mencari...</q-item-section
                    ></q-item
                  >
                </template>
              </q-select>
            </div>

            <div class="col-12 col-md-6">
              <q-select
                v-model="lookupMurid"
                use-input
                clearable
                outlined
                dense
                fill-input
                hide-selected
                behavior="menu"
                input-debounce="300"
                label="LookUp Data Master Murid (Ketik min 2 huruf)"
                :options="optionMurid"
                @filter="filterMurid"
                :loading="loadingMurid"
              >
                <template v-slot:no-option>
                  <q-item
                    ><q-item-section class="text-grey"
                      >Ketik nama murid untuk mencari...</q-item-section
                    ></q-item
                  >
                </template>
              </q-select>
            </div>

            <div class="col-12 col-md-6">
              <q-input
                v-model="form.name"
                label="Nama Lengkap Pengguna *"
                outlined
                dense
                required
                hint="Akan diperbarui otomatis mengikuti pilihan LookUp Guru / Murid"
              />
            </div>

            <div class="col-12 col-md-6">
              <q-input
                v-model="form.email"
                label="Alamat Email *"
                type="email"
                outlined
                dense
                required
              />
            </div>

            <div v-if="!isEdit" class="col-12 col-md-6">
              <q-input v-model="form.password" label="Kata Sandi Awal *" outlined dense required />
            </div>

            <div class="col-12 col-md-6">
              <q-select
                v-model="form.c_role"
                multiple
                emit-value
                map-options
                outlined
                dense
                options-dense
                label="Hak Akses / Peran Tambahan (Multiple) *"
                :options="optionRole"
                :rules="[(val) => (val && val.length > 0) || 'Wajib menyematkan minimal 1 peran']"
                hint="Role utama (Guru/Murid) otomatis disesuaikan saat simpan, Anda bisa menambah role lain di sini"
              />
            </div>

            <div class="col-12 row q-gutter-md q-pt-sm">
              <q-toggle v-model="form.verified" label="Email Verified" color="green" />
              <q-toggle v-model="form.emailVisibility" label="Email Visible" color="primary" />
              <q-toggle v-model="form.b_aktif" label="Aktif" color="blue" />
            </div>
          </div>

          <div class="row justify-end q-mt-lg q-gutter-sm">
            <q-btn label="Batal" color="secondary" flat @click="tutupForm" />
            <q-btn type="submit" label="Simpan Perubahan" color="primary" icon="save" unelevated />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped>
.my-zebra-table :deep(.q-table tbody tr:nth-child(even)) {
  background-color: #fafafa;
}
</style>

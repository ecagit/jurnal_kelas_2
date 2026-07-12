<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { pb } from 'boot/pocketbase'
//import { getAgamaLookup, getKelasLookup } from 'src/lib/utils'
import { getAgamaLookup } from 'src/lib/utils'
import { handlePBError } from 'src/lib/errorHandler'
import { useAuthStore } from 'stores/authStore'

const $q = useQuasar()
const auth = useAuthStore()

// State Data Table & UI
const rows = ref([])
const loading = ref(false)
const filter = ref('') // untuk pencarian global
const showForm = ref(false)
const isEdit = ref(false)

// State untuk filter kelas (opsional)
const filterKelas = ref(null)
const kelasOptions = ref([]) // semua kelas yang tersedia (untuk form)
const filteredKelasOptions = ref([]) // untuk dropdown filter (bisa difilter pencarian)

// Options lainnya
const agamaOptions = ref([])

// Pagination
const pagination = ref({
  sortBy: 'c_murid_id',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

// Form
const form = ref({
  id: '',
  c_murid_id: '',
  c_nama: '',
  c_jk: '',
  c_agama: '',
  c_alamat: '',
  d_tgl_lahir: '',
  c_kota: '',
  c_asal_sekolah_sd: '',
  b_pindahan: false,
  b_aktif: true,
  c_kelas_id: '',
})

// Konfigurasi kolom tabel
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no', style: 'vertical-align: top;' },
  {
    name: 'c_murid_id',
    label: 'N I S N',
    align: 'left',
    field: 'c_murid_id',
    sortable: true,
    classes: 'kolom-wrap',
  },
  {
    name: 'c_nama',
    label: 'NAMA',
    align: 'left',
    field: 'c_nama',
    sortable: true,
    classes: 'kolom-wrap',
  },
  { name: 'c_jk', label: 'JK', align: 'center', field: 'c_jk', sortable: true },
  { name: 'c_agama', label: 'AGAMA', align: 'left', field: 'c_agama', sortable: true },
  {
    name: 'd_tgl_lahir',
    label: 'TGL.LAHIR',
    align: 'left',
    field: 'd_tgl_lahir',
    sortable: true,
    format: (val) => formatTgl(val),
  },
  { name: 'c_kelas_id', label: 'KELAS', align: 'left', field: 'c_kelas_id', classes: 'kolom-wrap' },
  {
    name: 'c_asal_sekolah_sd',
    label: 'ASAL SD',
    align: 'left',
    field: 'c_asal_sekolah_sd',
    sortable: true,
    classes: 'kolom-wrap',
  },
  { name: 'b_pindahan', label: 'PINDAHAN', align: 'center', field: 'b_pindahan', sortable: true },
  { name: 'b_aktif', label: 'AKTIF', align: 'center', field: 'b_aktif', sortable: true },
  { name: 'actions', label: 'AKSI', align: 'center', field: 'actions' },
]

// ============================================
// FUNGSI UTILITAS
// ============================================
const formatTgl = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', { timeZone: 'UTC' })
}

const getTampilanKelas = (idKelas) => {
  if (!idKelas) return '-'
  const kelas = kelasOptions.value.find((k) => k.value === idKelas)
  return kelas ? kelas.label : idKelas
}

// Load dropdowns (agama, kelas, dan kelas untuk filter)
const loadDropdowns = async () => {
  try {
    // Ambil data agama (dari utils)
    const agamaData = await getAgamaLookup()
    agamaOptions.value = agamaData

    // Ambil data kelas (dari authStore, sesuai role user)
    const kelasData = await auth.getKelasLookup()
    kelasOptions.value = kelasData
    filteredKelasOptions.value = [...kelasData]

    // Jika hanya ada satu kelas, set filter otomatis (opsional)
    if (kelasData.length === 1) {
      filterKelas.value = kelasData[0].value
    }
  } catch (error) {
    console.error('Gagal memuat opsi dropdown:', error)
  }
}

// Filter fungsi untuk dropdown kelas (pencarian)
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

// ============================================
// FETCH DATA MURID (dengan filter kelas opsional)
// ============================================
const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  const filterValue = props.filter
  loading.value = true

  try {
    let sortString = sortBy ? (descending ? `-${sortBy}` : `+${sortBy}`) : ''
    let filterString = ''

    // Filter pencarian global
    if (filterValue) {
      filterString = `c_nama ~ "${filterValue}" || c_murid_id ~ "${filterValue}"`
    }

    // Filter kelas opsional
    if (filterKelas.value) {
      const kelasFilter = `c_kelas_id = "${filterKelas.value}"`
      filterString = filterString ? `(${filterString}) && ${kelasFilter}` : kelasFilter
    }

    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage
    const result = await pb.collection('tb_mst_murid').getList(page, fetchLimit, {
      sort: sortString,
      filter: filterString,
    })

    rows.value = result.items
    pagination.value = {
      ...pagination.value,
      page,
      rowsPerPage,
      rowsNumber: result.totalItems,
      sortBy,
      descending,
    }
  } catch (error) {
    console.error('Gagal mengambil data murid:', error)
    $q.notify({ type: 'negative', message: 'Gagal memuat data murid.' })
  } finally {
    loading.value = false
  }
}

// Event handler ketika filter kelas berubah
const onFilterKelasChange = () => {
  pagination.value.page = 1
  onRequest({ pagination: pagination.value, filter: filter.value })
}

// ============================================
// CRUD OPERATIONS
// ============================================
const simpanData = async () => {
  try {
    const payload = {
      c_murid_id: form.value.c_murid_id,
      c_nama: form.value.c_nama,
      c_jk: form.value.c_jk,
      c_agama: form.value.c_agama,
      c_alamat: form.value.c_alamat,
      d_tgl_lahir: form.value.d_tgl_lahir,
      c_kota: form.value.c_kota,
      c_asal_sekolah_sd: form.value.c_asal_sekolah_sd,
      b_pindahan: !!form.value.b_pindahan,
      b_aktif: !!form.value.b_aktif,
      c_kelas_id: form.value.c_kelas_id,
    }

    if (isEdit.value) {
      await pb.collection('tb_mst_murid').update(form.value.id, payload)
      $q.notify({ type: 'positive', message: 'Data berhasil diupdate!' })
    } else {
      await pb.collection('tb_mst_murid').create(payload)
      $q.notify({ type: 'positive', message: 'Data berhasil ditambahkan!' })
    }

    tutupForm()
    onRequest({ pagination: pagination.value, filter: filter.value })
  } catch (error) {
    console.error('Proses simpan gagal:', error)
    handlePBError(error, {
      c_murid_id: {
        validation_not_unique: `Gagal! ID Murid "${form.value.c_murid_id}" sudah ada di database.`,
      },
    })
  }
}

const hapusData = (id, namaMurid) => {
  $q.dialog({
    title: 'Konfirmasi',
    message: `Yakin ingin menghapus murid <strong>${namaMurid}</strong>?`,
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await pb.collection('tb_mst_murid').delete(id)
      $q.notify({ type: 'positive', message: 'Data berhasil dihapus!' })
      onRequest({ pagination: pagination.value, filter: filter.value })
    } catch (error) {
      console.error(error)
      $q.notify({ type: 'negative', message: 'Gagal menghapus data.' })
    }
  })
}

// ============================================
// FORM CONTROL
// ============================================
const bukaFormTambah = () => {
  isEdit.value = false
  form.value = {
    id: '',
    c_murid_id: '',
    c_nama: '',
    c_jk: '',
    c_agama: '',
    c_alamat: '',
    d_tgl_lahir: '',
    c_kota: '',
    c_asal_sekolah_sd: '',
    b_pindahan: false,
    b_aktif: true,
    c_kelas_id: '',
  }
  showForm.value = true
}

const bukaFormEdit = (item) => {
  isEdit.value = true
  let tanggalMentah = item.d_tgl_lahir
  let tanggalFormatted = ''
  if (tanggalMentah) {
    tanggalFormatted = tanggalMentah.substring(0, 10)
  }
  form.value = {
    id: item.id,
    c_murid_id: item.c_murid_id,
    c_nama: item.c_nama,
    c_jk: item.c_jk,
    c_agama: item.c_agama,
    c_alamat: item.c_alamat,
    d_tgl_lahir: tanggalFormatted,
    c_kota: item.c_kota,
    c_asal_sekolah_sd: item.c_asal_sekolah_sd,
    b_pindahan: !!item.b_pindahan,
    b_aktif: !!item.b_aktif,
    c_kelas_id: item.c_kelas_id || '',
  }
  showForm.value = true
}

const tutupForm = () => {
  showForm.value = false
}

// Lifecycle
onMounted(async () => {
  await loadDropdowns()
  onRequest({ pagination: pagination.value, filter: filter.value })
})
</script>

<style scoped>
/* optional custom styles */
</style>

<template>
  <q-page class="q-pa-sm">
    <q-card v-if="!showForm" flat bordered>
      <q-table
        title="Data Murid"
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
        no-data-label="Data tidak ditemukan"
        no-results-label="Pencarian tidak ditemukan"
        class="my-zebra-table"
      >
        <template v-slot:top-left>
          <div class="row items-center q-gutter-sm">
            <div class="text-h6 q-mr-md">Data Murid</div>
            <!-- Filter Kelas (Opsional) berbasis role -->
            <q-select
              v-model="filterKelas"
              :options="filteredKelasOptions"
              option-label="label"
              option-value="value"
              label="Filter Kelas (Opsional)"
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
            placeholder="Cari Nama / NISN..."
            label="Cari Nama / NISN..."
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

        <template v-slot:body-cell-c_kelas_id="props">
          <q-td :props="props">{{ getTampilanKelas(props.row.c_kelas_id) }}</q-td>
        </template>

        <template v-slot:body-cell-b_pindahan="props">
          <q-td :props="props" class="text-center">
            <q-chip
              :color="props.row.b_pindahan ? 'positive' : 'negative'"
              text-color="white"
              dense
              icon="check"
              size="sm"
            >
              {{ props.row.b_pindahan ? 'Ya' : 'Tidak' }}
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
              {{ props.row.b_aktif ? 'Ya' : 'Tidak' }}
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
              title="Edit"
            />
            <q-btn
              flat
              dense
              color="negative"
              icon="delete"
              @click="hapusData(props.row.id, props.row.c_nama)"
              title="Hapus"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Form Tambah/Edit -->
    <q-card v-else flat bordered>
      <q-card-section class="row items-center q-pb-none">
        <q-btn flat round dense icon="arrow_back" @click="tutupForm" class="q-mr-sm" />
        <div class="text-h6">{{ isEdit ? 'Edit Data Murid' : 'Tambah Data Murid Baru' }}</div>
      </q-card-section>

      <q-card-section class="q-pa-sm">
        <q-form @submit.prevent="simpanData" class="q-gutter-y-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input v-model="form.c_murid_id" label="N I S N *" outlined dense required />
            </div>
            <div class="col-12 col-md-6">
              <q-input v-model="form.c_nama" label="Nama Lengkap *" outlined dense required />
            </div>

            <div class="col-12 col-md-6">
              <q-select
                v-model="form.c_jk"
                :options="['L', 'P']"
                label="Jenis Kelamin"
                outlined
                dense
              />
            </div>
            <div class="col-12 col-md-6">
              <q-select
                v-model="form.c_agama"
                :options="agamaOptions"
                label="Agama"
                outlined
                dense
              />
            </div>

            <div class="col-12 col-md-6">
              <q-input
                v-model="form.d_tgl_lahir"
                type="date"
                label="Tanggal Lahir"
                outlined
                dense
                stack-label
              />
            </div>
            <div class="col-12 col-md-6">
              <q-select
                v-model="form.c_kelas_id"
                :options="kelasOptions"
                option-value="value"
                option-label="label"
                label="Kelas"
                emit-value
                map-options
                outlined
                dense
                clearable
              />
            </div>

            <div class="col-12 col-md-6">
              <q-input v-model="form.c_alamat" label="Alamat" outlined dense />
            </div>
            <div class="col-12 col-md-6">
              <q-input v-model="form.c_kota" label="Kota" outlined dense />
            </div>

            <div class="col-12 col-md-6">
              <q-input v-model="form.c_asal_sekolah_sd" label="Asal Sekolah SD" outlined dense />
            </div>
            <div class="col-12 col-md-6 flex items-center q-gutter-x-md">
              <div class="col-12 col-md-6 flex items-center">
                <q-toggle
                  v-model="form.b_pindahan"
                  label="Pindahan"
                  color="orange"
                  keep-color
                  icon="check"
                  size="lg"
                  unchecked-icon="clear"
                />
              </div>
              <div class="col-12 col-md-6 flex items-center">
                <q-toggle
                  v-model="form.b_aktif"
                  label="Status Aktif"
                  color="green"
                  keep-color
                  icon="check"
                  size="lg"
                  unchecked-icon="clear"
                />
              </div>
            </div>
          </div>

          <div class="row justify-end q-mt-lg q-gutter-sm">
            <q-btn label="Batal" color="secondary" flat @click="tutupForm" />
            <q-btn
              type="submit"
              :label="isEdit ? 'Update Data' : 'Simpan Data'"
              color="primary"
              icon="save"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

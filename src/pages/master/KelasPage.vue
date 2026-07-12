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
  sortBy: 'c_kelas_id',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

// State Form
const form = ref({
  id: '',
  c_kelas_id: '',
  c_nama_kelas: '',
  c_wali_kelas_id: '',
})

// ============================================
// KONFIGURASI KOLOM Q-TABLE
// ============================================
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no' },
  { name: 'c_kelas_id', label: 'KODE', align: 'left', field: 'c_kelas_id', sortable: true },
  {
    name: 'c_nama_kelas',
    label: 'NAMA KELAS',
    align: 'left',
    field: 'c_nama_kelas',
    sortable: true,
  },
  {
    name: 'c_wali_kelas_id',
    label: 'WALI KLS ID',
    align: 'left',
    field: 'c_wali_kelas_id',
    sortable: true,
  },
  { name: 'actions', label: 'AKSI', align: 'center', field: 'actions' },
]

// ============================================
// FUNGSI FETCH DATA (DIPANGGIL OLEH Q-TABLE)
// ============================================
const onRequest = async (props) => {
  // 1. Dekonstruksi props dari Q-Table
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  const filterValue = props.filter

  loading.value = true

  try {
    // 2. Persiapkan parameter untuk PocketBase
    let sortString = sortBy ? (descending ? `-${sortBy}` : `+${sortBy}`) : ''
    let filterString = filterValue
      ? `c_nama_kelas ~ "${filterValue}" || c_kelas_id ~ "${filterValue}"`
      : ''

    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage

    // 3. Ambil data
    const result = await pb.collection('tb_mst_kelas').getList(page, fetchLimit, {
      sort: sortString,
      filter: filterString,
    })

    // 4. UPDATE STATE SECARA AMAN (Tanpa mengganti seluruh objek)
    pagination.value.page = page
    pagination.value.rowsPerPage = rowsPerPage
    pagination.value.rowsNumber = result.totalItems // Update total data untuk pagination footer
    pagination.value.sortBy = sortBy
    pagination.value.descending = descending

    rows.value = result.items
  } catch (error) {
    handlePBError(error)
  } finally {
    loading.value = false
  }
}

// ============================================
// FUNGSI CRUD
// ============================================
const simpanData = async () => {
  try {
    const payload = {
      c_kelas_id: form.value.c_kelas_id,
      c_nama_kelas: form.value.c_nama_kelas,
      c_wali_kelas_id: form.value.c_wali_kelas_id,
    }

    if (isEdit.value) {
      await pb.collection('tb_mst_kelas').update(form.value.id, payload)
      $q.notify({ type: 'positive', message: 'Data berhasil diupdate!', position: 'bottom' })
    } else {
      await pb.collection('tb_mst_kelas').create(payload)
      $q.notify({ type: 'positive', message: 'Data berhasil ditambahkan!', position: 'bottom' })
    }

    tutupForm()
    onRequest({ pagination: pagination.value, filter: filter.value })
  } catch (error) {
    console.error('Proses simpan gagal:', error)

    // --- PANGGIL FUNGSI GLOBAL DI SINI ---
    // Kita berikan custom message khusus untuk c_kelas_id agar bahasanya lebih "manusiawi"
    handlePBError(error, {
      c_kelas_id: {
        validation_not_unique: `Gagal! ID Kelas "${form.value.c_kelas_id}" sudah ada di database.`,
      },
    })
  }
}

const hapusData = (id, namaKelas) => {
  $q.dialog({
    title: 'Konfirmasi',
    message: `Yakin ingin menghapus kelas <strong>${namaKelas}</strong>?`,
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await pb.collection('tb_mst_kelas').delete(id)
      $q.notify({ type: 'positive', message: 'Data berhasil dihapus!', position: 'bottom' })
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
    c_kelas_id: '',
    c_nama_kelas: '',
    c_wali_kelas_id: '',
  }
  showForm.value = true
}

const bukaFormEdit = (item) => {
  isEdit.value = true
  form.value = {
    id: item.id,
    c_kelas_id: item.c_kelas_id,
    c_nama_kelas: item.c_nama_kelas,
    c_wali_kelas_id: item.c_wali_kelas_id || '',
  }
  showForm.value = true
}

const tutupForm = () => {
  showForm.value = false
}

onMounted(() => {
  onRequest({ pagination: pagination.value, filter: filter.value })
})
</script>

<template>
  <q-page class="q-pa-sm">
    <q-card v-if="!showForm" flat bordered>
      <q-table
        title="Data Kelas"
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
        <template v-slot:top-right>
          <q-input
            debounce="300"
            v-model="filter"
            placeholder="Cari Nama / Kode..."
            label="Cari Nama / Kode..."
            outlined
            clearable
            dense
            style="min-width: 150px; background: white"
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

        <!-- Perbaikan Formula Penomoran
        <template v-slot:body-cell-no="props">
          <q-td :props="props" class="text-center">
            {{ (pagination.page - 1) * pagination.rowsPerPage + props.rowIndex + 1 }}
          </q-td>
        </template>
-->

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
              @click="hapusData(props.row.id, props.row.c_nama_kelas)"
              title="Hapus"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-card v-else flat bordered>
      <q-card-section class="row items-center q-pb-none">
        <q-btn flat round dense icon="arrow_back" @click="tutupForm" class="q-mr-sm" />
        <div class="text-h6">{{ isEdit ? 'Edit Data Kelas' : 'Tambah Data Kelas Baru' }}</div>
      </q-card-section>

      <q-card-section class="q-pa-sm">
        <q-form @submit.prevent="simpanData" class="q-gutter-y-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input v-model="form.c_kelas_id" label="Kode Kelas *" outlined dense required />
            </div>
            <div class="col-12 col-md-6">
              <q-input v-model="form.c_nama_kelas" label="Nama Kelas *" outlined dense required />
            </div>

            <div class="col-12 col-md-6">
              <q-input v-model="form.c_wali_kelas_id" label="Wali Kelas ID" outlined dense />
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

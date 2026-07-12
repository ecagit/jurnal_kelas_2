<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar, date } from 'quasar'
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
  sortBy: 'd_tanggal',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

const kolomAktif = ref([
  'no',
  //'c_periode',
  'd_tanggal',
  'c_keterangan',
  'b_aktif',
  'actions',
])

// State Form
const form = ref({
  id: '',
  c_periode: '',
  d_tanggal: '',
  b_aktif: true,
  c_keterangan: '',
})

// ============================================
// KONFIGURASI KOLOM Q-TABLE
// ============================================
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no' },
  { name: 'c_periode', label: 'PERIODE', align: 'left', field: 'c_periode', sortable: true },
  { name: 'd_tanggal', label: 'TANGGAL', align: 'center', field: 'd_tanggal', sortable: true },
  {
    name: 'c_keterangan',
    label: 'KETERANGAN',
    align: 'left',
    field: 'c_keterangan',
    sortable: true,
  },
  {
    name: 'b_aktif',
    label: 'AKTIF',
    align: 'center',
    field: 'b_aktif',
    sortable: true,
  },

  { name: 'actions', label: 'AKSI', align: 'center', field: 'actions' },
]

// ============================================
// FUNGSI FETCH DATA (DIPANGGIL OLEH Q-TABLE)
// ============================================
const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  const filterValue = props.filter

  loading.value = true

  try {
    let sortString = sortBy ? (descending ? `-${sortBy}` : `+${sortBy}`) : ''
    let filterString = filterValue
      ? `c_keterangan ~ "${filterValue}" || c_periode ~ "${filterValue}"`
      : ''

    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage

    const result = await pb.collection('tb_mst_hari_libur').getList(page, fetchLimit, {
      sort: sortString,
      filter: filterString,
    })

    pagination.value.page = page
    pagination.value.rowsPerPage = rowsPerPage
    pagination.value.rowsNumber = result.totalItems
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
      c_periode: form.value.c_periode,
      d_tanggal: form.value.d_tanggal,
      c_keterangan: form.value.c_keterangan,
      b_aktif: form.value.b_aktif,
    }

    if (isEdit.value) {
      await pb.collection('tb_mst_hari_libur').update(form.value.id, payload)
      $q.notify({
        type: 'positive',
        message: 'Data hari libur berhasil diupdate!',
        position: 'bottom',
      })
    } else {
      await pb.collection('tb_mst_hari_libur').create(payload)
      $q.notify({
        type: 'positive',
        message: 'Data hari libur berhasil ditambahkan!',
        position: 'bottom',
      })
    }

    tutupForm()
    onRequest({ pagination: pagination.value, filter: filter.value })
  } catch (error) {
    console.error('Proses simpan gagal:', error)
    handlePBError(error, {
      d_tanggal: {
        validation_not_unique: `Gagal! Tanggal "${form.value.d_tanggal}" sudah terdaftar sebagai hari libur.`,
      },
    })
  }
}

const hapusData = (id, keterangan) => {
  $q.dialog({
    title: 'Konfirmasi Hapus',
    message: `Yakin ingin menghapus hari libur "<strong>${keterangan}</strong>"?`,
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await pb.collection('tb_mst_hari_libur').delete(id)
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
    c_periode: '',
    d_tanggal: '',
    c_keterangan: '',
    b_aktif: true,
  }
  showForm.value = true
}

const bukaFormEdit = (item) => {
  isEdit.value = true
  // Format tanggal dari database (Y-m-d H:i:s) menjadi YYYY-MM-DD untuk input date
  const tanggalFormatted = item.d_tanggal ? item.d_tanggal.split(' ')[0] : ''
  form.value = {
    id: item.id,
    c_periode: item.c_periode,
    d_tanggal: tanggalFormatted,
    c_keterangan: item.c_keterangan || '',
    b_aktif: item.b_aktif,
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
        title="Data Hari Libur"
        :rows="rows"
        :columns="columns"
        row-key="id"
        :visible-columns="kolomAktif"
        v-model:pagination="pagination"
        :loading="loading"
        :filter="filter"
        @request="onRequest"
        flat
        bordered
        separator="cell"
        binary-state-sort
        no-data-label="Tidak ada data hari libur"
        no-results-label="Pencarian tidak ditemukan"
        class="my-zebra-table"
      >
        <template v-slot:top-right>
          <q-input
            debounce="300"
            v-model="filter"
            placeholder="Cari Periode / Keterangan..."
            label="Cari Periode / Keterangan..."
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
          <q-td :props="props" class="text-center">
            {{ props.rowIndex + 1 }}
          </q-td>
        </template>
        <!--
        <template v-slot:body-cell-no="props">
          <q-td :props="props" class="text-center">
            {{ (pagination.page - 1) * pagination.rowsPerPage + props.rowIndex + 1 }}
          </q-td>
        </template>
      -->
        <template v-slot:body-cell-d_tanggal="props">
          <q-td :props="props" class="text-center">
            {{ props.row.d_tanggal ? date.formatDate(props.row.d_tanggal, 'DD/MM/YYYY') : '-' }}
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
              title="Edit"
            />
            <q-btn
              flat
              dense
              color="negative"
              icon="delete"
              @click="hapusData(props.row.id, props.row.c_keterangan)"
              title="Hapus"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-card v-else flat bordered>
      <q-card-section class="row items-center q-pb-none">
        <q-btn flat round dense icon="arrow_back" @click="tutupForm" class="q-mr-sm" />
        <div class="text-h6">{{ isEdit ? 'Edit Hari Libur' : 'Tambah Hari Libur Baru' }}</div>
      </q-card-section>

      <q-card-section class="q-pa-sm">
        <q-form @submit.prevent="simpanData" class="q-gutter-y-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.c_periode"
                label="Periode (contoh: 2024/2025)"
                outlined
                dense
                required
                hint="Masukkan kode periode sesuai master periode"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.d_tanggal"
                label="Tanggal Libur *"
                type="date"
                outlined
                dense
                required
              />
            </div>
            <div class="col-12 col-md-12">
              <q-input
                v-model="form.c_keterangan"
                label="Keterangan (contoh: Libur Nasional, Cuti Bersama, dll) *"
                outlined
                dense
                required
              />
            </div>
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

<style scoped>
.my-zebra-table :deep(.q-table tbody tr:nth-child(even)) {
  background-color: #f5f5f5;
}
</style>

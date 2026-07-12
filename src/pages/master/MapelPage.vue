<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { pb } from 'boot/pocketbase'
import { handlePBError } from 'src/lib/errorHandler'

const $q = useQuasar()

// State Data Table & UI
const rows = ref([])
const loading = ref(false)
const filter = ref('') // Untuk fitur Search
const showForm = ref(false)
const isEdit = ref(false)

// State Pagination & Sorting Server-Side
const pagination = ref({
  sortBy: 'c_mapel_id',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0, // Akan diisi oleh totalItems dari PocketBase
})

// State Form
const form = ref({
  id: '',
  c_mapel_id: '',
  c_nama_mapel: '',
  n_jml_jam: 0,
  b_aktif: false,
})

// ============================================
// KONFIGURASI KOLOM Q-TABLE
// ============================================
const columns = [
  { name: 'no', label: 'NOoo', align: 'center', field: 'no', style: 'vertical-align: top;' },
  {
    name: 'c_mapel_id',
    label: 'KODE',
    align: 'left',
    field: 'c_mapel_id',
    classes: 'kolom-wrap',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'c_nama_mapel',
    label: 'NAMA MAPEL',
    align: 'left',
    field: 'c_nama_mapel',
    classes: 'kolom-wrap',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'n_jml_jam',
    label: 'JAM',
    align: 'center',
    field: 'n_jml_jam',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'b_aktif',
    label: 'AKTIF',
    align: 'center',
    field: 'b_aktif',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'actions',
    label: 'AKSI',
    align: 'center',
    field: 'actions',
    style: 'vertical-align: top;',
  },
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
      ? `c_nama_mapel ~ "${filterValue}" || c_mapel_id ~ "${filterValue}"`
      : ''

    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage

    // 3. Ambil data
    const result = await pb.collection('tb_mst_mapel').getList(page, fetchLimit, {
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
      c_mapel_id: form.value.c_mapel_id,
      c_nama_mapel: form.value.c_nama_mapel,
      n_jml_jam: Number(form.value.n_jml_jam),
      b_aktif: !!form.value.b_aktif,
    }

    if (isEdit.value) {
      await pb.collection('tb_mst_mapel').update(form.value.id, payload)
      $q.notify({ type: 'positive', message: 'Data berhasil diupdate!' })
    } else {
      await pb.collection('tb_mst_mapel').create(payload)
      $q.notify({ type: 'positive', message: 'Data berhasil ditambahkan!' })
    }

    tutupForm()
    // Refresh tabel (menggunakan state pagination terkini)
    onRequest({ pagination: pagination.value, filter: filter.value })
  } catch (error) {
    console.error('Proses simpan gagal:', error)

    // --- PANGGIL FUNGSI GLOBAL DI SINI ---
    // Kita berikan custom message khusus untuk c_mapel_id agar bahasanya lebih "manusiawi"
    handlePBError(error, {
      c_mapel_id: {
        validation_not_unique: `Gagal! ID Mata Pelajaran "${form.value.c_mapel_id}" sudah ada di database.`,
      },
    })
  }
}

const hapusData = (id, namaMapel) => {
  $q.dialog({
    title: 'Konfirmasi',
    message: `Yakin ingin menghapus mapel <strong>${namaMapel}</strong>?`,
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await pb.collection('tb_mst_mapel').delete(id)
      $q.notify({ type: 'positive', message: 'Data berhasil dihapus!' })
      onRequest({ pagination: pagination.value, filter: filter.value })
    } catch (error) {
      console.error(error)
      $q.notify({ type: 'negative', message: 'Gagal menghapus data.' })
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
    c_mapel_id: '',
    c_nama_mapel: '',
    n_jml_jam: 0,
    b_aktif: true,
  }
  showForm.value = true
}

const bukaFormEdit = (item) => {
  isEdit.value = true
  form.value = {
    id: item.id,
    c_mapel_id: item.c_mapel_id,
    c_nama_mapel: item.c_nama_mapel,
    n_jml_jam: item.n_jml_jam,
    b_aktif: !!item.b_aktif,
  }
  showForm.value = true
}

const tutupForm = () => {
  showForm.value = false
}

// Lifecycle Hooks
onMounted(() => {
  // Trigger fetch pertama kali dengan memanggil onRequest secara manual
  onRequest({ pagination: pagination.value, filter: filter.value })
})
</script>

<template>
  <q-page class="q-pa-sm">
    <q-card v-if="!showForm" flat bordered>
      <q-table
        title="Data Mata Pelajaran"
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
        <!--
        <template v-slot:body-cell-no="props">
          <q-td :props="props">
            {{ (pagination.page - 1) * pagination.rowsPerPage + props.rowIndex + 1 }}
          </q-td>
        </template>
-->
        <template v-slot:body-cell-b_aktif="props">
          <q-td :props="props">
            <q-badge :color="props.row.b_aktif ? 'positive' : 'negative'">
              {{ props.row.b_aktif ? 'Aktif' : 'Non-Aktif' }}
            </q-badge>
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
              @click="hapusData(props.row.id, props.row.c_nama_mapel)"
              title="Hapus"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-card v-else flat bordered>
      <q-card-section class="row items-center q-pb-none">
        <q-btn flat round dense icon="arrow_back" @click="tutupForm" class="q-mr-sm" />
        <div class="text-h6">
          {{ isEdit ? 'Edit Data Mata Pelajaran' : 'Tambah Data Mata Pelajaran Baru' }}
        </div>
      </q-card-section>

      <q-card-section class="q-pa-sm">
        <q-form @submit.prevent="simpanData" class="q-gutter-y-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input v-model="form.c_mapel_id" label="Kode Mapel *" outlined dense required />
            </div>

            <div class="col-12 col-md-6">
              <q-input v-model="form.c_nama_mapel" label="Nama Mapel *" outlined dense required />
            </div>

            <div class="col-12 col-md-6">
              <q-input v-model="form.n_jml_jam" type="number" label="Jumlah Jam" outlined dense />
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
/* Hampir tidak ada custom CSS karena Quasar menangani layout, spacing, form, dan table */
</style>

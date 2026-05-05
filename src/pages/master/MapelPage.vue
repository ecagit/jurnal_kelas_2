<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { pb } from 'boot/pocketbase'

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
  { name: 'no', label: 'NOoo', align: 'center', field: 'no' },
  { name: 'c_mapel_id', label: 'KODE', align: 'left', field: 'c_mapel_id', sortable: true },
  {
    name: 'c_nama_mapel',
    label: 'NAMA MAPEL',
    align: 'left',
    field: 'c_nama_mapel',
    sortable: true,
  },
  { name: 'n_jml_jam', label: 'JAM', align: 'center', field: 'n_jml_jam', sortable: true },
  { name: 'b_aktif', label: 'AKTIF', align: 'center', field: 'b_aktif', sortable: true },
  { name: 'actions', label: 'AKSI', align: 'center', field: 'actions' },
]

// ============================================
// FUNGSI FETCH DATA (DIPANGGIL OLEH Q-TABLE)
// ============================================
const onRequest = async (props) => {
  // Ambil state langsung dari parameter request tabel
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  const filterValue = props.filter

  loading.value = true

  try {
    const sortPrefix = descending ? '-' : '+'
    const sortQuery = sortBy ? sortPrefix + sortBy : '+c_mapel_id'

    let filterQuery = ''
    if (filterValue) {
      filterQuery = `c_nama_mapel ~ "${filterValue}" || c_mapel_id ~ "${filterValue}"`
    }

    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage

    const result = await pb.collection('tb_mst_mapel').getList(page, fetchLimit, {
      sort: sortQuery,
      filter: filterQuery,
    })

    // Update data tabel
    rows.value = result.items

    // 👇 HANYA UPDATE INI. Biarkan v-model:pagination menangani sisanya
    pagination.value.rowsNumber = result.totalItems
    pagination.value.page = page
    pagination.value.rowsPerPage = rowsPerPage
    pagination.value.sortBy = sortBy
    pagination.value.descending = descending
  } catch (error) {
    console.error('Gagal mengambil data:', error)
    $q.notify({ type: 'negative', message: 'Gagal memuat data mapel.' })
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
    console.error('Gagal menyimpan:', error)
    $q.notify({ type: 'negative', message: 'Terjadi kesalahan saat menyimpan data.' })
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
  <q-page class="q-pa-md">
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
      >
        <template v-slot:top-right>
          <q-input
            borderless
            dense
            debounce="300"
            v-model="filter"
            placeholder="Cari Nama / Kode..."
            class="q-mr-md q-px-sm"
            style="background: #f1f5f9; border-radius: 4px"
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>

          <q-btn
            color="primary"
            icon="add"
            label="Tambah Data"
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
          <q-td :props="props">
            {{ (pagination.page - 1) * pagination.rowsPerPage + props.rowIndex + 1 }}
          </q-td>
        </template>

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

      <q-card-section>
        <q-form @submit.prevent="simpanData" class="q-gutter-md">
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

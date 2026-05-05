<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { pb } from 'boot/pocketbase'

const $q = useQuasar()

// State Data Table & UI
const rows = ref([])
const loading = ref(false)
const filter = ref('')
const showForm = ref(false)
const isEdit = ref(false)

// State Pagination & Sorting Server-Side
const pagination = ref({
  sortBy: 'c_jam_id',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

// State Form
const form = ref({
  id: '',
  c_jam_id: '',
  c_nama: '',
  n_durasi: 0,
  c_keterangan: '',
})

// ============================================
// KONFIGURASI KOLOM Q-TABLE
// ============================================
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no' },
  { name: 'c_jam_id', label: 'KODE JAM', align: 'left', field: 'c_jam_id', sortable: true },
  { name: 'c_nama', label: 'NAMA JAM', align: 'left', field: 'c_nama', sortable: true },
  { name: 'n_durasi', label: 'DURASI', align: 'center', field: 'n_durasi', sortable: true },
  { name: 'b_aktif', label: 'AKTIF', align: 'center', field: 'b_aktif', sortable: true },
  {
    name: 'c_keterangan',
    label: 'KETERANGAN',
    align: 'left',
    field: 'c_keterangan',
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
    let sortString = ''
    if (sortBy) {
      sortString = descending ? `-${sortBy}` : `+${sortBy}`
    }

    let filterString = ''
    if (filterValue) {
      filterString = `c_nama ~ "${filterValue}" || c_jam_id ~ "${filterValue}" || c_keterangan ~ "${filterValue}"`
    }

    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage

    const result = await pb.collection('tb_mst_jamsat').getList(page, fetchLimit, {
      sort: sortString,
      filter: filterString,
    })

    rows.value = result.items
    pagination.value.page = page
    pagination.value.rowsPerPage = rowsPerPage
    pagination.value.sortBy = sortBy
    pagination.value.descending = descending
    pagination.value.rowsNumber = result.totalItems
  } catch (error) {
    console.error('Gagal mengambil ', error)
    $q.notify({ type: 'negative', message: 'Gagal memuat data jam pelajaran.' })
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
      c_jam_id: form.value.c_jam_id,
      c_nama: form.value.c_nama,
      n_durasi: Number(form.value.n_durasi),
      b_aktif: Number(form.value.b_aktif),
      c_keterangan: form.value.c_keterangan,
    }

    if (isEdit.value) {
      await pb.collection('tb_mst_jamsat').update(form.value.id, payload)
      $q.notify({ type: 'positive', message: 'Data berhasil diupdate!' })
    } else {
      await pb.collection('tb_mst_jamsat').create(payload)
      $q.notify({ type: 'positive', message: 'Data berhasil ditambahkan!' })
    }

    tutupForm()
    onRequest({ pagination: pagination.value, filter: filter.value })
  } catch (error) {
    console.error('Gagal menyimpan:', error)
    $q.notify({ type: 'negative', message: 'Terjadi kesalahan saat menyimpan data.' })
  }
}

const hapusData = (id, namaJam) => {
  $q.dialog({
    title: 'Konfirmasi',
    message: `Yakin ingin menghapus jam pelajaran <strong>${namaJam}</strong>?`,
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await pb.collection('tb_mst_jamsat').delete(id)
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
    c_jam_id: '',
    c_nama: '',
    n_durasi: 0,
    b_aktif: 1,
    c_keterangan: '',
  }
  showForm.value = true
}

const bukaFormEdit = (item) => {
  isEdit.value = true
  form.value = {
    id: item.id,
    c_jam_id: item.c_jam_id,
    c_nama: item.c_nama,
    n_durasi: item.n_durasi,
    b_aktif: !!item.b_aktif,
    c_keterangan: item.c_keterangan || '',
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
  <q-page class="q-pa-md">
    <q-card v-if="!showForm" flat bordered>
      <q-table
        title="Data Jam Pelajaran"
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
              @click="hapusData(props.row.id, props.row.c_nama)"
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
          {{ isEdit ? 'Edit Data Jam Pelajaran' : 'Tambah Data Jam Pelajaran Baru' }}
        </div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="simpanData" class="q-gutter-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input v-model="form.c_jam_id" label="Kode Jam *" outlined dense required />
            </div>

            <div class="col-12 col-md-6">
              <q-input v-model="form.c_nama" label="Nama Jam *" outlined dense required />
            </div>

            <div class="col-12 col-md-6">
              <q-input
                v-model="form.n_durasi"
                type="number"
                label="Durasi (Menit)"
                outlined
                dense
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

            <!-- <div class="col-12 col-md-6 flex items-center">
              <q-toggle v-model="form.b_aktif" label="Status Aktif" color="green" />
            </div> -->

            <div class="col-12 col-md-6">
              <q-input v-model="form.c_keterangan" label="Keterangan" outlined dense />
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

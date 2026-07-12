<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { pb } from 'boot/pocketbase' // Menggunakan jalur import budaya Quasar
import { getAgamaLookup, getMapelLookup } from 'src/lib/utils'
import { handlePBError } from 'src/lib/errorHandler'

const $q = useQuasar()

// State Data Table & UI
const rows = ref([])
const loading = ref(false)
const filter = ref('') // Untuk fitur Search
const showForm = ref(false)
const isEdit = ref(false)

// Options untuk Dropdown
const mapelOptions = ref([])
const agamaOptions = ref([])

// State Pagination & Sorting Server-Side
const pagination = ref({
  sortBy: 'c_guru_id',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0, // Akan diisi oleh totalItems dari PocketBase
})

// State Form
const form = ref({
  id: '',
  c_guru_id: '',
  c_nip: '',
  c_nama: '',
  c_jk: '',
  c_agama: '',
  d_tgl_lahir: '',
  j_mapel_id: [], // Pastikan ini array karena multiple mapel
  c_alamat: '',
  c_kota: '',
  b_aktif: false,
})

// ============================================
// KONFIGURASI KOLOM Q-TABLE
// ============================================
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no', style: 'vertical-align: top;' },
  {
    name: 'c_guru_id',
    label: 'KODE',
    align: 'left',
    field: 'c_guru_id',
    classes: 'kolom-wrap',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'c_nip',
    label: 'NIP',
    align: 'left',
    field: 'c_nip',
    classes: 'kolom-wrap',
    sortable: true,
  },
  {
    name: 'c_nama',
    label: 'NAMA',
    align: 'left',
    field: 'c_nama',
    classes: 'kolom-wrap',
    sortable: true,
  },
  {
    name: 'c_jk',
    label: 'JK',
    align: 'center',
    field: 'c_jk',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'c_agama',
    label: 'AGAMA',
    align: 'left',
    field: 'c_agama',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'd_tgl_lahir',
    label: 'TGL.LAHIR',
    align: 'left',
    field: 'd_tgl_lahir',
    sortable: true,
    format: (val) => formatTgl(val),
    style: 'vertical-align: top;',
  },
  {
    name: 'j_mapel_id',
    label: 'MAPEL',
    align: 'left',
    field: 'j_mapel_id',
    style: 'vertical-align: top;',
  },
  {
    name: 'c_alamat',
    label: 'ALAMAT',
    align: 'left',
    field: 'c_alamat',
    classes: 'kolom-wrap',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'c_kota',
    label: 'KOTA',
    align: 'left',
    field: 'c_kota',
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
// FUNGSI UTILITAS
// ============================================
const formatTgl = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', { timeZone: 'UTC' })
}

const getTampilanMapel = (idMapelArray) => {
  if (!idMapelArray || !idMapelArray.length) return '-'
  // Cari nama mapel berdasarkan ID yang ada di array
  const mapelNames = idMapelArray.map((id) => {
    const mapel = mapelOptions.value.find((m) => m.id_asli === id)
    return mapel ? mapel.tampilan : id
  })
  return mapelNames.join(', ')
}

const loadDropdowns = async () => {
  try {
    const [mapelData, agamaData] = await Promise.all([getMapelLookup(), getAgamaLookup()])
    mapelOptions.value = mapelData
    agamaOptions.value = agamaData
  } catch (error) {
    console.error('Gagal memuat opsi dropdown:', error)
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
    // 1. Setup Sorting untuk PocketBase (+ = ASC, - = DESC)
    let sortString = ''
    if (sortBy) {
      sortString = descending ? `-${sortBy}` : `+${sortBy}`
    }

    // 2. Setup Filter/Search (Pencarian NIP, NAMA, KODE)
    let filterString = ''
    if (filterValue) {
      filterString = `c_nama ~ "${filterValue}" || c_nip ~ "${filterValue}" || c_guru_id ~ "${filterValue}"`
    }

    // Hitung limit jika "All" (0) dipilih di table
    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage

    // 3. Ambil data dari PocketBase
    const result = await pb.collection('tb_mst_guru').getList(page, fetchLimit, {
      sort: sortString,
      filter: filterString,
    })

    // 4. Update data tabel
    rows.value = result.items

    // 5. Update state pagination lokal agar UI sinkron
    pagination.value.page = page
    pagination.value.rowsPerPage = rowsPerPage
    pagination.value.sortBy = sortBy
    pagination.value.descending = descending
    pagination.value.rowsNumber = result.totalItems
  } catch (error) {
    console.error('Gagal mengambil data:', error)
    $q.notify({ type: 'negative', message: 'Gagal memuat data guru.' })
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
      c_guru_id: form.value.c_guru_id,
      c_nip: form.value.c_nip,
      c_nama: form.value.c_nama,
      c_jk: form.value.c_jk,
      c_agama: form.value.c_agama,
      d_tgl_lahir: form.value.d_tgl_lahir,
      j_mapel_id: form.value.j_mapel_id,
      c_alamat: form.value.c_alamat,
      c_kota: form.value.c_kota,
      b_aktif: !!form.value.b_aktif,
    }

    if (isEdit.value) {
      await pb.collection('tb_mst_guru').update(form.value.id, payload)
      $q.notify({ type: 'positive', message: 'Data berhasil diupdate!' })
    } else {
      await pb.collection('tb_mst_guru').create(payload)
      $q.notify({ type: 'positive', message: 'Data berhasil ditambahkan!' })
    }

    tutupForm()
    // Refresh tabel (menggunakan state pagination terkini)
    onRequest({ pagination: pagination.value, filter: filter.value })
  } catch (error) {
    console.error('Proses simpan gagal:', error)

    // --- PANGGIL FUNGSI GLOBAL DI SINI ---
    // Kita berikan custom message khusus untuk c_guru_id agar bahasanya lebih "manusiawi"
    handlePBError(error, {
      c_guru_id: {
        validation_not_unique: `Gagal! ID Guru "${form.value.c_guru_id}" sudah ada di database.`,
      },
      c_nip: {
        validation_not_unique: `Gagal! NIP "${form.value.c_nip}" sudah ada di database.`,
      },
    })
  }
}

const hapusData = (id, namaGuru) => {
  $q.dialog({
    title: 'Konfirmasi',
    message: `Yakin ingin menghapus guru <strong>${namaGuru}</strong>?`,
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await pb.collection('tb_mst_guru').delete(id)
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
    c_guru_id: '',
    c_nip: '',
    c_nama: '',
    c_jk: '',
    c_agama: '',
    d_tgl_lahir: '',
    j_mapel_id: [],
    c_alamat: '',
    c_kota: '',
    b_aktif: true,
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
    c_guru_id: item.c_guru_id,
    c_nip: item.c_nip,
    c_nama: item.c_nama,
    c_jk: item.c_jk,
    c_agama: item.c_agama,
    d_tgl_lahir: tanggalFormatted,
    j_mapel_id: item.j_mapel_id || [],
    c_alamat: item.c_alamat,
    c_kota: item.c_kota,
    b_aktif: !!item.b_aktif,
  }
  showForm.value = true
}

const tutupForm = () => {
  showForm.value = false
}

// Lifecycle Hooks
onMounted(async () => {
  await loadDropdowns()
  // Trigger fetch pertama kali dengan memanggil onRequest secara manual
  onRequest({ pagination: pagination.value, filter: filter.value })
})
</script>

<template>
  <!-- <q-page padding> -->
  <q-page class="q-pa-sm">
    <q-card v-if="!showForm" flat bordered>
      <q-table
        title="Data Guru"
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
            placeholder="Cari Nama / NIP..."
            label="Cari Nama / NIP..."
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

          <!--
          <q-btn
            color="secondary"
            icon="refresh"
            @click="onRequest({ pagination, filter })"
            round
            dense
            unelevated
            title="Refresh Data"
          /> -->
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
        <template v-slot:body-cell-j_mapel_id="props">
          <q-td :props="props">
            {{ getTampilanMapel(props.row.j_mapel_id) }}
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

        <!--
        <template v-slot:body-cell-b_aktif="props">
          <q-td :props="props">
            <q-badge :color="props.row.b_aktif ? 'positive' : 'negative'">
              {{ props.row.b_aktif ? 'Aktiff' : 'Non-Aktif' }}
            </q-badge>
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
        <div class="text-h6">{{ isEdit ? 'Edit Data Guru' : 'Tambah Data Guru Baru' }}</div>
      </q-card-section>

      <q-card-section class="q-pa-sm">
        <q-form @submit.prevent="simpanData" class="q-gutter-y-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input v-model="form.c_guru_id" label="Kode Guru *" outlined dense required />
            </div>
            <div class="col-12 col-md-6">
              <q-input v-model="form.c_nip" label="NIP" outlined dense />
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
                v-model="form.j_mapel_id"
                :options="mapelOptions"
                option-value="value"
                option-label="label"
                label="Mata Pelajaran"
                emit-value
                map-options
                multiple
                use-chips
                clearable
                outlined
                dense
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input v-model="form.c_alamat" label="Alamat" outlined dense />
            </div>

            <div class="col-12 col-md-6">
              <q-input v-model="form.c_kota" label="Kota" outlined dense />
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

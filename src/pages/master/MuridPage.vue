<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { pb } from 'boot/pocketbase'
import { getAgamaLookup, getKelasLookup } from 'src/lib/utils'

const $q = useQuasar()

// State Data Table & UI
const rows = ref([])
const loading = ref(false)
const filter = ref('') // Untuk fitur Search
const showForm = ref(false)
const isEdit = ref(false)

// Options untuk Dropdown
const agamaOptions = ref([])
const kelasOptions = ref([])

// State Pagination & Sorting Server-Side
const pagination = ref({
  sortBy: 'c_murid_id',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0, // Akan diisi oleh totalItems dari PocketBase
})

// State Form
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
  b_aktif: false,
  c_kelas_id: '',
})

// ============================================
// KONFIGURASI KOLOM Q-TABLE
// ============================================
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no' },
  { name: 'c_murid_id', label: 'N I S N', align: 'left', field: 'c_murid_id', sortable: true },
  { name: 'c_nama', label: 'NAMA', align: 'left', field: 'c_nama', sortable: true },
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
  { name: 'c_kelas_id', label: 'KELAS', align: 'left', field: 'c_kelas_id' },
  {
    name: 'c_asal_sekolah_sd',
    label: 'ASAL SD',
    align: 'left',
    field: 'c_asal_sekolah_sd',
    sortable: true,
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
  const kelas = kelasOptions.value.find((k) => k.id_asli === idKelas)
  return kelas ? kelas.tampilan : idKelas
}

const loadDropdowns = async () => {
  try {
    const [agamaData, kelasData] = await Promise.all([getAgamaLookup(), getKelasLookup()])
    agamaOptions.value = agamaData
    kelasOptions.value = kelasData
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

    // 2. Setup Filter/Search (Pencarian NAMA, KODE)
    let filterString = ''
    if (filterValue) {
      filterString = `c_nama ~ "${filterValue}" || c_murid_id ~ "${filterValue}"`
    }

    // Hitung limit jika "All" (0) dipilih di table
    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage

    // 3. Ambil data dari PocketBase
    const result = await pb.collection('tb_mst_murid').getList(page, fetchLimit, {
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
    console.error('Gagal mengambil ', error)
    $q.notify({ type: 'negative', message: 'Gagal memuat data murid.' })
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
    // Refresh tabel (menggunakan state pagination terkini)
    onRequest({ pagination: pagination.value, filter: filter.value })
  } catch (error) {
    console.error('Gagal menyimpan:', error)
    $q.notify({ type: 'negative', message: 'Terjadi kesalahan saat menyimpan data.' })
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
// KONTROL FORM
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

// Lifecycle Hooks
onMounted(async () => {
  await loadDropdowns()
  // Trigger fetch pertama kali dengan memanggil onRequest secara manual
  onRequest({ pagination: pagination.value, filter: filter.value })
})
</script>

<template>
  <q-page class="q-pa-md">
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

        <template v-slot:body-cell-c_kelas_id="props">
          <q-td :props="props">
            {{ getTampilanKelas(props.row.c_kelas_id) }}
          </q-td>
        </template>

        <template v-slot:body-cell-b_pindahan="props">
          <q-td :props="props">
            <q-badge :color="props.row.b_pindahan ? 'warning' : 'grey'">
              {{ props.row.b_pindahan ? 'Ya' : 'Tidak' }}
            </q-badge>
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
        <div class="text-h6">{{ isEdit ? 'Edit Data Murid' : 'Tambah Data Murid Baru' }}</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="simpanData" class="q-gutter-md">
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
                option-value="id_asli"
                option-label="tampilan"
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

              <!-- <q-toggle v-model="form.b_pindahan" label="Pindahan" color="orange" /> -->

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
              <!-- <q-toggle v-model="form.b_aktif" label="Status Aktif" color="green" /> -->
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

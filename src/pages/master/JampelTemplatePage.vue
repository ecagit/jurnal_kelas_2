<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { pb } from 'boot/pocketbase'
import { SET_HARI } from 'src/lib/constants'
import { getJamtemplateLookup, getKelasLookup } from 'src/lib/utils'
//import {  } from 'src/lib/utils'

const $q = useQuasar()

// State Data Table & UI
const rows = ref([])
const loading = ref(false)
const filter = ref('') // Untuk fitur Search
const showForm = ref(false)
const isEdit = ref(false)

// Options untuk Dropdown
const jamOptions = ref([])
const kelasOptions = ref([])

// State Pagination & Sorting Server-Side
const pagination = ref({
  sortBy: 'c_name',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0, // Akan diisi oleh totalItems dari PocketBase
})

// State Form
const form = ref({
  id: '',
  c_name: '',
  j_hari_id: [],
  j_jampel: [],
  j_kelas_id: [],
  c_keterangan: '',
})

// ============================================
// KONFIGURASI KOLOM Q-TABLE
// ============================================
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no', style: 'vertical-align: top;' },
  {
    name: 'c_name',
    label: 'NAMA TEMPLATE',
    align: 'left',
    field: 'c_name',
    style: 'vertical-align: top;',

    sortable: true,
  },
  {
    name: 'j_hari_id',
    label: 'HARI',
    align: 'left',
    field: 'j_hari_id',
    style: 'vertical-align: top;',
  },
  {
    name: 'j_jampel',
    label: 'JAM PEL',
    align: 'left',
    field: 'j_jampel',
    style: 'vertical-align: top;',
  },
  {
    name: 'j_kelas_id',
    label: 'KELAS',
    align: 'left',
    field: 'j_kelas_id',
    style: 'vertical-align: top;',
  },
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
// FUNGSI UTILITAS
// ============================================
const getTampilanHari = (hariArray) => {
  if (!hariArray || !hariArray.length) return '-'
  return hariArray
    .map((h) => {
      const found = SET_HARI.find((opt) => opt.value === h)
      return found ? found.label : h
    })
    .join(', ')
}

const getTampilanJam = (jamArray) => {
  if (!jamArray || !jamArray.length) return '-'
  return jamArray
    .map((j) => {
      const found = jamOptions.value.find((opt) => opt.id_asli === j)
      return found ? found.tampilan : j
    })
    .join(', ')
}

// Fungsi untuk menghapus duplikat berdasarkan id_asli
const deduplicateOptions = (dataArray) => {
  if (!Array.isArray(dataArray) || dataArray.length === 0) return []
  const seen = new Set()
  return dataArray.filter((item) => {
    const key = item.id_asli
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const loadDropdowns = async () => {
  try {
    const [jamtemplateData, kelasData] = await Promise.all([
      getJamtemplateLookup(),
      getKelasLookup(),
    ])
    jamOptions.value = jamtemplateData
    kelasOptions.value = deduplicateOptions(kelasData) //kelasData
    //console.log('Cek Data Kelas:', kelasData) // Lihat di Console F12 apakah ada property c_bidang_id
  } catch (error) {
    console.error('Gagal memuat opsi jam dropdown:', error)
  }
}
//deduplicateOptions(kelasData)

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

    // 2. Setup Filter/Search
    let filterString = ''
    if (filterValue) {
      filterString = `c_name ~ "${filterValue}" || c_keterangan ~ "${filterValue}"`
    }

    // Hitung limit jika "All" (0) dipilih di table
    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage

    // 3. Ambil data dari PocketBase
    const result = await pb.collection('tb_mst_jampel_template').getList(page, fetchLimit, {
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
    $q.notify({ type: 'negative', message: 'Gagal memuat data template jam.' })
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
      c_name: form.value.c_name,
      j_hari_id: form.value.j_hari_id,
      j_jampel: form.value.j_jampel,
      j_kelas_id: form.value.j_kelas_id,
      c_keterangan: form.value.c_keterangan,
    }

    if (isEdit.value) {
      await pb.collection('tb_mst_jampel_template').update(form.value.id, payload)
      $q.notify({ type: 'positive', message: 'Data berhasil diupdate!' })
    } else {
      await pb.collection('tb_mst_jampel_template').create(payload)
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

const hapusData = (id, nama) => {
  $q.dialog({
    title: 'Konfirmasi',
    message: `Yakin ingin menghapus template <strong>${nama}</strong>?`,
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await pb.collection('tb_mst_jampel_template').delete(id)
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
    c_name: '',
    j_hari_id: [],
    j_jampel: [],
    j_kelas_id: [],
    c_keterangan: '',
  }
  showForm.value = true
}

const bukaFormEdit = (item) => {
  isEdit.value = true
  form.value = {
    id: item.id,
    c_name: item.c_name,
    j_hari_id: Array.isArray(item.j_hari_id) ? item.j_hari_id : [],
    j_jampel: Array.isArray(item.j_jampel) ? item.j_jampel : [],
    j_kelas_id: Array.isArray(item.j_kelas_id) ? item.j_kelas_id : [],
    c_keterangan: item.c_keterangan || '',
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
        title="Data Template Jam Pelajaran"
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
            placeholder="Cari Nama..."
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

        <template v-slot:body-cell-j_hari_id="props">
          <q-td :props="props">
            <div
              v-for="(hari, index) in String(getTampilanHari(props.row.j_hari_id)).split(',')"
              :key="index"
            >
              {{ hari.trim() }}
            </div>
          </q-td>
        </template>

        <!--
        <template v-slot:body-cell-j_hari_id="props">
          <q-td :props="props">
            {{ getTampilanHari(props.row.j_hari_id) }}
          </q-td>
        </template>
      -->

        <template v-slot:body-cell-j_jampel="props">
          <q-td :props="props">
            <div
              v-for="(jam, index) in String(getTampilanJam(props.row.j_jampel)).split(',')"
              :key="index"
            >
              {{ jam.trim() }}
            </div>
          </q-td>
        </template>

        <!--
        <template v-slot:body-cell-j_jampel="props">
          <q-td :props="props">
            {{ getTampilanJam(props.row.j_jampel) }}
          </q-td>
        </template>
      -->
        <template v-slot:body-cell-j_kelas_id="props">
          <q-td :props="props">
            <template v-if="Array.isArray(props.row.j_kelas_id) && props.row.j_kelas_id.length > 0">
              <div v-for="(kId, index) in props.row.j_kelas_id" :key="index" class="q-py-xs">
                {{ kelasOptions.find((opt) => opt.id_asli === kId)?.tampilan || kId }}
              </div>
            </template>
            <template v-else>
              {{ props.row.j_kelas_id || '-' }}
            </template>
          </q-td>
        </template>
        <!--
        <template v-slot:body-cell-j_kelas_id="props">
          <q-td :props="props">
            <template v-if="Array.isArray(props.row.j_kelas_id)">
              {{
                props.row.j_kelas_id
                  .map((kId) => {
                    const found = kelasOptions.find((opt) => opt.id_asli === kId)
                    return found ? found.tampilan : kId
                  })
                  .join(', ') || '-'
              }}
            </template>
            <template v-else>
              {{ props.row.j_kelas_id || '-' }}
            </template>
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
              @click="hapusData(props.row.id, props.row.c_name)"
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
          {{ isEdit ? 'Edit Data Template Jam' : 'Tambah Data Template Jam Baru' }}
        </div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="simpanData" class="q-gutter-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input v-model="form.c_name" label="Nama Template *" outlined dense required />
            </div>

            <div class="col-12 col-md-6">
              <q-select
                v-model="form.j_hari_id"
                :options="SET_HARI"
                option-label="label"
                option-value="value"
                label="Hari"
                emit-value
                map-options
                multiple
                use-chips
                outlined
                dense
              />
            </div>

            <div class="col-12 col-md-6">
              <q-select
                v-model="form.j_jampel"
                :options="jamOptions"
                option-value="id_asli"
                option-label="tampilan"
                label="Jam Pelajaran"
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
              <q-select
                v-model="form.j_kelas_id"
                :options="kelasOptions"
                option-value="id_asli"
                option-label="tampilan"
                label="Kelas"
                emit-value
                map-options
                multiple
                use-chips
                outlined
                dense
                clearable
              />
            </div>

            <div class="col-12">
              <q-input
                v-model="form.c_keterangan"
                label="Keterangan"
                outlined
                dense
                type="textarea"
                rows="3"
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

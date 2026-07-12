<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { pb } from 'boot/pocketbase'
import { SET_HARI } from 'src/lib/constants'
//import { getKelasLookup, getGuruLookup, getJamtemplateLookup } from 'src/lib/utils'
import { getGuruLookup, getJamtemplateLookup } from 'src/lib/utils'
import { useAuthStore } from 'stores/authStore'

// Import Store Periode dan Filter
import { usePeriodeStore } from 'src/stores/periode'
import { useFilterStore } from 'src/stores/filter'
import { storeToRefs } from 'pinia'

const $q = useQuasar()
const auth = useAuthStore()

// Inisialisasi Store
const periodeStore = usePeriodeStore()
const { activePeriodeId } = storeToRefs(periodeStore)
const { activePeriodeLabel } = storeToRefs(periodeStore)
const filterStore = useFilterStore()

// Menggunakan filterKelas dan filterHari dari store
const { filterKelas } = storeToRefs(filterStore)
const { filterHari } = storeToRefs(filterStore)

// State Data Table & UI
const rows = ref([])
const loading = ref(false)
const showForm = ref(false)
const isEdit = ref(false)

// Options untuk Dropdown
const kelasOptions = ref([])
const guruOptions = ref([])
const jamOptions = ref([])

const filteredKelasOptions = ref([])
const filteredHariOptions = ref([])

// State Pagination & Sorting Server-Side
const pagination = ref({
  sortBy: 'n_hari_id',
  descending: false,
  page: 1,
  rowsPerPage: 20,
  rowsNumber: 0,
})

// State Form (Ditambahkan b_aktif dan b_add)
const form = ref({
  id: '',
  c_periode: '',
  c_kelas_id: '',
  n_hari_id: '',
  c_guru_id: '',
  c_jam_id: '',
  c_jad_str: '',
  n_jad_dur: '',
  c_jad_end: '',
  b_aktif: true,
  b_add: false,
  c_keterangan: '',
})

// Daftar kolom aktif (Ditambahkan b_aktif dan b_add)
const kolomAktif = ref([
  'no',
  'c_jam_id',
  'c_guru_id',
  'c_jad_str',
  'c_jad_end',
  'n_jad_dur',
  'b_utama', // <-- Tambahkan di sini
  'b_aktif',
  'b_add',
  'c_keterangan',
  'actions',
])

// ============================================
// KONFIGURASI KOLOM Q-TABLE
// ============================================
const columns = [
  {
    name: 'no',
    label: 'NO',
    align: 'center',
    field: 'no',
    style: 'width: 30px; vertical-align: top;',
  },
  {
    name: 'c_periode',
    label: 'PERIODE',
    align: 'left',
    field: 'c_periode',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'c_kelas_id',
    label: 'KELAS',
    align: 'left',
    field: 'c_kelas_id',
    style: 'vertical-align: top;',
    classes: 'kolom-wrap',
    sortable: true,
  },
  {
    name: 'n_hari_id',
    label: 'HARI',
    align: 'center',
    field: 'n_hari_id',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'c_jam_id',
    label: 'JAM',
    align: 'left',
    field: 'c_jam_id',
    sortable: true,
    style: 'width: 30px; vertical-align: top;',
  },
  {
    name: 'c_guru_id',
    label: 'GURU',
    align: 'left',
    field: 'c_guru_id',
    classes: 'kolom-wrap',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'c_jad_str',
    label: 'MULAI',
    align: 'center',
    field: 'c_jad_str',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'n_jad_dur',
    label: 'DURASI',
    align: 'center',
    field: 'n_jad_dur',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'c_jad_end',
    label: 'JAM SELESAI',
    align: 'center',
    field: 'c_jad_end',
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
    name: 'b_add',
    label: 'JAM +',
    align: 'center',
    field: 'b_add',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'b_utama',
    label: 'UTAMA',
    align: 'center',
    field: 'b_utama',
    sortable: true,
    style: 'vertical-align: top;',
  },

  {
    name: 'c_keterangan',
    label: 'KETERANGAN',
    align: 'left',
    field: 'c_keterangan',
    classes: 'kolom-wrap',
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
// FUNGSI UTILITAS & LOOKUP
// ============================================
const getKelasNama = (id) => {
  if (!id) return '-'
  const found = kelasOptions.value.find((opt) => opt.value === id)
  return found ? found.label : id
}

const getGuruNama = (id) => {
  if (!id) return '-'
  const found = guruOptions.value.find((opt) => opt.value === id)
  return found ? found.label : id
}

const getJamNama = (id) => {
  if (!id) return '-'
  const found = jamOptions.value.find((opt) => opt.value === id)
  return found ? found.label : id
}

const getHariLabel = (val) => {
  if (val === null || val === undefined || val === '') return '-'
  const found = SET_HARI.find((opt) => opt.value == val)
  return found ? found.label : val
}

const loadDropdowns = async () => {
  try {
    //const [kelasList, guruList, jamList] = await Promise.all([
    const [guruList, jamList] = await Promise.all([
      //getKelasLookup(),
      getGuruLookup(),
      getJamtemplateLookup(),
    ])
    kelasOptions.value = await auth.getKelasLookup()
    filteredKelasOptions.value = [...kelasOptions.value]

    // 4. Auto-select otomatis jika user HANYA punya hak akses 1 kelas
    if (kelasOptions.value.length === 1) {
      filterKelas.value = kelasOptions.value[0].value
    }

    // Simpan data master
    guruOptions.value = guruList
    //kelasOptions.value = kelasList
    jamOptions.value = jamList

    // Inisialisasi data filter (agar saat dropdown diklik pertama kali, list tidak kosong)
    //filteredKelasOptions.value = [...kelasList]
    filteredHariOptions.value = [...SET_HARI]
    //filteredGuruOptions.value = [...guruList]
  } catch (error) {
    console.error('Gagal memuat opsi dropdown:', error)
  }
}

// Fungsi filter untuk dropdown Kelas
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

// Fungsi filter untuk dropdown Hari
const filterHariFn = (val, update) => {
  if (val === '') {
    update(() => {
      filteredHariOptions.value = SET_HARI
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    filteredHariOptions.value = SET_HARI.filter((v) => v.label.toLowerCase().indexOf(needle) > -1)
  })
}

/*
const loadDropdowns = async () => {
  try {
    const [kelasList, guruList, jamList] = await Promise.all([
      getKelasLookup(),
      getGuruLookup(),
      getJamtemplateLookup(),
    ])
    guruOptions.value = guruList
    kelasOptions.value = kelasList
    jamOptions.value = jamList
  } catch (error) {
    console.error('Gagal memuat opsi dropdown:', error)
  }
}
*/
// ============================================
// AUTOFILL JADWAL
// ============================================
const autoFillJadwal = async (selectedJamId) => {
  if (isEdit.value) return
  if (!form.value.c_periode || !form.value.c_kelas_id || !form.value.n_hari_id || !selectedJamId)
    return

  try {
    const existingJadwal = await pb
      .collection('tb_mst_jadwal')
      .getFirstListItem(
        `c_periode = "${form.value.c_periode}" && c_kelas_id = "${form.value.c_kelas_id}" && n_hari_id = "${form.value.n_hari_id}" && c_jam_id = "${selectedJamId}"`,
      )

    if (existingJadwal) {
      form.value.c_jad_str = existingJadwal.c_jad_str || ''
      form.value.n_jad_dur = existingJadwal.n_jad_dur ?? ''
      form.value.c_jad_end = existingJadwal.c_jad_end || ''
      // Autofill boolean fields if data exists
      form.value.b_aktif = existingJadwal.b_aktif ?? true
      form.value.b_add = existingJadwal.b_add ?? false

      $q.notify({
        type: 'info',
        message: `Data jam diisi otomatis dari jadwal yang sudah ada.`,
        position: 'top',
        timeout: 2000,
      })
    }
  } catch (error) {
    if (error.status !== 404) console.error('Gagal mengambil data jadwal untuk autofill:', error)
  }
}

// ============================================
// FUNGSI FETCH DATA TABEL
// ============================================
const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  loading.value = true

  try {
    if (!filterKelas.value || !filterHari.value) {
      rows.value = []
      pagination.value.rowsNumber = 0
      loading.value = false
      return
    }

    let sortString = sortBy ? (descending ? `-${sortBy}` : `+${sortBy}`) : ''
    const filters = []

    if (activePeriodeId.value) filters.push(`c_periode = "${activePeriodeId.value}"`)
    filters.push(`c_kelas_id = "${String(filterKelas.value).trim()}"`)
    filters.push(`n_hari_id = "${filterHari.value}"`)

    let filterString = filters.join(' && ')
    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage

    const result = await pb.collection('tb_mst_jadwal').getList(page, fetchLimit, {
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
    if (!error.isAbort) {
      console.error('Gagal mengambil data:', error)
      $q.notify({ type: 'negative', message: 'Koneksi ke server bermasalah' })
    }
  } finally {
    loading.value = false
  }
}

const onFilterKelasChange = (val) => {
  filterKelas.value = val
  pagination.value.page = 1
  onRequest({ pagination: pagination.value })
}

const onFilterHariChange = (val) => {
  filterHari.value = val
  pagination.value.page = 1
  onRequest({ pagination: pagination.value })
}

// ============================================
// ALGORITMA GENERATE JADWAL
// ============================================
const confirmGenerate = () => {
  if (!filterKelas.value) {
    $q.notify({ type: 'warning', message: 'Silahkan pilih kelas pada filter terlebih dahulu!' })
    return
  }
  if (!activePeriodeId.value) {
    $q.notify({
      type: 'warning',
      message: 'Periode aktif belum terdeteksi. Pastikan Periode sudah diset.',
    })
    return
  }

  const namaKelas = getKelasNama(filterKelas.value)

  $q.dialog({
    title: 'Konfirmasi Buat Jam Pelajaran',
    message: `Yakin ingin membuat jam pelajaran untuk kelas <strong>${namaKelas}</strong> pada periode <strong>${activePeriodeLabel.value}</strong>?`,
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    genJampelKelas(activePeriodeId.value, filterKelas.value)
  })
}

const genJampelKelas = async (periode, kelasId) => {
  try {
    loading.value = true

    const templates = await pb.collection('tb_mst_jampel_template').getFullList({
      filter: `j_kelas_id ~ "${kelasId}" && b_aktif = true`,
    })

    const dataset = []

    for (let hariId = 1; hariId <= 7; hariId++) {
      const tpl = templates.find((t) => {
        if (!t.j_hari_id) return false
        const hariArray = Array.isArray(t.j_hari_id) ? t.j_hari_id : [t.j_hari_id]
        return hariArray.map(String).includes(String(hariId))
      })

      if (tpl && tpl.j_jampel_2 && Array.isArray(tpl.j_jampel_2)) {
        for (let n = 0; n < tpl.j_jampel_2.length; n++) {
          const jamItem = tpl.j_jampel_2[n]

          dataset.push({
            c_periode: periode.trim(),
            c_kelas_id: kelasId.trim(),
            n_hari_id: hariId,
            c_jam_id: jamItem.id.trim(),
            c_jad_str: jamItem.mulai,
            n_jad_dur: Number(jamItem.durasi),
            c_jad_end: jamItem.akhir,
            b_aktif: true, // Generate selalu aktif
            b_add: false, // Generate bukan tambahan
            b_utama: jamItem.utama ?? false, // <-- Menambahkan data b_utama dari JSON
          })
        }
      }
    }
    //console.table(dataset)
    if (dataset.length === 0) {
      loading.value = false
      $q.notify({
        type: 'warning',
        message: 'Tidak ditemukan template jam yang aktif untuk kelas ini.',
      })
      return
    }

    await InsertUpdateJadwal(periode, kelasId, dataset)
  } catch (error) {
    console.error('Error saat generate:', error)
    loading.value = false
    $q.notify({ type: 'negative', message: 'Gagal memproses dataset.' })
  }
}

const InsertUpdateJadwal = async (periode, kelasId, dataset) => {
  try {
    const existingJadwal = await pb.collection('tb_mst_jadwal').getFullList({
      filter: `c_periode = "${periode}" && c_kelas_id = "${kelasId}"`,
    })

    const mapJadwalExists = {}
    existingJadwal.forEach((row) => {
      const key = `${row.n_hari_id}_${row.c_jam_id}`
      mapJadwalExists[key] = row
    })

    for (const data of dataset) {
      const key = `${data.n_hari_id}_${data.c_jam_id}`
      const existingRecord = mapJadwalExists[key]

      if (existingRecord) {
        await pb.collection('tb_mst_jadwal').update(existingRecord.id, {
          c_jad_str: data.c_jad_str,
          n_jad_dur: data.n_jad_dur,
          c_jad_end: data.c_jad_end,
          b_aktif: data.b_aktif,
          b_add: data.b_add,
          b_utama: data.b_utama, // <-- Memastikan b_utama ikut di-update
          c_keterangan: data.c_keterangan,
        })
      } else {
        await pb.collection('tb_mst_jadwal').create(data)
      }
    }

    loading.value = false
    $q.notify({ type: 'positive', message: 'Generate Jam Pelajaran Berhasil!' })
    onRequest({ pagination: pagination.value })
  } catch (error) {
    console.error('Error InsertUpdate:', error)
    loading.value = false
    $q.notify({ type: 'negative', message: 'Gagal menyimpan data ke server.' })
  }
}

// ============================================
// FUNGSI CRUD
// ============================================
const simpanData = async () => {
  try {
    const payload = {
      c_periode: form.value.c_periode,
      c_kelas_id: form.value.c_kelas_id,
      n_hari_id: form.value.n_hari_id,
      c_guru_id: form.value.c_guru_id,
      c_jam_id: form.value.c_jam_id,
      c_jad_str: form.value.c_jad_str,
      n_jad_dur: form.value.n_jad_dur ? Number(form.value.n_jad_dur) : null,
      c_jad_end: form.value.c_jad_end,
      b_aktif: form.value.b_aktif, // Simpan status aktif
      b_add: form.value.b_add, // Simpan status tambahan
      c_keterangan: form.value.c_keterangan,
    }

    if (isEdit.value) {
      await pb.collection('tb_mst_jadwal').update(form.value.id, payload)
      $q.notify({ type: 'positive', message: 'Data berhasil diupdate!' })
    } else {
      await pb.collection('tb_mst_jadwal').create(payload)
      $q.notify({ type: 'positive', message: 'Data berhasil ditambahkan!' })
    }

    tutupForm()
    onRequest({ pagination: pagination.value })
  } catch (error) {
    console.error('Gagal menyimpan:', error)
    $q.notify({ type: 'negative', message: 'Terjadi kesalahan saat menyimpan data.' })
  }
}

const hapusData = (id) => {
  $q.dialog({
    title: 'Konfirmasi',
    message: `Yakin ingin menghapus jadwal ini?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await pb.collection('tb_mst_jadwal').delete(id)
      $q.notify({ type: 'positive', message: 'Data berhasil dihapus!' })
      onRequest({ pagination: pagination.value })
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
    c_periode: activePeriodeId.value || '',
    c_kelas_id: filterKelas.value || '',
    n_hari_id: filterHari.value ? Number(filterHari.value) : '',
    c_guru_id: '',
    c_jam_id: '',
    c_jad_str: '',
    n_jad_dur: '',
    c_jad_end: '',
    b_aktif: true, // Default aktif saat penambahan
    b_add: false, // Default bukan jam tambahan
    c_keterangan: '',
  }
  showForm.value = true
}

const bukaFormEdit = (item) => {
  isEdit.value = true
  form.value = {
    id: item.id,
    c_periode: item.c_periode || '',
    c_kelas_id: item.c_kelas_id || '',
    n_hari_id: item.n_hari_id ? Number(item.n_hari_id) : '',
    c_guru_id: item.c_guru_id || '',
    c_jam_id: item.c_jam_id || '',
    c_jad_str: item.c_jad_str || '',
    n_jad_dur: item.n_jad_dur ?? '',
    c_jad_end: item.c_jad_end || '',
    b_aktif: item.b_aktif ?? true, // Ambil data DB
    b_add: item.b_add ?? false, // Ambil data DB
    c_keterangan: item.c_keterangan || '',
  }
  showForm.value = true
}

const tutupForm = () => {
  showForm.value = false
}

onMounted(async () => {
  await loadDropdowns()
  if (filterKelas.value) {
    onRequest({ pagination: pagination.value })
  }
})
</script>

<template>
  <q-page class="q-pa-sm">
    <q-card v-if="!showForm" flat bordered>
      <q-table
        title="Data Jadwal"
        :rows="rows"
        :columns="columns"
        :visible-columns="kolomAktif"
        row-key="id"
        v-model:pagination="pagination"
        :loading="loading"
        @request="onRequest"
        flat
        bordered
        dense
        separator="cell"
        binary-state-sort
        no-data-label="Silahkan pilih kelas untuk menampilkan data"
        no-results-label="Tidak ada data untuk kelas ini"
        class="my-zebra-table"
      >
        <template v-slot:top-left>
          <div class="row items-center q-gutter-sm">
            <div class="text-h6 q-mr-md">Data Jadwal</div>

            <!-- Filter Kelas -->

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
                <q-item>
                  <q-item-section class="text-grey">Tidak ada hasil</q-item-section>
                </q-item>
              </template>
              <template v-slot:prepend>
                <q-icon name="class" color="primary" />
              </template>
            </q-select>

            <!--
            <q-select
              v-model="filterKelas"
              :options="kelasOptions"
              option-label="label"
              option-value="value"
              label="Pilih Kelas"
              emit-value
              map-options
              outlined
              clearable
              dense
              style="min-width: 200px; background: #f1f5f9; border-radius: 4px"
              class="q-mr-sm"
              @update:model-value="onFilterKelasChange"
            >
              <template v-slot:prepend>
                <q-icon name="class" color="primary" />
              </template>
            </q-select>
            -->
          </div>
        </template>

        <template v-slot:top-right>
          <div class="row items-center q-gutter-sm">
            <q-select
              v-model="filterHari"
              :options="filteredHariOptions"
              option-label="label"
              option-value="value"
              label="Filter Hari (Opsional)"
              emit-value
              map-options
              outlined
              clearable
              dense
              use-input
              input-debounce="300"
              @filter="filterHariFn"
              @update:model-value="onFilterHariChange"
              style="min-width: 200px; background: #f1f5f9; border-radius: 4px"
            >
              <template v-slot:prepend>
                <q-icon name="event" color="primary" />
              </template>
            </q-select>

            <q-btn
              color="primary"
              icon="add"
              label="Tambah"
              @click="bukaFormTambah"
              class="q-mr-sm"
              unelevated
            />
            <q-btn round color="teal" icon="refresh" @click="onRequest({ pagination })" unelevated>
              <q-tooltip>Refresh Data</q-tooltip>
            </q-btn>
          </div>
        </template>

        <template v-slot:body-cell-no="props">
          <q-td :props="props" class="text-center">
            {{ props.rowIndex + 1 }}
          </q-td>
        </template>

        <template v-slot:body-cell-c_periode="props">
          <q-td :props="props">{{ props.row.c_periode || '-' }}</q-td>
        </template>

        <template v-slot:body-cell-c_kelas_id="props">
          <q-td :props="props">{{ getKelasNama(props.row.c_kelas_id) }}</q-td>
        </template>

        <template v-slot:body-cell-n_hari_id="props">
          <q-td :props="props" class="text-center">{{ getHariLabel(props.row.n_hari_id) }}</q-td>
        </template>

        <template v-slot:body-cell-c_guru_id="props">
          <q-td :props="props">{{ getGuruNama(props.row.c_guru_id) }}</q-td>
        </template>

        <template v-slot:body-cell-c_jam_id="props">
          <q-td :props="props">{{ getJamNama(props.row.c_jam_id) }}</q-td>
        </template>

        <template v-slot:body-cell-c_jad_str="props">
          <q-td :props="props">{{ props.row.c_jad_str || '-' }}</q-td>
        </template>

        <template v-slot:body-cell-n_jad_dur="props">
          <q-td :props="props" class="text-center">{{ props.row.n_jad_dur || '-' }}</q-td>
        </template>

        <template v-slot:body-cell-c_jad_end="props">
          <q-td :props="props">{{ props.row.c_jad_end || '-' }}</q-td>
        </template>

        <template v-slot:body-cell-b_utama="props">
          <q-td :props="props" class="text-center">
            <q-chip
              :color="props.row.b_utama ? 'primary' : 'grey-5'"
              text-color="white"
              dense
              icon="star"
              size="sm"
            >
              {{ props.row.b_utama ? 'Ya' : 'Tdk' }}
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
              {{ props.row.b_aktif ? 'Ya' : 'Tdk' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-b_add="props">
          <q-td :props="props" class="text-center">
            <q-chip
              :color="props.row.b_add ? 'orange' : 'grey-5'"
              text-color="white"
              dense
              icon="check"
              size="sm"
            >
              {{ props.row.b_add ? 'Ya' : 'Tdk' }}
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
              @click="hapusData(props.row.id)"
              title="Hapus"
            />
          </q-td>
        </template>
      </q-table>

      <div class="row justify-end q-pa-md">
        <q-btn
          color="indigo-7"
          label="Buat Jam Pelajaran"
          icon="auto_awesome"
          @click="confirmGenerate"
          size="md"
          unelevated
        />
      </div>
    </q-card>

    <q-card v-else flat bordered>
      <q-card-section class="row items-center q-pb-none">
        <q-btn flat round dense icon="arrow_back" @click="tutupForm" class="q-mr-sm" />
        <div class="text-h6">
          {{ isEdit ? 'Edit Data Jadwal' : 'Tambah Data Jadwal Baru' }}
        </div>
      </q-card-section>

      <q-card-section class="q-pa-sm">
        <q-form @submit.prevent="simpanData" class="q-gutter-y-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input v-model="form.c_periode" label="Periode *" outlined dense required disable />
            </div>

            <div class="col-12 col-md-6">
              <q-select
                v-model="form.c_kelas_id"
                :options="kelasOptions"
                option-label="label"
                option-value="value"
                label="Kelas *"
                emit-value
                map-options
                outlined
                dense
                required
              />
            </div>

            <div class="col-12 col-md-6">
              <q-select
                v-model="form.n_hari_id"
                :options="SET_HARI"
                option-label="label"
                option-value="value"
                label="Hari *"
                emit-value
                map-options
                outlined
                dense
                required
              />
            </div>

            <div class="col-12 col-md-6">
              <q-select
                v-model="form.c_guru_id"
                :options="guruOptions"
                option-label="label"
                option-value="value"
                label="Guru"
                emit-value
                map-options
                outlined
                dense
                clearable
              />
            </div>

            <div class="col-12 col-md-6">
              <q-select
                v-model="form.c_jam_id"
                :options="jamOptions"
                option-label="label"
                option-value="value"
                label="Jam Satuan"
                emit-value
                map-options
                outlined
                dense
                clearable
                @update:model-value="autoFillJadwal"
              />
            </div>

            <div class="col-12 col-md-4">
              <q-input
                v-model="form.c_jad_str"
                label="Jam Mulai"
                outlined
                dense
                mask="##:##"
                fill-mask
                hint="HH:MM"
              />
            </div>

            <div class="col-12 col-md-4">
              <q-input
                v-model="form.n_jad_dur"
                label="Durasi (menit)"
                outlined
                dense
                type="number"
                :min="0"
              />
            </div>

            <div class="col-12 col-md-4">
              <q-input
                v-model="form.c_jad_end"
                label="Jam Selesai"
                outlined
                dense
                mask="##:##"
                fill-mask
                hint="HH:MM"
              />
            </div>

            <div class="col-12 col-md-6 flex items-center">
              <q-toggle
                v-model="form.b_aktif"
                label="Jadwal Aktif"
                color="positive"
                icon="check"
                unchecked-icon="clear"
              />
            </div>
            <div class="col-12 col-md-6 flex items-center">
              <q-toggle
                v-model="form.b_add"
                label="Jam Tambahan"
                color="orange"
                icon="check"
                unchecked-icon="clear"
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

<template>
  <q-page class="q-pa-sm">
    <!-- Filter section -->
    <div class="row q-col-gutter-sm items-center q-mb-md no-print">
      <div class="text-h6 q-mr-md">Laporan Kehadiran Murid</div>
      <div class="col-12 col-sm-3 col-md-2">
        <q-input v-model="filterDateStart" type="date" label="Tgl Mulai" dense outlined />
      </div>
      <div class="col-12 col-sm-3 col-md-2">
        <q-input v-model="filterDateEnd" type="date" label="Tgl Akhir" dense outlined />
      </div>
      <div class="col-12 col-sm-3 col-md-3">
        <q-select
          v-model="filterKelas"
          :options="filteredKelasOptions"
          label="Filter Kelas"
          dense
          outlined
          emit-value
          map-options
          clearable
          use-input
          input-debounce="300"
          @filter="filterKelasFn"
          @update:model-value="cariData"
        />
      </div>
      <div class="col-12 col-md-auto row q-gutter-xs">
        <q-btn color="primary" icon="search" label="Cari" dense @click="cariData" />
        <q-btn
          color="negative"
          icon="print"
          label="PDF/Cetak"
          dense
          @click="cetakLaporan"
          :disable="rows.length === 0"
        />
      </div>
    </div>

    <!-- Header cetak -->
    <div class="print-only q-mb-md">
      <div class="text-h5 text-center text-weight-bold">LAPORAN KEHADIRAN MURID</div>
      <div class="text-subtitle1 text-center">
        Periode: {{ filterDateStart }} s/d {{ filterDateEnd }}
        <span v-if="filterKelas"> | Kelas: {{ getKelasNama(filterKelas) }}</span>
      </div>
      <hr />
    </div>

    <!-- Tabel data dengan default header -->
    <q-table
      v-model:pagination="pagination"
      :rows="rows"
      :columns="columns"
      :visible-columns="visibleColumns"
      :loading="loading"
      row-key="id"
      separator="cell"
      outlined
      bordered
      flat
      square
      class="report-table"
      @request="onRequest"
      :rows-per-page-options="[20, 50, 100, 0]"
    >
      <!-- Nomor urut -->
      <template v-slot:body-cell-no="props">
        <q-td :props="props" class="text-center">{{ props.rowIndex + 1 }}</q-td>
      </template>

      <!-- Tanggal + Hari -->
      <template v-slot:body-cell-d_tanggal="props">
        <q-td :props="props">
          {{ getHariFromDate(props.row.d_tanggal) }},<br />
          <span class="text-caption">{{ formatTanggal(props.row.d_tanggal) }}</span>
        </q-td>
      </template>

      <!-- Nama kelas -->
      <template v-slot:body-cell-c_kelas_id="props">
        <q-td :props="props">{{ getKelasNama(props.row.c_kelas_id) }}</q-td>
      </template>

      <!-- Nama murid -->
      <template v-slot:body-cell-c_murid_id="props">
        <q-td :props="props" class="text-weight-bold">{{
          getMuridNama(props.row.c_murid_id)
        }}</q-td>
      </template>

      <!-- Status absen dengan badge -->
      <template v-slot:body-cell-c_status_absen="props">
        <q-td :props="props" class="text-center">
          <q-badge :color="getStatusColor(props.row.c_status_absen)" text-color="white">
            {{ getStatusLabel(props.row.c_status_absen) }}
          </q-badge>
        </q-td>
      </template>

      <!-- Terlambat -->
      <template v-slot:body-cell-d_lambat="props">
        <q-td :props="props" class="text-center">{{ props.row.d_lambat || '-' }}</q-td>
      </template>

      <!-- Kolom Libur -->
      <template v-slot:body-cell-is_libur="props">
        <q-td :props="props" class="text-center">
          <q-icon v-if="props.row.isLibur" name="check_circle" color="negative" size="sm" />
          <q-icon v-else name="cancel" color="grey" size="sm" />
        </q-td>
      </template>

      <!-- Keterangan -->
      <template v-slot:body-cell-c_keterangan="props">
        <q-td :props="props" style="white-space: normal; max-width: 250px">{{
          props.row.c_keterangan || '-'
        }}</q-td>
      </template>

      <template v-slot:no-data>
        <div class="full-width row flex-center q-pa-md text-grey-8">
          <q-icon name="warning" class="q-mr-sm" /> Tidak ada data kehadiran
        </div>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useQuasar, date } from 'quasar'
import { pb } from 'boot/pocketbase'
import { SET_HARI } from 'src/lib/constants' // Impor SET_HARI
import { useAuthStore } from 'stores/authStore'
import { usePeriodeStore } from 'src/stores/periode'
import { storeToRefs } from 'pinia'

const $q = useQuasar()
const auth = useAuthStore()
const periodeStore = usePeriodeStore()
const { activePeriodeId } = storeToRefs(periodeStore)

// Role check (opsional)
const isAdmin = computed(() => auth.activeRole === 'Admin' || auth.user?.role === 'Admin')

// State
const rows = ref([])
const loading = ref(false)
const filterKelas = ref(null)

// Rentang tanggal default: bulan berjalan
const timeStampNow = Date.now()
const nowDate = new Date(timeStampNow)
const startOfMonthDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1)
const endOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0)
const filterDateStart = ref(date.formatDate(startOfMonthDate, 'YYYY-MM-DD'))
const filterDateEnd = ref(date.formatDate(endOfMonth, 'YYYY-MM-DD'))

// Options dropdown
const kelasOptions = ref([])
const filteredKelasOptions = ref([])
const muridMap = ref(new Map())

// ============================================
// KONFIGURASI KOLOM Q-TABLE (tambah kolom libur)
// ============================================
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no', sortable: false, style: 'width: 30px' },
  {
    name: 'd_tanggal',
    label: 'TANGGAL',
    align: 'left',
    field: 'd_tanggal',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'c_kelas_id',
    label: 'KELAS',
    align: 'left',
    field: 'c_kelas_id',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'c_murid_id',
    label: 'NAMA MURID',
    align: 'left',
    field: 'c_murid_id',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'c_status_absen',
    label: 'STATUS',
    align: 'center',
    field: 'c_status_absen',
    sortable: true,
    style: 'width: 30px; vertical-align: top;',
  },
  {
    name: 'd_lambat',
    label: 'LAMBAT (menit)',
    align: 'center',
    field: 'd_lambat',
    sortable: false,
    style: 'width: 30px; vertical-align: top;',
  },
  {
    name: 'is_libur',
    label: 'LIBUR',
    align: 'center',
    field: 'is_libur',
    sortable: false,
    style: 'width: 40px;',
  },
  {
    name: 'c_keterangan',
    label: 'CATATAN',
    align: 'left',
    field: 'c_keterangan',
    sortable: false,
    style: 'vertical-align: top;',
  },
]

// Kolom yang akan ditampilkan
const visibleColumns = ref([
  'no',
  'd_tanggal',
  'c_kelas_id',
  'c_murid_id',
  'c_status_absen',
  'd_lambat',
  'is_libur',
  'c_keterangan',
])

// ============================================
// FUNGSI LOOKUP & KONVERSI HARI
// ============================================
const getMuridNama = (id) => {
  if (!id) return '-'
  const nama = muridMap.value.get(id)
  return nama || id
}

const getKelasNama = (id) => {
  const found = kelasOptions.value.find((o) => o.value === id)
  return found ? found.label : id
}

// 🔥 Konversi tanggal ke nama hari menggunakan SET_HARI
const getHariFromDate = (tgl) => {
  if (!tgl) return '-'
  let datePart = tgl
  if (tgl.includes('T')) datePart = tgl.split('T')[0]
  else if (tgl.includes(' ')) datePart = tgl.split(' ')[0]

  const dateObj = new Date(datePart)
  if (isNaN(dateObj.getTime())) return '-'

  const dayIndex = dateObj.getDay() // 0 = Minggu, 1 = Senin, ... 6 = Sabtu
  const found = SET_HARI.find((h) => h.value === dayIndex)
  return found ? found.label : '-'
}

const formatTanggal = (tgl) => {
  if (!tgl) return '-'
  const datePart = tgl.split(' ')[0]
  return date.formatDate(datePart, 'DD/MM/YYYY')
}

const getStatusLabel = (status) => {
  const map = { H: 'Hadir', I: 'Izin', S: 'Sakit', A: 'Alpa', L: 'Lambat' }
  return map[status] || status || '-'
}

const getStatusColor = (status) => {
  const map = { H: 'positive', I: 'info', S: 'warning', A: 'negative', L: 'orange' }
  return map[status] || 'grey'
}

// ============================================
// LOAD DROPDOWNS & MURID MAP
// ============================================
const loadMuridLookup = async () => {
  try {
    const muridRecords = await pb.collection('tb_mst_murid').getFullList({
      sort: 'c_nama',
      requestKey: null,
    })
    muridRecords.forEach((m) => {
      const kodeMurid = m.c_murid_id || m.c_emp_id || m.id
      const nama = m.c_nama || m.nama || 'Tidak diketahui'
      muridMap.value.set(kodeMurid, nama)
    })
  } catch (error) {
    console.error('Gagal memuat data murid:', error)
  }
}

const loadDropdowns = async () => {
  try {
    kelasOptions.value = await auth.getKelasLookup()
    filteredKelasOptions.value = [...kelasOptions.value]
    if (kelasOptions.value.length === 1) filterKelas.value = kelasOptions.value[0].value
    else if (!isAdmin.value && kelasOptions.value.length > 0)
      filterKelas.value = kelasOptions.value[0].value
    await loadMuridLookup()
  } catch (error) {
    console.error('Gagal memuat opsi:', error)
  }
}

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
// PAGINATION & SORTING (DEFAULT MULTI-COLUMN)
// ============================================
const pagination = ref({
  sortBy: 'c_periode,c_kelas_id,c_status_absen,c_murid_id',
  descending: false,
  page: 1,
  rowsPerPage: 50,
  rowsNumber: 0,
})

// Fungsi ekstrak tanggal dari datetime
const getDateOnly = (datetime) => {
  if (!datetime) return ''
  if (datetime.includes('T')) return datetime.split('T')[0]
  if (datetime.includes(' ')) return datetime.split(' ')[0]
  return datetime
}

const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  loading.value = true

  try {
    // Guard untuk non-Admin
    if (!filterKelas.value && !isAdmin.value) {
      if (kelasOptions.value.length > 0) filterKelas.value = kelasOptions.value[0].value
      else {
        rows.value = []
        pagination.value.rowsNumber = 0
        loading.value = false
        return
      }
    }

    const prd = String(activePeriodeId.value).trim()
    const start = String(filterDateStart.value).trim()
    const end = String(filterDateEnd.value).trim()
    const startDate = `${start} 00:00:00`
    const endDate = `${end} 23:59:59`

    let filterString = `c_periode = "${prd}" && d_tanggal >= "${startDate}" && d_tanggal <= "${endDate}"`
    if (filterKelas.value) filterString += ` && c_kelas_id = "${filterKelas.value}"`

    // Sorting
    let sortString = ''
    if (sortBy) {
      sortString = descending ? `-${sortBy}` : `+${sortBy}`
    } else {
      sortString = '+c_periode,+c_kelas_id,+c_status_absen,+c_murid_id'
    }

    // Ambil data absen dan data libur secara paralel
    const filterLibur = `c_periode = "${prd}" && b_aktif = true && d_tanggal >= "${startDate}" && d_tanggal <= "${endDate}"`
    const [absenResult, liburRecords] = await Promise.all([
      pb.collection('tb_tr_absen_murid').getList(page, rowsPerPage === 0 ? 1000 : rowsPerPage, {
        sort: sortString,
        filter: filterString,
      }),
      pb.collection('tb_mst_hari_libur').getFullList({ filter: filterLibur, requestKey: null }),
    ])

    // Buat set tanggal libur
    const liburSet = new Set()
    liburRecords.forEach((libur) => {
      const tglLibur = getDateOnly(libur.d_tanggal)
      if (tglLibur) liburSet.add(tglLibur)
    })

    // Tambahkan flag isLibur ke setiap baris
    const itemsWithLibur = absenResult.items.map((item) => ({
      ...item,
      isLibur: liburSet.has(getDateOnly(item.d_tanggal)),
    }))

    pagination.value = {
      ...pagination.value,
      page,
      rowsPerPage,
      rowsNumber: absenResult.totalItems,
      sortBy,
      descending,
    }
    rows.value = itemsWithLibur
  } catch (error) {
    if (!error.isAbort) {
      console.error(error)
      $q.notify({ type: 'negative', message: 'Gagal memuat data kehadiran' })
    }
  } finally {
    loading.value = false
  }
}

const cariData = () => {
  pagination.value.page = 1
  onRequest({ pagination: pagination.value })
}

const cetakLaporan = () => window.print()

onMounted(async () => {
  await loadDropdowns()
  cariData()
})
</script>

<style scoped>
@media print {
  .no-print {
    display: none !important;
  }
  .print-only {
    display: block !important;
  }
  .report-table {
    border: 1px solid #000;
  }
  .q-table th,
  .q-table td {
    border-color: #000 !important;
  }
}
@media screen {
  .print-only {
    display: none;
  }
}
</style>

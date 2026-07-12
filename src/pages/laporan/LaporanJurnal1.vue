<template>
  <q-page class="q-pa-sm">
    <!-- Filter section -->
    <div class="row q-col-gutter-sm items-center q-mb-md no-print">
      <div class="text-h6 q-mr-md">Laporan Jurnal Mengajar</div>
      <div class="col-12 col-sm-3 col-md-2">
        <q-input v-model="filterDateStart" type="date" label="Tgl Mulai" dense outlined />
      </div>
      <div class="col-12 col-sm-3 col-md-2">
        <q-input v-model="filterDateEnd" type="date" label="Tgl Akhir" dense outlined />
      </div>
      <div class="col-12 col-sm-3 col-md-2">
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
      <div class="col-12 col-sm-3 col-md-3">
        <q-select
          v-model="filterGuru"
          :options="filteredGuruOptions"
          label="Filter Guru"
          dense
          outlined
          emit-value
          map-options
          clearable
          use-input
          input-debounce="300"
          @filter="filterGuruFn"
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
      <div class="text-h5 text-center text-weight-bold">LAPORAN JURNAL MENGAJAR</div>
      <div class="text-subtitle1 text-center">
        Periode: {{ filterDateStart }} s/d {{ filterDateEnd }}
        <span v-if="filterKelas"> | Kelas: {{ getKelasNama(filterKelas) }}</span>
        <span v-if="filterGuru"> | Guru: {{ getGuruNama(filterGuru) }}</span>
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

      <!-- Format tanggal + hari -->
      <template v-slot:body-cell-d_tanggal="props">
        <q-td :props="props">
          {{ getHariLabel(props.row.n_hari_id) }},<br />
          <span class="text-caption">{{ formatTanggal(props.row.d_tanggal) }}</span>
        </q-td>
      </template>

      <!-- Nama kelas -->
      <template v-slot:body-cell-c_kelas_id="props">
        <q-td :props="props" class="text-weight-bold">{{
          getKelasNama(props.row.c_kelas_id)
        }}</q-td>
      </template>

      <!-- Nama guru -->
      <template v-slot:body-cell-c_guru_id="props">
        <q-td :props="props">{{ getGuruNama(props.row.c_guru_id) }}</q-td>
      </template>

      <!-- Jam ke -->
      <template v-slot:body-cell-c_jam_id="props">
        <q-td :props="props" class="text-center">{{ getJamNama(props.row.c_jam_id) }}</q-td>
      </template>

      <!-- Jadwal rencana -->
      <template v-slot:body-cell-c_jad_str="props">
        <q-td :props="props" class="text-center">
          {{ props.row.c_jad_str || '-' }} - {{ props.row.c_jad_end || '-' }}<br />
          <span class="text-caption text-grey-6">{{ props.row.n_jad_dur || 0 }} mnt</span>
        </q-td>
      </template>

      <!-- Realisasi check-in/out -->
      <template v-slot:body-cell-c_chk_str="props">
        <q-td
          :props="props"
          class="text-center"
          :class="!props.row.c_chk_str ? 'text-negative text-weight-bold' : 'text-primary'"
        >
          {{ props.row.c_chk_str || 'BELUM' }} - {{ props.row.c_chk_end || '-' }}<br />
          <span v-if="props.row.n_chk_dur" class="text-caption">{{ props.row.n_chk_dur }} mnt</span>
        </q-td>
      </template>

      <!-- Kolom Libur (tampilkan ikon centang atau silang) -->
      <template v-slot:body-cell-is_libur="props">
        <q-td :props="props" class="text-center">
          <q-icon v-if="props.row.isLibur" name="check_circle" color="negative" size="sm" />
          <q-icon v-else name="cancel" color="grey" size="sm" />
        </q-td>
      </template>

      <!-- Keterangan / Jurnal -->
      <template v-slot:body-cell-c_keterangan="props">
        <q-td :props="props" style="white-space: normal; max-width: 250px">{{
          props.row.c_keterangan || '-'
        }}</q-td>
      </template>

      <template v-slot:no-data>
        <div class="full-width row flex-center q-pa-md text-grey-8">
          <q-icon name="warning" class="q-mr-sm" /> Tidak ada data jurnal mengajar
        </div>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useQuasar, date } from 'quasar'
import { pb } from 'boot/pocketbase'
import { SET_HARI } from 'src/lib/constants'
import { getJamtemplateLookup } from 'src/lib/utils'
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
const filterGuru = ref(null)

// Rentang tanggal (default: bulan berjalan)
const timeStampNow = Date.now()
const nowDate = new Date(timeStampNow)
const startOfMonthDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1)
const endOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0)
const filterDateStart = ref(date.formatDate(startOfMonthDate, 'YYYY-MM-DD'))
const filterDateEnd = ref(date.formatDate(endOfMonth, 'YYYY-MM-DD'))

// Options dropdown
const kelasOptions = ref([])
const guruOptions = ref([])
const jamOptions = ref([])
const filteredKelasOptions = ref([])
const filteredGuruOptions = ref([])

// ============================================
// KONFIGURASI KOLOM Q-TABLE (sortable)
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
    name: 'c_guru_id',
    label: 'GURU',
    align: 'left',
    field: 'c_guru_id',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'c_jam_id',
    label: 'JAM KE',
    align: 'center',
    field: 'c_jam_id',
    sortable: true,
    style: 'width: 30px; vertical-align: top;',
  },
  {
    name: 'c_jad_str',
    label: 'JADWAL (Rencana)',
    align: 'center',
    field: 'c_jad_str',
    sortable: false,
    style: 'vertical-align: top;',
  },
  {
    name: 'c_chk_str',
    label: 'HADIR (Realisasi)',
    align: 'center',
    field: 'c_chk_str',
    sortable: false,
    style: 'vertical-align: top;',
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
    label: 'MATERI / JURNAL',
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
  'c_guru_id',
  'c_jam_id',
  'c_jad_str',
  'c_chk_str',
  'is_libur',
  'c_keterangan',
])

// ============================================
// FUNGSI LOOKUP
// ============================================
const getKelasNama = (id) => {
  const found = kelasOptions.value.find((o) => o.value === id)
  return found ? found.label : id
}
const getGuruNama = (id) => {
  const found = guruOptions.value.find((o) => o.value === id)
  return found ? found.label : id
}
const getJamNama = (id) => {
  const found = jamOptions.value.find((o) => o.value === id)
  return found ? found.label : id
}
const getHariLabel = (val) => {
  const found = SET_HARI.find((o) => o.value == val)
  return found ? found.label : val
}
const formatTanggal = (tgl) => {
  if (!tgl) return '-'
  const datePart = tgl.split(' ')[0]
  return date.formatDate(datePart, 'DD/MM/YYYY')
}

// ============================================
// LOAD DROPDOWNS & FILTER FUNCTIONS
// ============================================
const loadDropdowns = async () => {
  try {
    jamOptions.value = await getJamtemplateLookup()
    kelasOptions.value = await auth.getKelasLookup()
    guruOptions.value = await auth.getGuruLookup()

    filteredKelasOptions.value = [...kelasOptions.value]
    filteredGuruOptions.value = [...guruOptions.value]

    // Auto-select untuk non-admin (paksa pilihan pertama)
    if (kelasOptions.value.length === 1) filterKelas.value = kelasOptions.value[0].value
    else if (!isAdmin.value && kelasOptions.value.length > 0)
      filterKelas.value = kelasOptions.value[0].value

    if (guruOptions.value.length === 1) filterGuru.value = guruOptions.value[0].value
    else if (!isAdmin.value && guruOptions.value.length > 0)
      filterGuru.value = guruOptions.value[0].value
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

const filterGuruFn = (val, update) => {
  if (val === '') {
    update(() => {
      filteredGuruOptions.value = guruOptions.value
    })
    return
  }
  update(() => {
    const needle = val.toLowerCase()
    filteredGuruOptions.value = guruOptions.value.filter(
      (v) => v.label.toLowerCase().indexOf(needle) > -1,
    )
  })
}

// ============================================
// PAGINATION & SORTING (Default multi-column)
// ============================================
const pagination = ref({
  sortBy: 'd_tanggal,c_kelas_id,c_guru_id,c_jam_id',
  descending: false,
  page: 1,
  rowsPerPage: 50,
  rowsNumber: 0,
})

// Fungsi untuk mengekstrak tanggal dari string datetime
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
    // Guard untuk non-admin: filter wajib ada
    if (!isAdmin.value) {
      if (!filterKelas.value && kelasOptions.value.length)
        filterKelas.value = kelasOptions.value[0].value
      if (!filterGuru.value && guruOptions.value.length)
        filterGuru.value = guruOptions.value[0].value
      if (
        (!filterKelas.value && kelasOptions.value.length === 0) ||
        (!filterGuru.value && guruOptions.value.length === 0)
      ) {
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
    // 🔥 Filter: tidak menampilkan data jika c_guru_id kosong
    filterString += ` && c_guru_id != "" && c_guru_id != null`
    if (filterKelas.value) filterString += ` && c_kelas_id = "${filterKelas.value}"`
    if (filterGuru.value) filterString += ` && c_guru_id = "${filterGuru.value}"`

    // Sorting
    let sortString = ''
    if (sortBy) {
      const fields = sortBy.split(',')
      sortString = fields.map((f) => (descending ? `-${f}` : `+${f}`)).join(',')
    } else {
      sortString = '+d_tanggal,+c_kelas_id,+c_guru_id,+c_jam_id'
    }

    // Ambil data jurnal dan data libur secara paralel
    const filterLibur = `c_periode = "${prd}" && b_aktif = true && d_tanggal >= "${startDate}" && d_tanggal <= "${endDate}"`
    const [jurnalResult, liburRecords] = await Promise.all([
      pb.collection('tb_tr_jurnal_guru').getList(page, rowsPerPage === 0 ? 1000 : rowsPerPage, {
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

    // Tambahkan flag isLibur ke setiap row
    const itemsWithLibur = jurnalResult.items.map((item) => {
      const tglItem = getDateOnly(item.d_tanggal)
      return {
        ...item,
        isLibur: liburSet.has(tglItem),
      }
    })

    pagination.value = {
      ...pagination.value,
      page,
      rowsPerPage,
      rowsNumber: jurnalResult.totalItems,
      sortBy,
      descending,
    }
    rows.value = itemsWithLibur
  } catch (error) {
    if (!error.isAbort) {
      console.error(error)
      $q.notify({ type: 'negative', message: 'Gagal memuat data jurnal' })
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

<template>
  <q-page class="q-pa-sm">
    <!-- Filter section -->
    <div class="row q-col-gutter-sm items-center q-mb-md no-print">
      <div class="text-h6 q-mr-md">Rekap Jurnal Mengajar Guru</div>
      <div class="col-12 col-sm-3 col-md-2">
        <q-input v-model="filterDateStart" type="date" label="Tgl Mulai" dense outlined />
      </div>
      <div class="col-12 col-sm-3 col-md-2">
        <q-input v-model="filterDateEnd" type="date" label="Tgl Akhir" dense outlined />
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
      <div class="text-h5 text-center text-weight-bold">REKAP JURNAL MENGAJAR GURU</div>
      <div class="text-subtitle1 text-center">
        Periode: {{ filterDateStart }} s/d {{ filterDateEnd }}
        <span v-if="filterGuru"> | Guru: {{ getGuruNama(filterGuru) }}</span>
      </div>
      <hr />
    </div>

    <!-- Tabel summary -->
    <q-table
      :rows="rows"
      :columns="columns"
      :loading="loading"
      row-key="c_guru_id"
      separator="cell"
      outlined
      bordered
      flat
      square
      class="report-table"
      :pagination="{ rowsPerPage: 50 }"
    >
      <template v-slot:header="props">
        <q-tr :props="props" class="bg-grey-2">
          <q-th auto-width class="text-center">No</q-th>
          <q-th class="text-left">Nama Guru</q-th>
          <q-th class="text-center">Ttl. Jam (Target)</q-th>
          <q-th class="text-center">Terisi (Hadir)</q-th>
          <q-th class="text-center">Sisa Jam (Belum)</q-th>
          <q-th class="text-center">Persentase (%)</q-th>
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr :props="props">
          <q-td class="text-center">{{ props.rowIndex + 1 }}</q-td>
          <q-td class="text-weight-bold">{{ props.row.guru_nama }}</q-td>
          <q-td class="text-center">{{ props.row.totalJam }}</q-td>
          <q-td class="text-center text-positive">{{ props.row.totalHadir }}</q-td>
          <q-td class="text-center text-warning">{{ props.row.totalBelum }}</q-td>
          <q-td class="text-center">
            <q-badge
              :color="props.row.persentase >= 80 ? 'positive' : 'warning'"
              text-color="white"
            >
              {{ props.row.persentase }}%
            </q-badge>
          </q-td>
        </q-tr>
      </template>

      <template v-slot:no-data>
        <div class="full-width row flex-center q-pa-md text-grey-8">
          <q-icon name="warning" class="q-mr-sm" /> Tidak ada data untuk periode ini
        </div>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useQuasar, date } from 'quasar'
import { pb } from 'boot/pocketbase'
import { useAuthStore } from 'stores/authStore'
import { usePeriodeStore } from 'src/stores/periode'
import { storeToRefs } from 'pinia'

const $q = useQuasar()
const auth = useAuthStore()
const periodeStore = usePeriodeStore()
const { activePeriodeId } = storeToRefs(periodeStore)

// Role check
const isAdmin = computed(() => auth.activeRole === 'Admin' || auth.user?.role === 'Admin')

// State
const rows = ref([])
const loading = ref(false)
const filterGuru = ref(null)

// Rentang tanggal default: bulan berjalan
const timeStampNow = Date.now()
const nowDate = new Date(timeStampNow)
const startOfMonthDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1)
const endOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0)
const filterDateStart = ref(date.formatDate(startOfMonthDate, 'YYYY-MM-DD'))
const filterDateEnd = ref(date.formatDate(endOfMonth, 'YYYY-MM-DD'))

// Options untuk dropdown guru
const guruOptions = ref([])
const filteredGuruOptions = ref([])

// ============================================
// KONFIGURASI KOLOM
// ============================================
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no' },
  {
    name: 'guru_nama',
    label: 'NAMA GURU',
    align: 'left',
    field: 'guru_nama',
    sortable: true,
    classes: 'kolom-wrap',
  },
  { name: 'totalJam', label: 'TTTL JAM', align: 'center', field: 'totalJam', sortable: true },
  { name: 'totalHadir', label: 'TERISI', align: 'center', field: 'totalHadir', sortable: true },
  { name: 'totalBelum', label: 'SISA JAM', align: 'center', field: 'totalBelum', sortable: true },
  { name: 'persentase', label: '%', align: 'center', field: 'persentase', sortable: true },
]

// ============================================
// FUNGSI LOOKUP
// ============================================
const getGuruNama = (id) => {
  const found = guruOptions.value.find((o) => o.value === id)
  return found ? found.label : id
}

// ============================================
// LOAD DROPDOWNS GURU
// ============================================
const loadDropdowns = async () => {
  try {
    guruOptions.value = await auth.getGuruLookup()
    filteredGuruOptions.value = [...guruOptions.value]
    // Auto-select jika hanya satu guru atau non-admin
    if (guruOptions.value.length === 1) {
      filterGuru.value = guruOptions.value[0].value
    } else if (!isAdmin.value && guruOptions.value.length > 0) {
      filterGuru.value = guruOptions.value[0].value
    }
  } catch (error) {
    console.error('Gagal memuat opsi guru:', error)
  }
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
// FUNGSI EKSTRAK TANGGAL
// ============================================
const getDateOnly = (datetime) => {
  if (!datetime) return ''
  if (datetime.includes('T')) return datetime.split('T')[0]
  if (datetime.includes(' ')) return datetime.split(' ')[0]
  return datetime
}

// ============================================
// FETCH DATA SUMMARY PER GURU
// ============================================
const cariData = async () => {
  loading.value = true

  try {
    // Guard untuk non-admin: filter guru wajib ada
    if (!filterGuru.value && !isAdmin.value) {
      if (guruOptions.value.length > 0) {
        filterGuru.value = guruOptions.value[0].value
      } else {
        rows.value = []
        loading.value = false
        return
      }
    }

    const prd = String(activePeriodeId.value).trim()
    const start = String(filterDateStart.value).trim()
    const end = String(filterDateEnd.value).trim()
    const startDate = `${start} 00:00:00`
    const endDate = `${end} 23:59:59`

    // Filter untuk tb_tr_jurnal_guru
    let filterJurnal = `c_periode = "${prd}" && d_tanggal >= "${startDate}" && d_tanggal <= "${endDate}"`
    if (filterGuru.value) {
      filterJurnal += ` && c_guru_id = "${filterGuru.value}"`
    }

    // Filter untuk hari libur aktif
    const filterLibur = `c_periode = "${prd}" && b_aktif = true && d_tanggal >= "${startDate}" && d_tanggal <= "${endDate}"`

    // Ambil data jurnal dan hari libur secara paralel
    const [jurnalRecords, liburRecords] = await Promise.all([
      pb.collection('tb_tr_jurnal_guru').getFullList({ filter: filterJurnal, requestKey: null }),
      pb.collection('tb_mst_hari_libur').getFullList({ filter: filterLibur, requestKey: null }),
    ])

    // Buat set tanggal libur
    const liburSet = new Set()
    liburRecords.forEach((libur) => {
      const tglLibur = getDateOnly(libur.d_tanggal)
      if (tglLibur) liburSet.add(tglLibur)
    })

    // Filter jurnal: hapus data yang tanggalnya termasuk libur
    const validJurnal = jurnalRecords.filter((item) => {
      const tglItem = getDateOnly(item.d_tanggal)
      return !liburSet.has(tglItem)
    })

    // Grouping per guru
    const summaryMap = new Map() // key = c_guru_id

    validJurnal.forEach((item) => {
      const guruId = item.c_guru_id
      if (!guruId) return

      if (!summaryMap.has(guruId)) {
        summaryMap.set(guruId, {
          c_guru_id: guruId,
          totalJam: 0,
          totalHadir: 0,
        })
      }

      const guruData = summaryMap.get(guruId)
      guruData.totalJam += 1 // setiap record = 1 jam pelajaran

      // Cek apakah hadir (ada check-in dan check-out atau durasi > 0)
      const isHadir = (item.c_chk_str && item.c_chk_end) || (item.n_chk_dur && item.n_chk_dur > 0)
      if (isHadir) {
        guruData.totalHadir += 1
      }
    })

    // Konversi ke array rows dengan menghitung totalBelum dan persentase
    const rowsData = []
    for (const [guruId, data] of summaryMap.entries()) {
      const totalJam = data.totalJam
      const totalHadir = data.totalHadir
      const totalBelum = totalJam - totalHadir
      const persentase = totalJam > 0 ? Math.round((totalHadir / totalJam) * 100) : 0
      rowsData.push({
        c_guru_id: guruId,
        guru_nama: getGuruNama(guruId),
        totalJam,
        totalHadir,
        totalBelum,
        persentase,
      })
    }

    // Urutkan berdasarkan nama guru
    rowsData.sort((a, b) => a.guru_nama.localeCompare(b.guru_nama))
    rows.value = rowsData
  } catch (error) {
    if (!error.isAbort) {
      console.error('Gagal memuat rekap jurnal guru:', error)
      $q.notify({ type: 'negative', message: 'Gagal memuat data rekap' })
    }
  } finally {
    loading.value = false
  }
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

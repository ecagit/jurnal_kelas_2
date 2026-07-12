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

const isAdmin = computed(() => {
  return auth.activeRole === 'Admin' || auth.user?.role === 'Admin'
})

// State
const rows = ref([])
const loading = ref(false)

// Filter
const filterKelas = ref(null)

// ========== MODIFIKASI DI SINI ==========
// Gunakan timestamp sekarang untuk mendapatkan tanggal awal bulan dan hari ini
const timeStampNow = Date.now()
const nowDate = new Date(timeStampNow)

// Awal bulan (tanggal 1 jam 00:00:00)
const startOfMonthDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1)
const endOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0)

// Format ke YYYY-MM-DD
const filterDateStart = ref(date.formatDate(startOfMonthDate, 'YYYY-MM-DD'))
//const filterDateEnd = ref(date.formatDate(timeStampNow, 'YYYY-MM-DD'))
const filterDateEnd = date.formatDate(endOfMonth, 'YYYY-MM-DD')
// ========== AKHIR MODIFIKASI ==========

// Options
const kelasOptions = ref([])
const filteredKelasOptions = ref([])

// Konfigurasi Kolom
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no' },
  { name: 'kelas_nama', label: 'KELAS', align: 'left', field: 'kelas_nama', sortable: true },
  { name: 'jml_ijin', label: 'JML IJIN', align: 'center', field: 'jml_ijin', sortable: true },
  { name: 'jml_sakit', label: 'JML SAKIT', align: 'center', field: 'jml_sakit', sortable: true },
  { name: 'jml_alpa', label: 'JML ALPA', align: 'center', field: 'jml_alpa', sortable: true },
  {
    name: 'jml_lambat',
    label: 'JML LAMBAT',
    align: 'center',
    field: 'jml_lambat',
    sortable: true,
  },
]

// Helper
const getKelasNama = (id) => {
  const found = kelasOptions.value.find((o) => o.value === id)
  return found ? found.label : id
}

// Load Dropdown
const loadDropdowns = async () => {
  try {
    kelasOptions.value = await auth.getKelasLookup()
    filteredKelasOptions.value = [...kelasOptions.value]

    if (kelasOptions.value.length === 1) {
      filterKelas.value = kelasOptions.value[0].value
    } else if (!isAdmin.value && kelasOptions.value.length > 0) {
      filterKelas.value = kelasOptions.value[0].value
    }
  } catch (error) {
    console.error('Gagal memuat opsi:', error)
  }
}

// Filter kelas dropdown
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

// Fetch dan Agregasi Data
const cariData = async () => {
  loading.value = true

  try {
    if (!filterKelas.value && !isAdmin.value) {
      if (kelasOptions.value.length > 0) {
        filterKelas.value = kelasOptions.value[0].value
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

    // 1. Siapkan Filter Absen
    let filterString = `c_periode = "${prd}" && d_tanggal >= "${startDate}" && d_tanggal <= "${endDate}"`
    if (filterKelas.value) {
      filterString += ` && c_kelas_id = "${filterKelas.value}"`
    }

    // 2. Siapkan Filter Hari Libur Aktif
    const filterLibur = `c_periode = "${prd}" && b_aktif = true && d_tanggal >= "${startDate}" && d_tanggal <= "${endDate}"`

    // 3. Ambil data Absen, Hari Libur, DAN Jadwal Master
    const [rawData, dataLibur, dataJadwal] = await Promise.all([
      pb.collection('tb_tr_absen_murid').getFullList({ filter: filterString }),
      pb.collection('tb_mst_hari_libur').getFullList({ filter: filterLibur }),
      pb.collection('tb_mst_jadwal').getFullList({ filter: `c_periode = "${prd}"` }),
    ])

    // 4. Ekstrak Tanggal Libur
    const listTanggalLibur = dataLibur.map((l) => {
      let tgl = l.d_tanggal
      return tgl.includes('T') ? tgl.split('T')[0] : tgl.split(' ')[0]
    })

    // 5. Ekstrak Hari Aktif per Kelas
    const getActiveDaysForKelas = (kelasId) => {
      const jadwalKelas = dataJadwal.filter((j) => j.c_kelas_id === kelasId)
      return [...new Set(jadwalKelas.map((j) => Number(j.n_hari_id)))]
    }

    // 6. Proses Grouping by Kelas
    const summaryData = {}

    rawData.forEach((item) => {
      const kelasId = item.c_kelas_id

      let itemTgl = item.d_tanggal
      let justDate = itemTgl.includes('T') ? itemTgl.split('T')[0] : itemTgl.split(' ')[0]

      // A. LOMPATI JIKA HARI LIBUR
      if (listTanggalLibur.includes(justDate)) return

      // B. LOMPATI JIKA TIDAK ADA JADWAL DI HARI TERSEBUT
      const currentObjDate = new Date(justDate)
      const dayOfWeek = currentObjDate.getDay()
      const activeDays = getActiveDaysForKelas(kelasId)

      if (activeDays.length > 0 && !activeDays.includes(dayOfWeek)) {
        return
      }

      if (!summaryData[kelasId]) {
        summaryData[kelasId] = {
          id: kelasId,
          kelas_nama: getKelasNama(kelasId),
          jml_ijin: 0,
          jml_sakit: 0,
          jml_alpa: 0,
          jml_lambat: 0,
        }
      }

      const status = item.c_status_absen || item.c_status_absen

      if (status === 'I') summaryData[kelasId].jml_ijin++
      else if (status === 'S') summaryData[kelasId].jml_sakit++
      else if (status === 'A') summaryData[kelasId].jml_alpa++
      else if (status === 'L') summaryData[kelasId].jml_lambat++
    })

    let aggregatedArr = Object.values(summaryData)
    aggregatedArr.sort((a, b) => a.kelas_nama.localeCompare(b.kelas_nama))

    rows.value = aggregatedArr
  } catch (error) {
    if (!error.isAbort) {
      console.error(error)
      $q.notify({ type: 'negative', message: 'Gagal memuat rekap kehadiran' })
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

<template>
  <q-page class="q-pa-sm">
    <div class="row q-col-gutter-sm items-center q-mb-md no-print">
      <div class="text-h6 q-mr-md">Rekap Kehadiran Murid</div>
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

    <div class="print-only q-mb-md">
      <div class="text-h5 text-center text-weight-bold">REKAP KEHADIRAN MURID PER KELAS</div>
      <div class="text-subtitle1 text-center">
        Periode: {{ filterDateStart }} s/d {{ filterDateEnd }}
        <span v-if="filterKelas"> | Kelas: {{ getKelasNama(filterKelas) }}</span>
      </div>
      <hr />
    </div>

    <q-table
      :rows="rows"
      :columns="columns"
      :loading="loading"
      row-key="id"
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
          <q-th class="text-left">Kelas</q-th>
          <q-th class="text-center">Jml Ijin</q-th>
          <q-th class="text-center">Jml Sakit</q-th>
          <q-th class="text-center">Jml Alpa</q-th>
          <q-th class="text-center">Jml Lambat</q-th>
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr :props="props">
          <q-td class="text-center">{{ props.rowIndex + 1 }}</q-td>
          <q-td class="text-weight-bold">{{ props.row.kelas_nama }}</q-td>
          <q-td class="text-center">
            <q-badge color="info" v-if="props.row.jml_ijin > 0">{{ props.row.jml_ijin }}</q-badge>
            <span v-else class="text-grey-5">-</span>
          </q-td>
          <q-td class="text-center">
            <q-badge color="warning" v-if="props.row.jml_sakit > 0">{{
              props.row.jml_sakit
            }}</q-badge>
            <span v-else class="text-grey-5">-</span>
          </q-td>
          <q-td class="text-center">
            <q-badge color="negative" v-if="props.row.jml_alpa > 0">{{
              props.row.jml_alpa
            }}</q-badge>
            <span v-else class="text-grey-5">-</span>
          </q-td>
          <q-td class="text-center">
            <q-badge color="orange" v-if="props.row.jml_lambat > 0">{{
              props.row.jml_lambat
            }}</q-badge>
            <span v-else class="text-grey-5">-</span>
          </q-td>
        </q-tr>
      </template>

      <template v-slot:no-data>
        <div class="full-width row flex-center q-pa-md text-grey-8">
          <q-icon name="warning" class="q-mr-sm" size="2em" /> Tidak ada data untuk periode ini
        </div>
      </template>
    </q-table>
  </q-page>
</template>

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

<script setup>
import { ref, onMounted, watch } from 'vue'
import { pb } from 'src/boot/pocketbase'
import { usePeriodeStore } from 'src/stores/periode'
import { storeToRefs } from 'pinia'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/authStore'
import { SET_HARI } from 'src/lib/constants'

const $q = useQuasar()
const auth = useAuthStore()
const periodeStore = usePeriodeStore()
const { activePeriodeId } = storeToRefs(periodeStore)

// State Data
const jadwalRows = ref([])
const loadingJadwal = ref(false)

// State untuk Dialog Slot Kosong
const dialogKosong = ref(false)
const kelasTerpilih = ref('')
const kelasIdTerpilih = ref('')
const slotKosongTerpilih = ref([])
const totalWajibTerpilih = ref(0)

// Options untuk Dropdown
const kelasOptions = ref([])

// Pagination
const jadwalPagination = ref({
  sortBy: 'kelas_id', // Diurutkan berdasarkan kelas_id agar konsisten
  descending: false,
  page: 1,
  rowsPerPage: 50,
})

// Konfigurasi Kolom - compact untuk mobile
const jadwalColumns = [
  {
    name: 'kelas_nama',
    label: 'KELAS',
    align: 'left',
    field: 'kelas_id',
    sortable: true,
    style: 'width: 50%; padding-left: 8px;',
  },
  {
    name: 'info_jadwal',
    label: 'POLA JAM - STATUS JADWAL',
    align: 'left',
    field: 'info_jadwal',
    sortable: true,
    style: 'width: 50%;',
  },
]

// Fungsi untuk mendapatkan nama hari
const namaHari = (id) => {
  const hari = SET_HARI.find((h) => h.value === Number(id))
  return hari ? hari.label : 'Tidak Diketahui'
}

// Load dropdown kelas
const loadDropdowns = async () => {
  try {
    kelasOptions.value = await auth.getKelasLookup()
  } catch (error) {
    console.error('Gagal memuat opsi dropdown:', error)
  }
}

// Fungsi untuk menentukan warna progress
const getProgressColor = (val) => {
  if (val === 100) return 'positive'
  if (val >= 50) return 'warning'
  return 'negative'
}

// Buka dialog detail slot kosong
const bukaDetailKosong = (row) => {
  kelasTerpilih.value = row.kelas_nama
  kelasIdTerpilih.value = row.kelas_id
  slotKosongTerpilih.value = row.emptySlots || []
  totalWajibTerpilih.value = row.total40 || 0
  dialogKosong.value = true
}

// Load data dashboard
const loadDashboardData = async () => {
  if (!activePeriodeId.value) return

  loadingJadwal.value = true
  try {
    if (kelasOptions.value.length === 0) {
      await loadDropdowns()
    }

    // 1. AMBIL DATA MASTER JAM (tb_mst_jamsat) UNTUK LOOKUP KETERANGAN JAM
    const masterJamsat = await pb.collection('tb_mst_jamsat').getFullList()
    const jamsatLookup = {}
    masterJamsat.forEach((jam) => {
      if (jam.c_jam_id) {
        jamsatLookup[jam.c_jam_id] = jam.c_nama || ''
      }
    })

    // 2. AMBIL DATA JADWAL
    const semuaJadwal = await pb.collection('tb_mst_jadwal').getFullList({
      filter: `c_periode = "${activePeriodeId.value.trim()}"`,
    })

    const jadwalPerKelas = {}
    semuaJadwal.forEach((jadwal) => {
      if (!jadwalPerKelas[jadwal.c_kelas_id]) {
        jadwalPerKelas[jadwal.c_kelas_id] = []
      }
      jadwalPerKelas[jadwal.c_kelas_id].push(jadwal)
    })

    const dataDashboard = kelasOptions.value.map((kelas) => {
      const targetId = kelas.value || kelas.c_kelas_id || kelas.id
      const targetNama = kelas.label || kelas.c_nama_kelas

      const jadwalKelasIni = jadwalPerKelas[targetId] || []
      const hasTemplate = jadwalKelasIni.length > 0

      const jadwalWajib = jadwalKelasIni.filter((j) => Number(j.n_jad_dur) === 40)

      const total40 = jadwalWajib.length
      const filled40 = jadwalWajib.filter((j) => j.c_guru_id && j.c_guru_id.trim() !== '').length

      // 3. PROSES SLOT KOSONG + EKSTRAK KETERANGAN JAM DARI LOOKUP MASTER JAM
      const emptySlots = jadwalWajib
        .filter((j) => !j.c_guru_id || j.c_guru_id.trim() === '')
        .map((slot) => {
          return {
            ...slot,
            // Mengambil field c_nama dari tabel tb_mst_jamsat berdasarkan kunci c_jam_id
            keteranganJam: jamsatLookup[slot.c_jam_id] || '',
          }
        })

      // Urutkan slot kosong berdasarkan hari dan jam
      emptySlots.sort((a, b) => {
        if (Number(a.n_hari_id) !== Number(b.n_hari_id)) {
          return Number(a.n_hari_id) - Number(b.n_hari_id)
        }
        return a.c_jad_str.localeCompare(b.c_jad_str)
      })

      const persentase = total40 > 0 ? Math.round((filled40 / total40) * 100) : 0

      return {
        kelas_id: targetId,
        kelas_nama: targetNama,
        hasTemplate,
        total40,
        filled40,
        persentase,
        emptySlots,
      }
    })

    jadwalRows.value = dataDashboard
  } catch (error) {
    console.error('Gagal mengambil data dashboard:', error)
    $q.notify({ type: 'negative', message: 'Gagal merender data dashboard. Cek console.' })
  } finally {
    loadingJadwal.value = false
  }
}

watch(activePeriodeId, (newVal) => {
  if (newVal) loadDashboardData()
})

onMounted(() => {
  if (!activePeriodeId.value) {
    periodeStore.fetchActivePeriode()
  }
  loadDashboardData()
})
</script>

<template>
  <q-page class="q-pa-sm q-pa-md-md">
    <div class="row items-center justify-between q-mb-sm q-mb-md-md">
      <div class="col">
        <div class="text-h6 text-h5-md text-weight-bold q-mb-xs">Dashboard Jadwal</div>
        <div class="text-caption text-grey-7">
          Periode: <strong class="text-primary">{{ activePeriodeId || '-' }}</strong>
        </div>
      </div>
      <div class="col-auto">
        <q-btn
          color="primary"
          icon="refresh"
          round
          dense
          :loading="loadingJadwal"
          @click="loadDashboardData"
          size="sm"
        >
          <q-tooltip>Muat Ulang</q-tooltip>
        </q-btn>
      </div>
    </div>

    <q-card flat bordered class="shadow-1">
      <q-card-section class="q-pa-sm q-pa-md-md">
        <div class="text-subtitle2 text-weight-bold text-grey-8 q-mb-sm">
          <q-icon name="schedule" size="sm" class="q-mr-xs" color="primary" />
          Pengisian Jadwal
        </div>
      </q-card-section>

      <q-table
        :rows="jadwalRows"
        :columns="jadwalColumns"
        row-key="kelas_id"
        :loading="loadingJadwal"
        :pagination="jadwalPagination"
        flat
        dense
        hide-bottom
        class="compact-table"
      >
        <template v-slot:body-cell-kelas_nama="props">
          <q-td :props="props" class="cell-kelas">
            <div
              class="text-primary text-weight-medium cursor-pointer hover-effect text-body2"
              @click="bukaDetailKosong(props.row)"
            >
              {{ props.row.kelas_nama }} ({{ props.row.kelas_id }})
              <q-tooltip>Klik untuk melihat detail slot kosong</q-tooltip>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-info_jadwal="props">
          <q-td :props="props" class="cell-status">
            <div class="row items-center no-wrap justify-start q-gutter-x-xs">
              <q-icon v-if="props.row.hasTemplate" name="check_circle" color="positive" size="16px">
                <q-tooltip>Pola sudah di-generate</q-tooltip>
              </q-icon>
              <q-icon v-else name="remove" color="grey-5" size="16px">
                <q-tooltip>Belum ada pola</q-tooltip>
              </q-icon>

              <q-circular-progress
                :value="props.row.persentase"
                :color="getProgressColor(props.row.persentase)"
                track-color="grey-3"
                size="28px"
                :thickness="0.22"
                show-value
                font-size="9px"
                class="q-ml-xs"
              />

              <div class="text-caption text-grey-7 text-weight-medium" style="min-width: 35px">
                {{ props.row.filled40 }}/{{ props.row.total40 }}
              </div>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="dialogKosong" transition-show="scale" transition-hide="scale">
      <q-card style="width: 500px; max-width: 90vw">
        <q-card-section class="bg-primary text-white row items-center justify-between">
          <div class="text-h6 text-weight-bold">Detail Slot Kosong</div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-sm bg-grey-1">
          <div class="text-subtitle2 text-grey-8 q-mb-md">
            Kelas: <strong class="text-black">{{ kelasTerpilih }}</strong>
          </div>

          <div v-if="totalWajibTerpilih === 0" class="text-center q-py-xl">
            <q-icon name="info" size="4rem" color="grey-5" />
            <div class="text-h6 text-grey-8 q-mt-sm">
              Data Tidak Valid, kelas belum memiliki jam pelajaran yang di-generate
            </div>
            <div class="text-grey-7">
              Belum ada slot jadwal dengan durasi jam pembelajaran normal yang ter-generate untuk
              kelas ini. Silakan cek template.
            </div>
          </div>

          <q-list
            v-else-if="slotKosongTerpilih.length > 0"
            bordered
            separator
            class="bg-white rounded-borders"
          >
            <q-item v-for="(slot, index) in slotKosongTerpilih" :key="index" dense>
              <q-item-section avatar>
                <q-avatar color="red-1" text-color="negative" icon="warning" size="md" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold text-grey-9">
                  {{ namaHari(slot.n_hari_id) }}
                </q-item-label>
                <q-item-label caption>
                  <span v-if="slot.keteranganJam" class="text-grey-7 text-weight-medium q-ml-xs">
                    {{ slot.keteranganJam }} <strong>({{ slot.c_jad_str }}</strong> s/d
                    <strong>{{ slot.c_jad_end }})</strong>
                  </span>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge color="negative" label="Kosong" />
              </q-item-section>
            </q-item>
          </q-list>

          <div v-else class="text-center q-py-xl">
            <q-icon name="task_alt" size="4rem" color="positive" />
            <div class="text-h6 text-positive q-mt-sm">Luar Biasa!</div>
            <div class="text-grey-7">Semua slot wajib pada kelas ini sudah terisi guru.</div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.hover-effect {
  transition: all 0.2s ease;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}
.hover-effect:hover {
  background-color: #e3f2fd;
  text-decoration: underline;
}

.compact-table {
  width: 100%;
}
.compact-table :deep(.q-table__middle) {
  overflow-x: hidden;
}
.compact-table :deep(th) {
  font-size: 12px;
  font-weight: 600;
  padding: 8px 8px;
}
.compact-table :deep(td) {
  padding: 6px 8px;
  font-size: 13px;
}
.cell-kelas {
  padding-left: 8px !important;
  vertical-align: middle;
}
.cell-status {
  padding-right: 8px !important;
  vertical-align: middle;
}

@media (max-width: 599px) {
  .compact-table :deep(th) {
    font-size: 11px;
    padding: 6px 4px;
  }
  .compact-table :deep(td) {
    padding: 4px 4px;
    font-size: 12px;
  }
  .cell-kelas {
    padding-left: 4px !important;
  }
  .cell-status {
    padding-right: 4px !important;
  }
  .hover-effect {
    padding: 2px 4px;
    font-size: 12px;
  }
}

@media (min-width: 600px) {
  .q-pa-md-md {
    padding: 16px;
  }
  .q-mb-md-md {
    margin-bottom: 16px;
  }
  .text-h5-md {
    font-size: 1.5rem;
  }
}
</style>

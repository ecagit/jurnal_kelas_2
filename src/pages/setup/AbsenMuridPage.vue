<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar, date } from 'quasar'
import { pb } from 'boot/pocketbase'
import { useAuthStore } from 'stores/authStore'
import { usePeriodeStore } from 'src/stores/periode'
import { useFilterStore } from 'src/stores/filter'
import { storeToRefs } from 'pinia'

// Inisialisasi Dependensi Utama
const $q = useQuasar()
const auth = useAuthStore()
const periodeStore = usePeriodeStore()
const filterStore = useFilterStore()

// Binding State Global dari Pinia Store
const { activePeriodeId } = storeToRefs(periodeStore)
const { filterKelas, filterTglJurnal } = storeToRefs(filterStore)

// State Komponen Utama
const rows = ref([])
const loading = ref(false)
const showForm = ref(false)
const isEdit = ref(false)

// Dropdown Options
const kelasOptions = ref([])
const filteredKelasOptions = ref([])
const masterMuridList = ref([])
const filteredMuridOptions = ref([])
const statusAbsenOptions = [
  //  { label: 'Hadir (H)', value: 'H' },
  { label: 'Izin (I)', value: 'I' },
  { label: 'Sakit (S)', value: 'S' },
  { label: 'Alpa (A)', value: 'A' },
  { label: 'Lambat (L)', value: 'L' },
]

const kolomAktif = ref([
  //  'id',
  'no',
  //  'c_periode', // Ditambahkan kembali untuk payload simpan
  //'d_tanggal',
  'c_murid_id',
  //  'c_kelas_id',
  'c_status_absen',
  'c_keterangan',
  'actions',
])

// State Server-Side Pagination
const pagination = ref({
  sortBy: 'created',
  descending: true,
  page: 1,
  rowsPerPage: 50, // Diperbesar agar bisa menampung 1 kelas full
  rowsNumber: 0,
})

// Skema Reaktif Model Form Absensi
const form = ref({
  id: '',
  c_periode: '', // Ditambahkan kembali untuk payload simpan
  d_tanggal: '',
  c_murid_id: '',
  c_kelas_id: '',
  c_status_absen: 'I',
  c_keterangan: '',
})

const columns = [
  {
    name: 'no',
    label: 'NO',
    align: 'center',
    field: 'no',
    classes: 'kolom-wrap',
    style: 'vertical-align: top;',
  },
  {
    name: 'd_tanggal',
    label: 'TANGGAL',
    align: 'center',
    field: 'd_tanggal',
    classes: 'kolom-wrap',
    style: 'vertical-align: top;',
  },
  {
    name: 'c_murid_id',
    label: 'NAMA',
    align: 'left',
    field: 'c_murid_id',
    classes: 'kolom-wrap',
    style: 'vertical-align: top;',
  },
  {
    name: 'c_kelas_id',
    label: 'KELAS',
    align: 'left',
    field: 'c_kelas_id',
    classes: 'kolom-wrap',
    style: 'vertical-align: top;',
  },
  {
    name: 'c_status_absen',
    label: 'STATUS',
    align: 'center',
    field: 'c_status_absen',
    classes: 'kolom-wrap',
    style: 'vertical-align: top;',
  },
  {
    name: 'c_keterangan',
    label: 'KET',
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
    //classes: 'kolom-wrap',
  },
]

// ============================================
// COMPUTED: CEGAH DUPLIKAT MURID
// ============================================
// Menghasilkan daftar murid yang BELUM diabsen pada tanggal/kelas tersebut
const availableMuridList = computed(() => {
  // Kumpulkan semua ID murid yang sudah ada di tabel saat ini
  const usedMuridIds = rows.value.map((row) => row.c_murid_id)

  return masterMuridList.value.filter((murid) => {
    // Jika mode edit, murid yang sedang diedit harus tetap dimunculkan di dropdown
    if (isEdit.value && form.value.c_murid_id === murid.value) {
      return true
    }
    // Sembunyikan murid yang ID-nya sudah ada di tabel (usedMuridIds)
    return !usedMuridIds.includes(murid.value)
  })
})

// ============================================
// LOGIKA UTILITAS & LOOKUP DATA
// ============================================
const getStatusLabel = (val) => {
  const match = statusAbsenOptions.find((opt) => opt.value === val)
  return match ? match.label : val
}

const getStatusBadgeColor = (val) => {
  switch (val) {
    case 'H':
      return 'positive'
    case 'I':
      return 'info'
    case 'S':
      return 'warning'
    case 'A':
      return 'negative'
    case 'L':
      return 'purple'
    default:
      return 'grey'
  }
}

const getMuridNama = (id) => {
  if (!id) return '-'
  const found = masterMuridList.value.find((m) => m.value === id)
  return found ? found.label : id
}

const getKelasNama = (id) => {
  if (!id) return '-'
  const found = kelasOptions.value.find((k) => k.value === id)
  return found ? found.label : id
}

// ============================================
// AJAX DATA LOADING (POCKETBASE)
// ============================================
const loadInitialDropdowns = async () => {
  try {
    kelasOptions.value = await auth.getKelasLookup()
    filteredKelasOptions.value = [...kelasOptions.value]

    if (kelasOptions.value.length === 1) {
      filterKelas.value = kelasOptions.value[0].value
    }
  } catch (err) {
    console.error('Gagal memuat dropdown utama:', err)
  }
}

const loadMuridByKelas = async (kelasId) => {
  if (!kelasId) {
    masterMuridList.value = []
    filteredMuridOptions.value = []
    return
  }
  try {
    const records = await pb.collection('tb_mst_murid').getFullList({
      filter: `c_kelas_id = "${kelasId}"`,
      sort: '+c_nama',
      requestKey: null,
    })

    const mapped = records.map((r) => ({
      label: r.c_nama,
      value: r.c_murid_id || r.id,
    }))

    masterMuridList.value = mapped
    // Inisialisasi awal menggunakan availableMuridList
    filteredMuridOptions.value = [...availableMuridList.value]
  } catch (err) {
    console.error('Gagal menarik master data murid:', err)
  }
}

const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination

  if (!filterKelas.value) {
    rows.value = []
    pagination.value.rowsNumber = 0
    return
  }

  loading.value = true
  try {
    const prd = String(activePeriodeId.value || '').trim()
    const kls = String(filterKelas.value).trim()

    // Gunakan kembali c_periode sebagai filter utama
    let filterString = `c_periode = "${prd}" && c_kelas_id = "${kls}"`

    if (filterTglJurnal.value) {
      const tgl = String(filterTglJurnal.value).trim()
      filterString += ` && d_tanggal >= "${tgl} 00:00:00" && d_tanggal <= "${tgl} 23:59:59"`
    }

    const result = await pb.collection('tb_tr_absen_murid').getList(page, rowsPerPage || 50, {
      sort: sortBy ? (descending ? `-${sortBy}` : `+${sortBy}`) : '-created',
      filter: filterString,
      requestKey: null,
    })

    rows.value = result.items
    pagination.value.rowsNumber = result.totalItems
    pagination.value.page = page
  } catch (err) {
    console.error('Error detail:', err)
    $q.notify({ type: 'negative', message: 'Gagal memuat data dari server' })
  } finally {
    loading.value = false
  }
}

// ============================================
// LOGIKA EVENT HANDLER & CRUD
// ============================================
const onFilterKelasChange = async (val) => {
  filterKelas.value = val
  await loadMuridByKelas(val)
  pagination.value.page = 1
  onRequest({ pagination: pagination.value })
}

const onFilterTanggalChange = (val) => {
  filterTglJurnal.value = val
  pagination.value.page = 1
  onRequest({ pagination: pagination.value })
}

const onRefresh = () => {
  onRequest({ pagination: pagination.value })
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
    filteredKelasOptions.value = kelasOptions.value.filter((v) =>
      v.label.toLowerCase().includes(needle),
    )
  })
}

const filterMuridFn = (val, update) => {
  if (val === '') {
    update(() => {
      // Ambil opsi dari list yang belum diabsen
      filteredMuridOptions.value = availableMuridList.value
    })
    return
  }
  update(() => {
    const needle = val.toLowerCase()
    // Saring berdasarkan ketikan HANYA dari list yang belum diabsen
    filteredMuridOptions.value = availableMuridList.value.filter((v) =>
      v.label.toLowerCase().includes(needle),
    )
  })
}

const bukaFormTambah = () => {
  isEdit.value = false
  form.value = {
    id: '',
    c_periode: activePeriodeId.value || '', // Masukkan periode saat tambah
    c_murid_id: '',
    c_kelas_id: filterKelas.value || '',
    c_status_absen: 'I',
    d_tanggal: filterTglJurnal.value || date.formatDate(Date.now(), 'YYYY-MM-DD'),
    c_keterangan: '',
  }
  showForm.value = true
}

const bukaFormEdit = (item) => {
  isEdit.value = true
  const formattedDate = item.d_tanggal ? item.d_tanggal.split(' ')[0] : ''

  form.value = {
    id: item.id,
    c_periode: item.c_periode || activePeriodeId.value,
    c_murid_id: item.c_murid_id,
    c_kelas_id: item.c_kelas_id,
    c_status_absen: item.c_status_absen,
    d_tanggal: formattedDate,
    c_keterangan: item.c_keterangan || '',
  }

  // --- KUNCI PERBAIKAN ---
  // Sinkronkan opsi dropdown di sini agar q-select bisa menemukan
  // pasangan value (id) dan label (nama) saat form pertama kali terbuka
  filteredMuridOptions.value = availableMuridList.value
  // -----------------------
  showForm.value = true
}

const simpanData = async () => {
  try {
    const payload = { ...form.value }
    delete payload.id

    // Pastikan periode selalu terkirim
    if (!payload.c_periode) payload.c_periode = activePeriodeId.value

    if (isEdit.value) {
      await pb.collection('tb_tr_absen_murid').update(form.value.id, payload)
      $q.notify({ type: 'positive', message: 'Data absensi murid berhasil diperbarui!' })
    } else {
      await pb.collection('tb_tr_absen_murid').create(payload)
      $q.notify({ type: 'positive', message: 'Data absensi murid berhasil ditambahkan!' })
    }
    showForm.value = false
    onRefresh()
  } catch (err) {
    console.error('Gagal eksekusi simpan absensi:', err)
    $q.notify({ type: 'negative', message: 'Terjadi kegagalan saat merekam data ke server' })
  }
}

const hapusData = (id) => {
  $q.dialog({
    title: 'Konfirmasi Hapus',
    message: 'Apakah Anda yakin ingin menghapus baris rekam absensi murid ini?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await pb.collection('tb_tr_absen_murid').delete(id)
      $q.notify({ type: 'positive', message: 'Rekam absensi berhasil dihapus!' })
      onRefresh()
    } catch (err) {
      console.error('Gagal menghapus item:', err)
      $q.notify({ type: 'negative', message: 'Proses hapus gagal dieksekusi' })
    }
  })
}

onMounted(async () => {
  if (!filterTglJurnal.value) {
    filterTglJurnal.value = date.formatDate(Date.now(), 'YYYY-MM-DD')
  }

  await loadInitialDropdowns()

  if (filterKelas.value) {
    await loadMuridByKelas(filterKelas.value)
    onRequest({ pagination: pagination.value })
  }
})

watch(filterKelas, async (newKelas) => {
  if (newKelas) {
    await loadMuridByKelas(newKelas)
  }
})
</script>

<template>
  <q-page class="q-pa-sm">
    <!-- Tampilkan Filter + Tabel hanya jika form TIDAK aktif -->
    <div v-if="!showForm">
      <div class="row q-col-gutter-sm items-center q-mb-md">
        <div class="col-12 col-md-auto">
          <div class="text-h5 text-weight-bold"></div>
        </div>
        <div class="text-h6 q-mr-md">Absensi Murid</div>
        <div class="col-12 col-sm-4 col-md-3">
          <q-select
            v-model="filterKelas"
            :options="filteredKelasOptions"
            label="Filter Kelas"
            dense
            outlined
            emit-value
            map-options
            use-input
            input-debounce="300"
            @filter="filterKelasFn"
            @update:model-value="onFilterKelasChange"
          >
            <template v-slot:prepend>
              <q-icon name="book" color="primary" />
            </template>
          </q-select>
        </div>

        <div class="col-12 col-sm-4 col-md-3">
          <q-input
            v-model="filterTglJurnal"
            type="date"
            label="Filter Tanggal"
            dense
            outlined
            @update:model-value="onFilterTanggalChange"
          >
            <template v-slot:prepend>
              <q-icon name="today" color="primary" />
            </template>
          </q-input>
        </div>

        <div class="col-12 col-sm-4 col-md-auto row q-gutter-xs">
          <q-btn
            color="primary"
            icon="add"
            label="TAMBAH"
            dense
            class="q-px-sm"
            :disabled="!filterKelas || showForm || availableMuridList.length === 0"
            @click="bukaFormTambah"
          />
          <q-btn color="secondary" icon="refresh" dense flat round @click="onRefresh" />
        </div>
      </div>

      <q-banner
        v-if="availableMuridList.length === 0 && filterKelas && rows.length > 0"
        class="bg-positive text-white q-mb-md rounded-borders"
      >
        <template v-slot:avatar>
          <q-icon name="check_circle" />
        </template>
        Semua murid di kelas ini sudah diabsen untuk tanggal tersebut.
      </q-banner>

      <q-table
        v-model:pagination="pagination"
        :rows="rows"
        :columns="columns"
        :visible-columns="kolomAktif"
        row-key="id"
        :loading="loading"
        binary-state-sort
        separator="cell"
        outlined
        bordered
        class="my-zebra-table"
        flat
        square
        @request="onRequest"
      >
        <template v-slot:no-data>
          <div class="full-width row flex-center text-weight-medium q-pa-md text-grey-8">
            <q-icon name="warning" color="warning" size="sm" class="q-mr-sm" />
            <span>Belum ada data absensi untuk kelas dan tanggal ini</span>
          </div>
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
        <template v-slot:body-cell-c_murid_id="props">
          <q-td :props="props">
            <span class="text-weight-bold">{{ getMuridNama(props.row.c_murid_id) }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-c_kelas_id="props">
          <q-td :props="props">
            {{ getKelasNama(props.row.c_kelas_id) }}
          </q-td>
        </template>

        <template v-slot:body-cell-c_status_absen="props">
          <q-td :props="props" class="text-center">
            <q-badge
              :color="getStatusBadgeColor(props.row.c_status_absen)"
              class="text-weight-bold q-pa-xs"
            >
              {{ getStatusLabel(props.row.c_status_absen) }}
            </q-badge>
          </q-td>
        </template>

        <template v-slot:body-cell-d_tanggal="props">
          <q-td :props="props" class="text-center">
            {{ props.row.d_tanggal ? props.row.d_tanggal.split(' ')[0] : '-' }}
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs text-center">
            <q-btn
              flat
              round
              dense
              color="primary"
              icon="edit"
              size="md"
              @click="bukaFormEdit(props.row)"
            />
            <q-btn
              flat
              round
              dense
              color="negative"
              icon="delete"
              size="sm"
              @click="hapusData(props.row.id)"
            />
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- Form Add/Edit (muncul saat showForm true) dengan gaya header baru -->
    <q-card v-else flat bordered>
      <!-- <q-card-section class="row items-center q-px-md q-py-sm bg-none text-primary"> -->
      <q-card-section class="row items-center q-px-md q-py-sm bg-primary text-white">
        <q-btn flat round dense icon="arrow_back" @click="showForm = false" class="q-mr-sm" />
        <div class="text-h6 text-weight-normal">
          {{ isEdit ? 'Edit Absensi Murid' : 'Tambah Absensi Murid' }}
        </div>
      </q-card-section>

      <q-form @submit.prevent="simpanData">
        <q-card-section class="row q-col-gutter-xs q-pt-md">
          <div class="col-12 col-sm-6">
            <q-input
              v-model="form.d_tanggal"
              type="date"
              label="Tanggal (Wajib)"
              outlined
              clearable
              dense
              disable
              :rules="[(val) => !!val || 'Tanggal harus dipilih']"
              class="q-mb-none"
            >
              <template v-slot:prepend>
                <q-icon name="date_range" color="primary" />
              </template>
            </q-input>
          </div>

          <div class="col-12 col-sm-6">
            <q-select
              v-model="form.c_kelas_id"
              :options="filteredKelasOptions"
              label="Pilih Kelas (Wajib)"
              outlined
              dense
              emit-value
              map-options
              use-input
              disable
              input-debounce="300"
              @filter="filterKelasFn"
              :rules="[(val) => !!val || 'Kelas harus dipilih']"
              class="q-mb-none"
            >
              <!--
              hide-bottom-space class="q-mb-none"
              :rules="[(val) => !!val || 'Kelas harus dipilih']"
              -->
              <template v-slot:prepend>
                <q-icon name="class" color="primary" />
              </template>
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey">
                    Tidak ada kelas yang tersedia / Semua sudah diabsen
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>

          <div class="col-12 col-sm-6">
            <q-select
              v-model="form.c_murid_id"
              :options="filteredMuridOptions"
              label="Pilih Murid (Wajib)"
              outlined
              dense
              emit-value
              map-options
              use-input
              clearable
              input-debounce="300"
              @filter="filterMuridFn"
              :rules="[(val) => !!val || 'Murid harus dipilih']"
              class="q-mb-none"
            >
              <template v-slot:prepend>
                <q-icon name="person" color="primary" />
              </template>
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey">
                    Tidak ada murid yang tersedia / Semua sudah diabsen
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>

          <div class="col-12 col-sm-6">
            <q-select
              v-model="form.c_status_absen"
              :options="statusAbsenOptions"
              label="Status Absensi (Wajib)"
              outlined
              dense
              emit-value
              clearable
              map-options
              :rules="[(val) => !!val || 'Status absensi harus ditentukan']"
              class="q-mb-none"
            >
              <template v-slot:prepend>
                <q-icon name="notifications" color="primary" />
              </template>
            </q-select>
          </div>

          <div class="col-12">
            <q-input
              v-model="form.c_keterangan"
              type="textarea"
              label="Keterangan / Catatan Tambahan"
              outlined
              dense
              rows="1"
              clearable
              class="q-mb-none"
            >
              <template v-slot:prepend>
                <q-icon name="description" color="primary" />
              </template>
            </q-input>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="text-primary q-pb-md q-px-md bg-grey-1 q-mt-md">
          <q-btn flat color="negative" label="Batal" @click="showForm = false" />
          <q-btn color="primary" icon="save" label="Simpan" type="submit" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-page>
</template>

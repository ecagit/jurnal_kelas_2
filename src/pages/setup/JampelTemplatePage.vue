<script setup>
import { ref, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { pb } from 'boot/pocketbase'
import { SET_HARI } from 'src/lib/constants'
import { getJamtemplateLookup, getKelasLookup } from 'src/lib/utils'
import { handlePBError } from 'src/lib/errorHandler'

const $q = useQuasar()

// State Data Table & UI
const rows = ref([])
const loading = ref(false)
const filter = ref('')
const showForm = ref(false)
const isEdit = ref(false)

// Options untuk Dropdown
const jamOptions = ref([])
const kelasOptions = ref([])

// Master jamsat (durasi, keterangan, & status utama)
const jamsatMap = ref({}) // { "JPL01": { durasi: 40, nama: "Jam ke 1", utama: "true" }, ... }

// State Pagination & Sorting Server-Side
const pagination = ref({
  sortBy: 'c_name',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

// State Form
const form = ref({
  id: '',
  c_name: '',
  j_hari_id: [],
  c_jam_str: '',
  j_jampel: [],
  j_jampel_2: [], // akan diisi otomatis
  j_kelas_id: [],
  b_aktif: false,
  c_keterangan: '',
})

// ============================================
// KONFIGURASI KOLOM Q-TABLE
// ============================================
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no', style: 'vertical-align: top;' },
  {
    name: 'c_name',
    label: 'NAMA',
    align: 'left',
    field: 'c_name',
    classes: 'kolom-wrap',
    sortable: true,
  },
  {
    name: 'j_hari_id',
    label: 'HARI',
    align: 'left',
    field: 'j_hari_id',
    classes: 'kolom-wrap',
  },
  {
    name: 'c_jam_str',
    label: 'MULAI',
    align: 'center',
    field: 'c_jam_str',
    classes: 'kolom-wrap',
  },
  {
    name: 'j_jampel',
    label: 'JAM KE',
    align: 'left',
    field: 'j_jampel',
    style: 'vertical-align: top;',
  },
  {
    name: 'j_jampel_2',
    label: 'JAM PELAJARAN',
    align: 'left',
    field: 'j_jampel_2',
    style: 'vertical-align: top;',
  },
  {
    name: 'j_kelas_id',
    label: 'KELAS PENGGUNA',
    align: 'left',
    field: 'j_kelas_id',
    style: 'vertical-align: top;',
  },
  {
    name: 'b_aktif',
    label: 'AKTIF',
    align: 'center',
    field: 'b_aktif',
    style: 'vertical-align: top;',
  },
  {
    name: 'c_keterangan',
    label: 'KETERANGAN',
    align: 'left',
    field: 'c_keterangan',
    classes: 'kolom-wrap',
    sortable: true,
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
      const found = jamOptions.value.find((opt) => opt.value === j)
      return found ? found.label : j
    })
    .join(', ')
}

// Helper manipulasi waktu
const addMinutesToTime = (timeStr, minutes) => {
  const [hours, mins] = timeStr.split(':').map(Number)
  const totalMinutes = hours * 60 + mins + minutes
  const newHours = Math.floor(totalMinutes / 60) % 24
  const newMins = totalMinutes % 60
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`
}

// Fungsi utama generate j_jampel_2
const generateJampelDetail = (jamIds, startTime) => {
  if (!jamIds || !jamIds.length || !startTime) return []
  if (!jamsatMap.value || Object.keys(jamsatMap.value).length === 0) return []

  let currentTime = startTime
  const result = []

  for (const jamId of jamIds) {
    const jamInfo = jamsatMap.value[jamId]
    if (!jamInfo) {
      console.warn(`ID Jam ${jamId} tidak ditemukan di master jamsat`)
      continue
    }

    const durasi = jamInfo.durasi
    const akhir = addMinutesToTime(currentTime, durasi)

    // DIUBAH: Menyisipkan key "utama" bernilai string ("true"/"false") ke dalam struktur elemen
    result.push({
      akhir: akhir,
      durasi: durasi,
      id: jamId,
      keterangan: jamInfo.nama,
      mulai: currentTime,
      utama: jamInfo.utama,
    })

    currentTime = akhir // waktu berikutnya
  }
  return result
}

// Load master tb_mst_jamsat
const loadJamsatData = async () => {
  try {
    const records = await pb.collection('tb_mst_jamsat').getFullList({
      $autoCancel: false,
    })
    const map = {}
    records.forEach((rec) => {
      map[rec.c_jam_id] = {
        durasi: Number(rec.n_durasi),
        nama: rec.c_nama,
        // DIUBAH: Mengambil b_utama dan mengubahnya ke string "true" atau "false"
        //utama: rec.b_utama !== undefined ? String(rec.b_utama) : 'false',
        utama: rec.b_utama !== undefined ? Boolean(rec.b_utama) : false,
      }
    })
    jamsatMap.value = map
    console.log('✅ Master jamsat loaded:', Object.keys(map).length)
  } catch (err) {
    console.error('Gagal load tb_mst_jamsat:', err)
    $q.notify({ type: 'negative', message: 'Gagal memuat data durasi jam pelajaran.' })
  }
}

const loadDropdowns = async () => {
  try {
    const [jamtemplateData, kelasData] = await Promise.all([
      getJamtemplateLookup(),
      getKelasLookup(),
    ])
    jamOptions.value = jamtemplateData
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
    let sortString = ''
    if (sortBy) {
      sortString = descending ? `-${sortBy}` : `+${sortBy}`
    }

    let filterString = ''
    if (filterValue) {
      filterString = `c_name ~ "${filterValue}" || c_keterangan ~ "${filterValue}"`
    }

    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage

    const result = await pb.collection('tb_mst_jampel_template').getList(page, fetchLimit, {
      sort: sortString,
      filter: filterString,
    })

    rows.value = result.items

    pagination.value.page = page
    pagination.value.rowsPerPage = rowsPerPage
    pagination.value.sortBy = sortBy
    pagination.value.descending = descending
    pagination.value.rowsNumber = result.totalItems
  } catch (error) {
    console.error('Gagal mengambil data:', error)
    $q.notify({ type: 'negative', message: 'Gagal memuat data pola jam.' })
  } finally {
    loading.value = false
  }
}

// ============================================
// FUNGSI CRUD
// ============================================
const simpanData = async () => {
  try {
    if (form.value.j_jampel.length && form.value.c_jam_str) {
      form.value.j_jampel_2 = generateJampelDetail(form.value.j_jampel, form.value.c_jam_str)
    }

    const payload = {
      c_name: form.value.c_name,
      j_hari_id: form.value.j_hari_id,
      c_jam_str: form.value.c_jam_str,
      j_jampel: form.value.j_jampel,
      j_jampel_2: form.value.j_jampel_2,
      j_kelas_id: form.value.j_kelas_id,
      b_aktif: form.value.b_aktif,
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
    onRequest({ pagination: pagination.value, filter: filter.value })
  } catch (error) {
    console.error('Proses simpan gagal:', error)
    handlePBError(error, {
      c_name: {
        validation_not_unique: `Gagal! Nama Template "${form.value.c_name}" sudah ada.`,
      },
    })
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
    c_jam_str: '',
    j_jampel: [],
    j_jampel_2: [],
    j_kelas_id: [],
    b_aktif: false,
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
    c_jam_str: item.c_jam_str || '',
    j_jampel: Array.isArray(item.j_jampel) ? item.j_jampel : [],
    j_jampel_2: [],
    j_kelas_id: Array.isArray(item.j_kelas_id) ? item.j_kelas_id : [],
    b_aktif: item.b_aktif ?? false,
    c_keterangan: item.c_keterangan || '',
  }
  showForm.value = true
  if (form.value.j_jampel.length && form.value.c_jam_str) {
    form.value.j_jampel_2 = generateJampelDetail(form.value.j_jampel, form.value.c_jam_str)
  }
}

const tutupForm = () => {
  showForm.value = false
}

// ============================================
// WATCHER: Otomatis generate j_jampel_2
// ============================================
watch(
  () => [form.value.j_jampel, form.value.c_jam_str],
  ([newJam, newStart]) => {
    if (
      newJam &&
      newJam.length &&
      newStart &&
      jamsatMap.value &&
      Object.keys(jamsatMap.value).length > 0
    ) {
      form.value.j_jampel_2 = generateJampelDetail(newJam, newStart)
    } else {
      form.value.j_jampel_2 = []
    }
  },
  { deep: true },
)

onMounted(async () => {
  await loadJamsatData()
  await loadDropdowns()
  onRequest({ pagination: pagination.value, filter: filter.value })
})
</script>

<template>
  <div class="q-pa-sm">
    <q-card v-if="!showForm" flat bordered>
      <q-table
        title="Data Pola Jam Pelajaran"
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
            placeholder="Cari Nama..."
            label="Cari Nama..."
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
        </template>

        <template v-slot:body-cell-no="props">
          <q-td :props="props" class="text-center">
            {{ props.rowIndex + 1 }}
          </q-td>
        </template>

        <template v-slot:body-cell-j_hari_id="props">
          <q-td :props="props">
            <div
              v-for="(hari, index) in String(getTampilanHari(props.row.j_hari_id)).split(',')"
              :key="index"
              class="q-py-xs"
            >
              {{ hari.trim() }}
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-c_jam_str="props">
          <q-td :props="props">
            {{ props.row.c_jam_str || '-' }}
          </q-td>
        </template>

        <template v-slot:body-cell-j_jampel="props">
          <q-td :props="props">
            <div
              v-for="(jam, index) in String(getTampilanJam(props.row.j_jampel)).split(',')"
              :key="index"
              class="q-py-xs"
            >
              {{ jam.trim() }}
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-j_jampel_2="props">
          <q-td :props="props">
            <div v-for="(item, idx) in props.row.j_jampel_2" :key="idx" class="q-py-xs">
              {{ item.mulai }} - {{ item.akhir }} ({{ item.durasi }} mnt) : {{ item.id }}
              <q-badge v-if="item.utama" color="orange" size="xs" label="Utama" class="q-ml-xs" />
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-j_kelas_id="props">
          <q-td :props="props">
            <template v-if="Array.isArray(props.row.j_kelas_id) && props.row.j_kelas_id.length > 0">
              <div v-for="(kId, index) in props.row.j_kelas_id" :key="index" class="q-py-xs">
                {{ kelasOptions.find((opt) => opt.value === kId)?.label || kId }}
              </div>
            </template>
            <template v-else>
              {{ props.row.j_kelas_id || '-' }}
            </template>
          </q-td>
        </template>

        <template v-slot:body-cell-b_aktif="props">
          <q-td :props="props">
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

      <q-card-section class="q-pa-sm">
        <q-form @submit.prevent="simpanData" class="q-gutter-y-md">
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
              <q-input
                v-model="form.c_jam_str"
                label="Jam Mulai *"
                outlined
                dense
                mask="##:##"
                fill-mask
                hint="Format: HH:MM"
                required
              />
            </div>

            <div class="col-12 col-md-6">
              <q-select
                v-model="form.j_jampel"
                :options="jamOptions"
                option-value="value"
                option-label="label"
                label="Jam Ke *"
                emit-value
                map-options
                multiple
                use-chips
                clearable
                outlined
                dense
                required
              />
            </div>

            <div class="col-12 col-md-6">
              <q-card flat bordered class="bg-grey-1" style="height: 100%">
                <q-card-section class="q-pa-sm">
                  <div class="text-subtitle2 q-mb-xs q-px-xs">Preview Detail Jam Pelajaran</div>

                  <div v-if="form.j_jampel_2 && form.j_jampel_2.length" class="overflow-auto">
                    <q-markup-table flat dense>
                      <thead class="bg-grey-3">
                        <tr>
                          <th class="text-left">Jam Pelajaran</th>
                          <th class="text-center">Waktu</th>
                          <th class="text-center">Durasi</th>
                          <th class="text-center">Utama</th>
                          <th class="text-left">ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(item, idx) in form.j_jampel_2" :key="idx">
                          <td class="text-left text-caption">{{ item.keterangan }}</td>
                          <td class="text-center">{{ item.mulai }} - {{ item.akhir }}</td>
                          <td class="text-center">{{ item.durasi }}m</td>
                          <td class="text-center">
                            <q-icon
                              :name="item.utama ? 'star' : 'radio_button_unchecked'"
                              :color="item.utama ? 'orange' : 'grey-4'"
                            />
                          </td>
                          <td class="text-left text-weight-bold">{{ item.id }}</td>
                        </tr>
                      </tbody>
                    </q-markup-table>
                  </div>

                  <div v-else class="text-grey-6 text-caption q-pa-md text-center">
                    <q-icon name="info" size="sm" class="q-mr-xs" />
                    Pilih Jam Pelajaran & Jam Start untuk melihat preview.
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-md-6">
              <q-select
                v-model="form.j_kelas_id"
                :options="kelasOptions"
                option-value="value"
                option-label="label"
                label="Kelas Pengguna"
                emit-value
                map-options
                multiple
                use-chips
                outlined
                dense
                clearable
              />
            </div>

            <div class="col-12 col-md-6">
              <q-toggle
                v-model="form.b_aktif"
                :label="form.b_aktif ? 'Aktif' : 'Nonaktif'"
                color="green"
                keep-color
                icon="check"
                size="lg"
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
  </div>
</template>

<style scoped>
/* CSS scoped tetap */
</style>

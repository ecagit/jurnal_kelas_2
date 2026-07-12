<script setup>
//mark update 2 - Optimasi Generate & Paralel Request
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { date } from 'quasar'
import { pb } from 'boot/pocketbase'
import { SET_HARI } from 'src/lib/constants'
import { getJamtemplateLookup } from 'src/lib/utils'
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

const filterStore = useFilterStore()
const { filterKelas, filterTglJurnal } = storeToRefs(filterStore)

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

// State Pagination & Sorting Server-Side
const pagination = ref({
  sortBy: 'd_tanggal',
  descending: false,
  page: 1,
  rowsPerPage: 20,
  rowsNumber: 0,
})

// State Form
const form = ref({
  id: '',
  c_periode: '',
  d_tanggal: '',
  c_kelas_id: '',
  n_hari_id: '',
  c_guru_id: '',
  c_jam_id: '',
  c_jad_str: '',
  c_jad_end: '',
  n_jad_dur: '',
  c_chk_str: '',
  c_chk_end: '',
  n_chk_dur: '',
  c_keterangan: '',
  b_add: '',
})

const kolomAktif = ref([
  'c_guru_id',
  'c_jam_id',
  'c_jad_str',
  'c_chk_str',
  'c_keterangan',
  'b_add',
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
    style: 'vertical-align: top;',
  },
  {
    name: 'd_tanggal',
    label: 'TANGGAL',
    align: 'left',
    field: 'd_tanggal',
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
    name: 'n_hari_id',
    label: 'HARI',
    align: 'center',
    field: 'n_hari_id',
    style: 'vertical-align: top;',
  },
  {
    name: 'c_jam_id',
    label: 'JAM',
    align: 'left',
    field: 'c_jam_id',
    classes: 'kolom-wrap',
    style: 'width: 30px; vertical-align: top;',
  },
  {
    name: 'c_jad_str',
    label: 'JADWAL',
    align: 'center',
    field: 'c_jad_str',
    style: 'width: 30px; vertical-align: top;',
  },
  {
    name: 'c_guru_id',
    label: 'GURUU',
    align: 'left',
    field: 'c_guru_id',
    classes: 'kolom-wrap',
    style: 'vertical-align: top;',
  },
  {
    name: 'c_chk_str',
    label: 'IN/OUT',
    align: 'center',
    field: 'c_chk_str',
    style: 'width: 30px; vertical-align: top;',
  },
  {
    name: 'n_jad_dur',
    label: 'DURASI',
    align: 'center',
    field: 'n_jad_dur',
    style: 'vertical-align: top;',
  },
  {
    name: 'c_jad_end',
    label: 'JAM SELESAI',
    align: 'center',
    field: 'c_jad_end',
    style: 'vertical-align: top;',
  },
  {
    name: 'c_keterangan',
    label: 'CATATAN',
    align: 'left',
    field: 'c_keterangan',
    classes: 'kolom-wrap',
    style: 'vertical-align: top;',
  },
  {
    name: 'b_add',
    label: 'JAM +',
    align: 'left',
    field: 'b_add',
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

const formatTanggalIndo = (tgl) => {
  if (!tgl) return '-'
  return date.formatDate(tgl, 'DD MMM YYYY')
}

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
    jamOptions.value = await getJamtemplateLookup()
    kelasOptions.value = await auth.getKelasLookup()
    guruOptions.value = await auth.getGuruLookup()
    filteredKelasOptions.value = [...kelasOptions.value]

    if (kelasOptions.value.length === 1) {
      filterKelas.value = kelasOptions.value[0].value
    }
  } catch (error) {
    console.error('Gagal memuat opsi dropdown:', error)
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
// FUNGSI FETCH DATA TABEL
// ============================================
// ============================================
// FUNGSI FETCH DATA TABEL (REVISI SORTING WAKTU)
// ============================================
const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  loading.value = true

  try {
    if (!filterKelas.value || !filterTglJurnal.value) {
      rows.value = []
      pagination.value.rowsNumber = 0
      loading.value = false
      return
    }

    // ==========================================
    // MODIFIKASI SORTING DISINI:
    // Menerapkan secondary sort agar selalu urut jam
    // ==========================================
    let sortString = ''

    if (sortBy === 'd_tanggal') {
      // Jika Q-Table default mengurutkan berdasarkan tanggal, tambahkan jam sebagai urutan kedua
      sortString = descending ? '-d_tanggal,-c_jad_str' : '+d_tanggal,+c_jad_str'
    } else if (sortBy === 'c_jad_str') {
      // Jika user menekan header kolom jam
      sortString = descending ? '-c_jad_str' : '+c_jad_str'
    } else if (sortBy) {
      // Untuk kolom lainnya
      sortString = descending ? `-${sortBy}` : `+${sortBy}`
    } else {
      // Default fallback jika tidak ada sort dari UI
      sortString = '+d_tanggal,+c_jad_str'
    }

    const prd = String(activePeriodeId.value).trim()
    const kls = String(filterKelas.value).trim()
    const tgl = String(filterTglJurnal.value).trim()

    let filterString = `c_periode = "${prd}" && c_kelas_id = "${kls}"`

    const startDate = `${tgl} 00:00:00`
    const endDate = `${tgl} 23:59:59`
    filterString += ` && d_tanggal >= "${startDate}" && d_tanggal <= "${endDate}"`

    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage
    const result = await pb.collection('tb_tr_jurnal_guru').getList(page, fetchLimit, {
      sort: sortString,
      filter: filterString,
    })

    // Update State
    pagination.value = {
      ...pagination.value,
      page,
      rowsPerPage,
      rowsNumber: result.totalItems,
      sortBy,
      descending,
    }

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

const onFilterTglJurnalChange = (val) => {
  filterTglJurnal.value = val
  pagination.value.page = 1
  onRequest({ pagination: pagination.value })
}

// ============================================
// FUNGSI TANGGAL
// ============================================
const getDateRange = (dateNow, activeDays = []) => {
  const now = new Date(dateNow)
  const currentDay = now.getDay()
  const diffToMonday = currentDay === 0 ? 6 : currentDay - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diffToMonday)

  const date_range = activeDays.map((dayValue) => {
    const targetDate = new Date(monday)
    const offset = dayValue === 0 ? 6 : dayValue - 1
    targetDate.setDate(monday.getDate() + offset)

    const yyyy = targetDate.getFullYear()
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0')
    const dd = String(targetDate.getDate()).padStart(2, '0')

    return {
      label: dayValue,
      value: `${yyyy}-${mm}-${dd}`,
    }
  })

  return date_range.sort((a, b) => a.label - b.label)
}

// ================== FUNGSI 1: confirmGenerate ==================
const confirmGenerate = () => {
  if (!filterKelas.value) {
    $q.notify({ type: 'warning', message: 'Silahkan pilih kelas pada filter terlebih dahulu!' })
    return
  }
  if (!filterTglJurnal.value) {
    $q.notify({ type: 'warning', message: 'Silahkan pilih tanggal pada filter terlebih dahulu!' })
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
    title: 'Konfirmasi Buat Jurnal Guru',
    message: `Yakin ingin membuat Jurnal Guru untuk kelas <strong>${namaKelas} dalam 1 pekan di tanggal ${formatTanggalIndo(filterTglJurnal.value)}</strong> ?`,
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    genJampelJurnalGuru(activePeriodeId.value, filterKelas.value, filterTglJurnal.value)
  })
}

// ================== FUNGSI 2: genJampelJurnalGuru (DIOPTIMASI) ==================
const genJampelJurnalGuru = async (periode, kelasId, tanggal) => {
  try {
    loading.value = true

    // Optimasi 1: Fetch master jadwal HANYA SEKALI, fungsi getActiveDays dihapus
    const masterJadwalRecords = await pb.collection('tb_mst_jadwal').getFullList({
      filter: `c_periode = "${periode}" && c_kelas_id = "${kelasId}"`,
    })

    if (masterJadwalRecords.length === 0) {
      $q.notify({ type: 'negative', message: 'Master Jadwal untuk kelas ini belum dibuat!' })
      loading.value = false
      return
    }

    // Ekstrak hari aktif langsung dari data fetch di atas
    const daysSet = new Set()
    masterJadwalRecords.forEach((item) => {
      if (item.n_hari_id !== null && item.n_hari_id !== undefined) {
        daysSet.add(Number(item.n_hari_id))
      }
    })
    const dataActiveDays = Array.from(daysSet)

    // Validasi tanggal yang dipilih
    const dateNow = tanggal.replace(/-/g, '/')
    const currentDayJsIndex = new Date(dateNow).getDay()

    if (!dataActiveDays.includes(currentDayJsIndex)) {
      $q.notify({
        type: 'negative',
        message:
          'Tanggal yang dipilih tidak memiliki jadwal di master jadwal kelas ini. Proses dibatalkan.',
      })
      loading.value = false
      return
    }

    const dataDateRange = getDateRange(dateNow, dataActiveDays)
    const dataset = []

    // Bangun dataset
    for (const dt of dataDateRange) {
      const jadwalHariIni = masterJadwalRecords.filter((m) => Number(m.n_hari_id) === dt.label)
      for (const jadwal of jadwalHariIni) {
        dataset.push({
          c_periode: periode.trim(),
          d_tanggal: dt.value.trim(),
          c_kelas_id: kelasId.trim(),
          n_hari_id: String(dt.label).trim(),
          c_guru_id: (jadwal.c_guru_id || '').trim(),
          c_jam_id: jadwal.c_jam_id.trim(),
          c_jad_str: jadwal.c_jad_str.trim(),
          c_jad_end: jadwal.c_jad_end.trim(),
          n_jad_dur: jadwal.n_jad_dur,
          c_chk_str: '',
          c_chk_end: '',
          n_chk_dur: null,
          b_aktif: jadwal.b_aktif,
          b_add: jadwal.b_add === true,
          c_keterangan: '',
        })
      }
    }

    if (dataset.length === 0) {
      $q.notify({ type: 'warning', message: 'Tidak ada jam pelajaran untuk digenerate.' })
      loading.value = false
      return
    }

    // Panggil fungsi insert/update
    await InsertUpdateJadwalJurnal(periode, kelasId, dataset)
  } catch (error) {
    console.error('Error saat buat jurnal:', error)
    $q.notify({ type: 'negative', message: 'Gagal memproses pembuatan jurnal.' })
  } finally {
    loading.value = false
  }
}

// ================== FUNGSI 3: InsertUpdateJadwalJurnal (DIOPTIMASI) ==================
const InsertUpdateJadwalJurnal = async (periode, kelasId, dataset) => {
  try {
    const startTanggal = dataset[0].d_tanggal
    const endTanggal = dataset[dataset.length - 1].d_tanggal

    const startDateTime = `${startTanggal} 00:00:00`
    const endDateTime = `${endTanggal} 23:59:59`

    const existingJurnal = await pb.collection('tb_tr_jurnal_guru').getFullList({
      filter: `c_periode = "${periode}" && c_kelas_id = "${kelasId}" && d_tanggal >= "${startDateTime}" && d_tanggal <= "${endDateTime}"`,
    })

    const mapJurnalExists = {}
    existingJurnal.forEach((row) => {
      let tanggalDB = row.d_tanggal
      if (tanggalDB.includes('T')) tanggalDB = tanggalDB.split('T')[0]
      else if (tanggalDB.includes(' ')) tanggalDB = tanggalDB.split(' ')[0]

      const statusTambahan = row.b_add === true ? 'tambahan' : 'reguler'
      const key = `${tanggalDB.trim()}_${row.c_jam_id.trim()}_${statusTambahan}`
      mapJurnalExists[key] = row
    })

    // Optimasi 2: Gunakan penampungan API Promise
    const apiPromises = []

    for (const data of dataset) {
      const statusTambahanData = data.b_add === true ? 'tambahan' : 'reguler'
      const key = `${data.d_tanggal.trim()}_${data.c_jam_id.trim()}_${statusTambahanData}`
      const existingRecord = mapJurnalExists[key]

      if (existingRecord) {
        // Push perintah update ke array, dengan requestKey null agar tidak auto-cancel
        apiPromises.push(
          pb.collection('tb_tr_jurnal_guru').update(
            existingRecord.id,
            {
              n_hari_id: data.n_hari_id,
              c_jad_str: data.c_jad_str,
              c_jad_end: data.c_jad_end,
              n_jad_dur: data.n_jad_dur,
              c_guru_id: data.c_guru_id,
              b_add: data.b_add,
            },
            { requestKey: null },
          ),
        )
      } else {
        // Push perintah create ke array
        apiPromises.push(pb.collection('tb_tr_jurnal_guru').create(data, { requestKey: null }))
      }
    }

    // Optimasi 3: Chunking (Jalankan promise sekaligus per 50 array untuk mencegah overheat jaringan)
    const chunkSize = 50
    for (let i = 0; i < apiPromises.length; i += chunkSize) {
      const chunk = apiPromises.slice(i, i + chunkSize)
      await Promise.all(chunk)
    }

    $q.notify({ type: 'positive', message: 'Buat Jurnal Guru Berhasil!' })
    onRequest({ pagination: pagination.value })
  } catch (error) {
    console.error('Error InsertUpdate Jurnal:', error)
    throw error
  }
}

// ============================================
// FUNGSI CRUD
// ============================================
const hitungDurasiCheckin = () => {
  const startStr = form.value.c_chk_str || ''
  const endStr = form.value.c_chk_end || ''

  const parseToMinutes = (timeStr) => {
    if (!timeStr) return 0
    const parts = timeStr.split(':')
    let hour = 0,
      minute = 0

    if (parts.length >= 1) {
      const parsedHour = parseInt(parts[0], 10)
      hour = isNaN(parsedHour) ? 0 : parsedHour
    }
    if (parts.length >= 2) {
      const parsedMinute = parseInt(parts[1], 10)
      minute = isNaN(parsedMinute) ? 0 : parsedMinute
    }
    return hour * 60 + minute
  }

  const totalStartMin = parseToMinutes(startStr)
  const totalEndMin = parseToMinutes(endStr)

  if (totalEndMin >= totalStartMin) {
    form.value.n_chk_dur = totalEndMin - totalStartMin
  } else {
    form.value.n_chk_dur = 0
  }
}

const applyToAll = ref(false)

const simpanData = async () => {
  try {
    const payload = {
      c_periode: form.value.c_periode,
      d_tanggal: form.value.d_tanggal,
      c_kelas_id: form.value.c_kelas_id,
      n_hari_id: form.value.n_hari_id,
      c_guru_id: form.value.c_guru_id,
      c_jam_id: form.value.c_jam_id,
      c_jad_str: form.value.c_jad_str,
      c_jad_end: form.value.c_jad_end,
      n_jad_dur: form.value.n_jad_dur ? Number(form.value.n_jad_dur) : null,
      c_chk_str: form.value.c_chk_str,
      c_chk_end: form.value.c_chk_end,
      n_chk_dur: form.value.n_chk_dur ? Number(form.value.n_chk_dur) : null,
      c_keterangan: form.value.c_keterangan,
    }

    if (isEdit.value) {
      await pb.collection('tb_tr_jurnal_guru').update(form.value.id, payload)
      $q.notify({ type: 'positive', message: 'Data jurnal berhasil diupdate!' })

      if (applyToAll.value) {
        const dialog = await $q
          .dialog({
            title: 'Konfirmasi',
            message:
              'Anda akan menerapkan catatan dan mengisi check-in/out berdasarkan jadwal ke semua jam pelajaran pada tanggal, kelas, dan guru yang sama. Lanjutkan?',
            persistent: true,
            ok: { label: 'Ya, Terapkan', color: 'primary' },
            cancel: { label: 'Tidak', color: 'negative' },
          })
          .onOk(async () => {
            const tanggal = form.value.d_tanggal.split(' ')[0]
            const startDate = `${tanggal} 00:00:00`
            const endDate = `${tanggal} 23:59:59`

            const filterString = `c_periode = "${form.value.c_periode}" && c_kelas_id = "${form.value.c_kelas_id}" && d_tanggal >= "${startDate}" && d_tanggal <= "${endDate}" && c_guru_id = "${form.value.c_guru_id}" && id != "${form.value.id}"`

            const otherRecords = await pb.collection('tb_tr_jurnal_guru').getFullList({
              filter: filterString,
              requestKey: null,
            })

            if (otherRecords.length === 0) {
              $q.notify({
                type: 'info',
                message: 'Tidak ada jam pelajaran lain pada kriteria yang sama.',
              })
              return
            }

            const updatePromises = otherRecords.map((record) => {
              const jadwalStart = record.c_jad_str || ''
              const jadwalEnd = record.c_jad_end || ''
              let durasi = null
              if (jadwalStart && jadwalEnd) {
                const [startHour, startMin] = jadwalStart.split(':').map(Number)
                const [endHour, endMin] = jadwalEnd.split(':').map(Number)
                if (!isNaN(startHour) && !isNaN(startMin) && !isNaN(endHour) && !isNaN(endMin)) {
                  const totalStart = startHour * 60 + startMin
                  const totalEnd = endHour * 60 + endMin
                  durasi = totalEnd >= totalStart ? totalEnd - totalStart : 0
                }
              }
              return pb.collection('tb_tr_jurnal_guru').update(
                record.id,
                {
                  c_keterangan: form.value.c_keterangan,
                  c_chk_str: jadwalStart,
                  c_chk_end: jadwalEnd,
                  n_chk_dur: durasi,
                },
                { requestKey: null },
              )
            })
            await Promise.all(updatePromises)

            $q.notify({
              type: 'positive',
              message: `Berhasil menerapkan catatan dan mengisi check-in/out ke ${otherRecords.length} jam pelajaran lainnya.`,
            })
            await onRequest({ pagination: pagination.value })
          })
        await dialog
      }
    } else {
      await pb.collection('tb_tr_jurnal_guru').create(payload)
      $q.notify({ type: 'positive', message: 'Data jurnal berhasil ditambahkan!' })
    }

    tutupForm()
  } catch (error) {
    console.error('Gagal menyimpan:', error)
    $q.notify({ type: 'negative', message: 'Terjadi kesalahan saat menyimpan data jurnal.' })
  }
}

const hapusData = (id) => {
  $q.dialog({
    title: 'Konfirmasi',
    message: `Yakin ingin menghapus catatan jurnal ini?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await pb.collection('tb_tr_jurnal_guru').delete(id)
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
  const tglFormatted = filterTglJurnal.value ? filterTglJurnal.value.replace(/-/g, '/') : ''
  const hrIndex = filterTglJurnal.value ? new Date(filterTglJurnal.value).getDay() : ''

  form.value = {
    id: '',
    c_periode: activePeriodeId.value || '',
    d_tanggal: tglFormatted,
    c_kelas_id: filterKelas.value || '',
    n_hari_id: hrIndex !== '' ? String(hrIndex) : '',
    c_guru_id: '',
    c_jam_id: '',
    c_jad_str: '',
    c_jad_end: '',
    n_jad_dur: '',
    c_chk_str: '',
    c_chk_end: '',
    n_chk_dur: '',
    c_keterangan: '',
  }
  showForm.value = true
}

const bukaFormEdit = (item) => {
  isEdit.value = true

  const defaultChkStr = item.c_chk_str || item.c_jad_str
  const defaultChkEnd = item.c_chk_end || item.c_jad_end

  form.value = {
    id: item.id,
    c_periode: item.c_periode || '',
    d_tanggal: item.d_tanggal || '',
    c_kelas_id: item.c_kelas_id || '',
    n_hari_id: item.n_hari_id ? String(item.n_hari_id) : '',
    c_guru_id: item.c_guru_id || '',
    c_jam_id: item.c_jam_id || '',
    c_jad_str: item.c_jad_str || '',
    c_jad_end: item.c_jad_end || '',
    n_jad_dur: item.n_jad_dur ?? '',
    c_chk_str: defaultChkStr,
    c_chk_end: defaultChkEnd,
    n_chk_dur: item.n_chk_dur ?? item.n_jad_dur,
    c_keterangan: item.c_keterangan || '',
    b_add: item.b_add || false,
  }

  hitungDurasiCheckin()
  showForm.value = true
}

const tutupForm = () => {
  showForm.value = false
}

onMounted(async () => {
  if (!filterTglJurnal.value) {
    const today = date.formatDate(new Date(), 'YYYY-MM-DD')
    filterTglJurnal.value = today
  }
  await loadDropdowns()

  if (filterKelas.value && filterTglJurnal.value) {
    onRequest({ pagination: pagination.value })
  }
})
</script>

<template>
  <q-page class="q-pa-sm">
    <!-- Tampilkan Filter + Tabel hanya jika form TIDAK aktif -->
    <div v-if="!showForm">
      <!-- Baris Filter (seperti template contoh) -->
      <div class="row q-col-gutter-sm items-center q-mb-md">
        <div class="col-12 col-md-auto">
          <div class="text-h5 text-weight-bold"></div>
        </div>
        <div class="text-h6 q-mr-md">Jurnal Guru/Kelas</div>

        <!-- Filter Kelas -->
        <div class="col-12 col-sm-4 col-md-3">
          <q-select
            v-model="filterKelas"
            :options="filteredKelasOptions"
            label="Filter Kelas (Opsional)"
            dense
            outlined
            emit-value
            map-options
            use-input
            clearable
            input-debounce="300"
            @filter="filterKelasFn"
            @update:model-value="onFilterKelasChange"
          >
            <template v-slot:prepend>
              <q-icon name="class" color="primary" />
            </template>
          </q-select>
        </div>

        <!-- Filter Tanggal (Wajib) -->
        <div class="col-12 col-sm-4 col-md-3">
          <q-input
            v-model="filterTglJurnal"
            type="date"
            label="Filter Tanggal (Wajib)"
            dense
            outlined
            clearable
            @update:model-value="onFilterTglJurnalChange"
          >
            <template v-slot:prepend>
              <q-icon name="today" color="primary" />
            </template>
          </q-input>
        </div>

        <!-- Tombol Aksi -->
        <div class="col-12 col-sm-4 col-md-auto row q-gutter-xs">
          <q-btn
            color="primary"
            icon="add"
            label="TAMBAH"
            dense
            class="q-px-sm"
            :disabled="!filterKelas || !filterTglJurnal"
            @click="bukaFormTambah"
          />
          <q-btn
            color="secondary"
            icon="refresh"
            dense
            flat
            round
            @click="onRequest({ pagination })"
          />
        </div>
      </div>

      <!-- Q-Table -->
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
            <span>Silahkan pilih Kelas dan Tanggal terlebih dahulu</span>
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

        <template v-slot:body-cell-d_tanggal="props">
          <q-td :props="props">{{ props.row.d_tanggal || '-' }}</q-td>
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
          <q-td :props="props" class="text-center">
            <span class="text-weight-bold">{{ props.row.c_jad_str || '-' }}</span> <br />
            <span class="text-caption text-grey-6">{{ props.row.c_jad_end || '-' }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-c_chk_str="props">
          <q-td :props="props" class="text-center text-primary">
            <span class="text-weight-bold">{{ props.row.c_chk_str || '-' }}</span> <br />
            <span class="text-caption">{{ props.row.c_chk_end || '-' }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-b_add="props">
          <q-td :props="props" class="text-center">
            <q-chip
              :color="props.row.b_add ? 'positive' : 'grey'"
              text-color="white"
              dense
              icon="check"
              size="sm"
            />
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-x-sm">
            <q-btn
              flat
              dense
              color="primary"
              icon="edit"
              size="md"
              @click="bukaFormEdit(props.row)"
              title="Isi Jurnal"
            />
            <q-btn
              flat
              dense
              color="negative"
              icon="delete"
              size="sm"
              @click="hapusData(props.row.id)"
              title="Hapus"
            />
          </q-td>
        </template>
      </q-table>

      <!-- Tombol Generate (tetap dipertahankan) -->
      <div class="row justify-end q-pa-md">
        <q-btn
          color="indigo-7"
          label="Buat Jadwal 1 Pekan"
          icon="auto_awesome"
          @click="confirmGenerate"
          size="md"
          unelevated
        />
      </div>
    </div>

    <!-- Form Add/Edit dengan gaya baru seperti template contoh -->
    <q-card v-else flat bordered>
      <q-card-section class="row items-center q-px-md q-py-sm bg-primary text-white">
        <q-btn flat round dense icon="arrow_back" @click="tutupForm" class="q-mr-sm" />
        <div class="text-h6 text-weight-normal">
          {{ isEdit ? 'Isi Jurnal Guru/Kelas' : 'Tambah Jurnal Manual' }}
        </div>
      </q-card-section>

      <q-form @submit.prevent="simpanData">
        <q-card-section class="row q-col-gutter-xs q-pt-md">
          <!-- Informasi Jadwal -->
          <div class="col-12">
            <div class="text-subtitle2 text-primary q-mb-xs">
              Informasi Jadwal ({{ form.c_jad_str }} - {{ form.c_jad_end }})
            </div>
          </div>

          <!-- Kelas (disable) -->
          <div class="col-12 col-sm-6">
            <q-select
              v-model="form.c_kelas_id"
              :options="kelasOptions"
              label="Kelas"
              outlined
              dense
              emit-value
              map-options
              disable
              class="bg-grey-2"
            >
              <template v-slot:prepend>
                <q-icon name="class" color="primary" />
              </template>
            </q-select>
          </div>

          <!-- Tanggal (disable, format Indonesia) -->
          <div class="col-12 col-sm-6">
            <q-input
              :model-value="formatTanggalIndo(form.d_tanggal)"
              label="Tanggal"
              outlined
              dense
              disable
              class="bg-grey-2"
            >
              <template v-slot:prepend>
                <q-icon name="event" color="primary" />
              </template>
            </q-input>
          </div>

          <!-- Jam (disable) -->
          <div class="col-12 col-sm-6">
            <q-select
              v-model="form.c_jam_id"
              :options="jamOptions"
              label="Jam"
              outlined
              dense
              emit-value
              map-options
              disable
              class="bg-grey-2"
            >
              <template v-slot:prepend>
                <q-icon name="watch_later" color="primary" />
              </template>
            </q-select>
          </div>

          <!-- Guru (bisa diedit) -->
          <div class="col-12 col-sm-6">
            <q-select
              v-model="form.c_guru_id"
              :options="guruOptions"
              label="Guru"
              outlined
              dense
              emit-value
              map-options
              clearable
              class="bg-grey-2"
            >
              <template v-slot:prepend>
                <q-icon name="person" color="primary" />
              </template>
            </q-select>
          </div>

          <div class="col-12">
            <div class="text-subtitle2 text-primary q-mt-sm q-mb-xs">Isian Jurnal Mengajar</div>
          </div>

          <!-- Jam Mulai -->
          <div class="col-12 col-sm-4">
            <q-input
              v-model="form.c_chk_str"
              label="Mulai"
              outlined
              dense
              mask="##:##"
              fill-mask
              hint="HH:MM"
              hide-bottom-space
              @update:model-value="hitungDurasiCheckin"
            >
              <template v-slot:prepend>
                <q-icon name="schedule" color="primary" />
              </template>
            </q-input>
          </div>

          <!-- Jam Selesai -->
          <div class="col-12 col-sm-4">
            <q-input
              v-model="form.c_chk_end"
              label="Selesai"
              outlined
              dense
              mask="##:##"
              fill-mask
              hint="HH:MM"
              hide-bottom-space
              @update:model-value="hitungDurasiCheckin"
            >
              <template v-slot:prepend>
                <q-icon name="schedule" color="primary" />
              </template>
            </q-input>
          </div>

          <!-- Durasi (readonly) -->
          <div class="col-12 col-sm-4">
            <q-input
              v-model="form.n_chk_dur"
              label="Durasi (Menit)"
              outlined
              dense
              type="number"
              readonly
              class="bg-grey-2"
              hint="Otomatis"
              hide-bottom-space
            >
              <template v-slot:prepend>
                <q-icon name="history" color="primary" />
              </template>
            </q-input>
          </div>

          <!-- Catatan Jurnal -->
          <div class="col-12">
            <q-input
              v-model="form.c_keterangan"
              label="Catatan / Jurnal Mengajar"
              outlined
              dense
              type="textarea"
              autogrow
            >
              <template v-slot:prepend>
                <q-icon name="description" color="primary" />
              </template>
            </q-input>
          </div>

          <!-- Toggle Jam Tambahan (disable) -->
          <div class="col-12 col-md-6 flex items-center">
            <q-toggle
              v-model="form.b_add"
              label="Jam Tambahan"
              color="orange"
              icon="check"
              disable
              unchecked-icon="clear"
            />
          </div>

          <!-- 🔥 TAMBAHKAN TOGGLE di bawah textarea (hanya untuk mode edit) -->
          <div class="col-12" v-if="isEdit">
            <div class="row items-center q-mt-sm">
              <q-toggle
                v-model="applyToAll"
                color="primary"
                label="Terapkan ke semua jam pelajaran"
              />
              <q-icon
                name="info"
                size="sm"
                class="q-ml-xs text-grey-6"
                @click="
                  $q.notify({
                    message:
                      'Aktifkan untuk mengisi catatan yang sama ke seluruh jam pelajaran di tanggal dan kelas yang sama',
                    position: 'top',
                    type: 'info',
                  })
                "
              >
                <q-tooltip
                  >Mengisi catatan yang sama ke seluruh jam pelajaran di tanggal dan kelas yang sama
                  (tidak mempengaruhi jam mulai/selesai)</q-tooltip
                >
              </q-icon>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="text-primary q-pb-md q-px-md bg-grey-1 q-mt-md">
          <q-btn flat color="negative" label="Batal" @click="tutupForm" />
          <q-btn color="primary" icon="save" label="Simpan Jurnal" type="submit" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { date, useQuasar } from 'quasar'
import { pb } from 'boot/pocketbase'
import { useAuthStore } from 'src/stores/authStore'
import { usePeriodeStore } from 'src/stores/periode'
import { storeToRefs } from 'pinia'
import VueApexCharts from 'vue3-apexcharts'

// ✅ IMPORT KOMPONEN DASHBOARD JADWAL
import DashboardJadwal from 'src/components/DashboardJadwal.vue'

const $q = useQuasar()
const authStore = useAuthStore()
const periodeStore = usePeriodeStore()

const { activePeriodeId } = storeToRefs(periodeStore)
const currentUser = computed(() => authStore.user || {})
const activeContext = computed(() => authStore.roleContext || {})
const currentActiveRole = computed(() => authStore.activeRole)

// State Loading
const loadingWeek = ref(false)
const loadingMonth = ref(false)
const loadingAbsenWeek = ref(false)
const loadingAbsenMonth = ref(false)

// State Data Absen
const dataAbsenWeek = ref({
  target: 0,
  hadirTepat: 0,
  terlambat: 0,
  ijin: 0,
  sakit: 0,
  alpa: 0,
  persenHadir: 0,
  totalMurid: 0,
})
const dataAbsenMonth = ref({
  target: 0,
  hadirTepat: 0,
  terlambat: 0,
  ijin: 0,
  sakit: 0,
  alpa: 0,
  persenHadir: 0,
  totalMurid: 0,
})

const rangeDateWeek = ref({ start: '', end: '' })
const rangeDateMonth = ref({ start: '', end: '' })

// State Data Jurnal
const dataJurnalWeek = ref({ totalJam: 0, totalHadir: 0, totalBelum: 0, persentase: 0 })
const dataJurnalMonth = ref({ totalJam: 0, totalHadir: 0, totalBelum: 0, persentase: 0 })
const isLoading = ref(false)

const triggerUpload = () => {
  console.log('Fitur upload avatar diklik')
}

const isUploadingAvatar = ref(false)
const avatarUrl = computed(() => {
  if (currentUser.value?.avatar) {
    return pb.files.getURL(currentUser.value, currentUser.value.avatar, { thumb: '100x100' })
  }
  return null
})

const userRoles = computed(() => {
  return authStore.allRoles.map((name) => ({
    name: name,
    isActive: name === authStore.activeRole,
  }))
})

// Helper role-based rendering
const showJurnalCharts = computed(() => currentActiveRole.value === 'Guru')
const showAbsenCharts = computed(() =>
  ['Walikelas', 'Adminkelas', 'Murid'].includes(currentActiveRole.value),
)

// ============================================
// 🔥 FUNGSI TERPUSAT UNTUK LOAD DATA DASHBOARD
// ============================================
const loadDashboardData = async () => {
  const pRD = activePeriodeId.value
  const guruId = currentUser.value?.c_guru_id || currentUser.value?.c_emp_id
  const tglNow = date.formatDate(Date.now(), 'YYYY-MM-DD')
  const kelasId = activeContext.value?.c_kelas_id || ''

  if (!pRD) return

  try {
    const promises = []

    if (currentActiveRole.value === 'Guru' && guruId) {
      promises.push(GetJurnalThisWeek(pRD, guruId, tglNow))
      promises.push(GetJurnalThisMonth(pRD, guruId, tglNow))
    }

    if (['Walikelas', 'Adminkelas', 'Murid'].includes(currentActiveRole.value) && kelasId) {
      promises.push(GetAbsenThisWeek(pRD, kelasId, tglNow))
      promises.push(GetAbsenThisMonth(pRD, kelasId, tglNow))
    }

    // ✅ HAPUS: promises.push(loadJadwalData())
    // Komponen DashboardJadwal akan memuat datanya sendiri secara mandiri

    await Promise.all(promises)
  } catch (err) {
    console.error('Gagal memuat data dashboard:', err)
  }
}

const onRefresh = async (done) => {
  await loadDashboardData()
  done()
}

// ============================================
// FUNGSI JURNAL (PEKAN & BULAN) - TIDAK BERUBAH
// ============================================
const GetJurnalThisWeek = async (c_periode, c_guru_id, nowRef) => {
  loadingWeek.value = true
  try {
    const current = new Date(nowRef)
    const day = current.getDay()
    const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(current.setDate(diffToMonday))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const date_start = date.formatDate(monday, 'YYYY-MM-DD')
    const date_end = date.formatDate(sunday, 'YYYY-MM-DD')
    const filterJurnal = `c_periode = "${c_periode}" && c_guru_id = "${c_guru_id}" && d_tanggal >= "${date_start} 00:00:00" && d_tanggal <= "${date_end} 23:59:59"`
    const filterLibur = `c_periode = "${c_periode}" && b_aktif = true && d_tanggal >= "${date_start} 00:00:00" && d_tanggal <= "${date_end} 23:59:59"`
    const [records, hariLibur] = await Promise.all([
      pb.collection('tb_tr_jurnal_guru').getFullList({ filter: filterJurnal, requestKey: null }),
      pb.collection('tb_mst_hari_libur').getFullList({ filter: filterLibur, requestKey: null }),
    ])

    rangeDateWeek.value = {
      start: date.formatDate(monday, 'DD/MM/YYYY'),
      end: date.formatDate(sunday, 'DD/MM/YYYY'),
    }

    const listTanggalLibur = hariLibur.map((libur) => {
      let tgl = libur.d_tanggal
      if (tgl.includes('T')) return tgl.split('T')[0]
      if (tgl.includes(' ')) return tgl.split(' ')[0]
      return tgl
    })
    const validRecords = records.filter((item) => {
      let itemTgl = item.d_tanggal
      if (itemTgl.includes('T')) itemTgl = itemTgl.split('T')[0]
      else if (itemTgl.includes(' ')) itemTgl = itemTgl.split(' ')[0]
      return !listTanggalLibur.includes(itemTgl)
    })
    const totalJam = validRecords.length
    if (totalJam === 0) {
      $q.notify({
        type: 'warning',
        message:
          'Belum ada data jurnal. Pastikan jadwal sudah ditarik pada jurnal untuk melihat statistik kehadiran.',
        position: 'top',
        group: 'jadwal-kosong',
        timeout: 5000,
        icon: 'warning',
      })
    }
    const totalHadir = validRecords.filter(
      (item) => (item.c_chk_str && item.c_chk_end) || item.n_chk_dur > 0,
    ).length
    const totalBelum = totalJam - totalHadir
    const persentase = totalJam > 0 ? Math.round((totalHadir / totalJam) * 100) : 0
    dataJurnalWeek.value = { totalJam, totalHadir, totalBelum, persentase }
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'Gagal memuat statistik pekan ini' })
  } finally {
    loadingWeek.value = false
  }
}

const GetJurnalThisMonth = async (c_periode, c_guru_id, nowRef) => {
  loadingMonth.value = true
  try {
    const current = new Date(nowRef)
    const firstDay = new Date(current.getFullYear(), current.getMonth(), 1)
    const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0)
    const date_start = date.formatDate(firstDay, 'YYYY-MM-DD')
    const date_end = date.formatDate(lastDay, 'YYYY-MM-DD')
    const filterJurnal = `c_periode = "${c_periode}" && c_guru_id = "${c_guru_id}" && d_tanggal >= "${date_start} 00:00:00" && d_tanggal <= "${date_end} 23:59:59"`
    const filterLibur = `c_periode = "${c_periode}" && b_aktif = true && d_tanggal >= "${date_start} 00:00:00" && d_tanggal <= "${date_end} 23:59:59"`
    const [records, hariLibur] = await Promise.all([
      pb.collection('tb_tr_jurnal_guru').getFullList({ filter: filterJurnal, requestKey: null }),
      pb.collection('tb_mst_hari_libur').getFullList({ filter: filterLibur, requestKey: null }),
    ])

    rangeDateMonth.value = {
      start: date.formatDate(firstDay, 'DD/MM/YYYY'),
      end: date.formatDate(lastDay, 'DD/MM/YYYY'),
    }

    const listTanggalLibur = hariLibur.map((libur) => {
      let tgl = libur.d_tanggal
      if (tgl.includes('T')) return tgl.split('T')[0]
      if (tgl.includes(' ')) return tgl.split(' ')[0]
      return tgl
    })
    const validRecords = records.filter((item) => {
      let itemTgl = item.d_tanggal
      if (itemTgl.includes('T')) itemTgl = itemTgl.split('T')[0]
      else if (itemTgl.includes(' ')) itemTgl = itemTgl.split(' ')[0]
      return !listTanggalLibur.includes(itemTgl)
    })
    const totalJam = validRecords.length
    if (totalJam === 0) {
      $q.notify({
        type: 'warning',
        message:
          'Belum ada data jurnal. Pastikan jadwal sudah ditarik pada jurnal untuk melihat statistik kehadiran.',
        position: 'top',
        group: 'jadwal-kosong',
        timeout: 5000,
        icon: 'warning',
      })
    }
    const totalHadir = validRecords.filter(
      (item) => (item.c_chk_str && item.c_chk_end) || item.n_chk_dur > 0,
    ).length
    const totalBelum = totalJam - totalHadir
    const persentase = totalJam > 0 ? Math.round((totalHadir / totalJam) * 100) : 0
    dataJurnalMonth.value = { totalJam, totalHadir, totalBelum, persentase }
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'Gagal memuat statistik bulan ini' })
  } finally {
    loadingMonth.value = false
  }
}

// ============================================
// HELPER: GET VALID STUDY DATES & TOTAL MURID
// ============================================
const getValidDatesAndStudentCount = async (c_periode, c_kelas_id, dateStart, dateEnd) => {
  const muridRecords = await pb.collection('tb_mst_murid').getFullList({
    filter: `c_kelas_id = "${c_kelas_id}"`,
    requestKey: null,
  })
  const totalMurid = muridRecords.length
  const jadwal = await pb.collection('tb_mst_jadwal').getFullList({
    filter: `c_periode = "${c_periode}" && c_kelas_id = "${c_kelas_id}"`,
    requestKey: null,
  })
  const activeDaysOfWeek = [...new Set(jadwal.map((j) => Number(j.n_hari_id)))]
  if (activeDaysOfWeek.length === 0) {
    $q.notify({
      type: 'warning',
      message:
        'Data Master Jadwal untuk kelas ini belum tersedia. Target kehadiran tidak dapat dihitung.',
      position: 'top',
      group: 'jadwal-kosong',
      timeout: 5000,
      icon: 'warning',
    })
    return { totalMurid, validDates: [], totalTargetKehadiran: 0 }
  }
  const validDates = []
  let curr = new Date(dateStart)
  let end = new Date(dateEnd)
  while (curr <= end) {
    let dayIndex = curr.getDay()
    if (activeDaysOfWeek.includes(dayIndex)) {
      validDates.push(date.formatDate(curr, 'YYYY-MM-DD'))
    }
    curr.setDate(curr.getDate() + 1)
  }
  const libur = await pb.collection('tb_mst_hari_libur').getFullList({
    filter: `c_periode = "${c_periode}" && b_aktif = true && d_tanggal >= "${dateStart} 00:00:00" && d_tanggal <= "${dateEnd} 23:59:59"`,
    requestKey: null,
  })
  const listTanggalLibur = libur.map((l) => {
    let tgl = l.d_tanggal
    return tgl.includes('T') ? tgl.split('T')[0] : tgl.split(' ')[0]
  })
  const finalValidDates = validDates.filter((d) => !listTanggalLibur.includes(d))
  return {
    totalMurid,
    validDates: finalValidDates,
    totalTargetKehadiran: totalMurid * finalValidDates.length,
  }
}

// ============================================
// FUNGSI: GET ABSEN THIS WEEK & MONTH
// ============================================
const GetAbsenThisWeek = async (c_periode, c_kelas_id, nowRef) => {
  if (!c_kelas_id) return
  loadingAbsenWeek.value = true
  try {
    const current = new Date(nowRef)
    const day = current.getDay()
    const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(current.setDate(diffToMonday))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const date_start = date.formatDate(monday, 'YYYY-MM-DD')
    const date_end = date.formatDate(sunday, 'YYYY-MM-DD')

    rangeDateWeek.value = {
      start: date.formatDate(monday, 'DD/MM/YYYY'),
      end: date.formatDate(sunday, 'DD/MM/YYYY'),
    }

    const meta = await getValidDatesAndStudentCount(c_periode, c_kelas_id, date_start, date_end)
    const absenRecords = await pb.collection('tb_tr_absen_murid').getFullList({
      filter: `c_periode = "${c_periode}" && c_kelas_id = "${c_kelas_id}" && d_tanggal >= "${date_start} 00:00:00" && d_tanggal <= "${date_end} 23:59:59"`,
      requestKey: null,
    })
    let ijin = 0,
      sakit = 0,
      alpa = 0,
      terlambat = 0
    absenRecords.forEach((a) => {
      let tgl = a.d_tanggal.includes('T') ? a.d_tanggal.split('T')[0] : a.d_tanggal.split(' ')[0]
      if (meta.validDates.includes(tgl)) {
        if (a.c_status_absen === 'I') ijin++
        else if (a.c_status_absen === 'S') sakit++
        else if (a.c_status_absen === 'A') alpa++
        else if (a.c_status_absen === 'L') terlambat++
      }
    })
    let hadirTepat = meta.totalTargetKehadiran - (ijin + sakit + alpa + terlambat)
    if (hadirTepat < 0) hadirTepat = 0
    const totalHadirFisik = hadirTepat + terlambat
    const persenHadir =
      meta.totalTargetKehadiran > 0
        ? Math.round((totalHadirFisik / meta.totalTargetKehadiran) * 100)
        : 0
    dataAbsenWeek.value = {
      target: meta.totalTargetKehadiran,
      totalMurid: meta.totalMurid,
      hadirTepat,
      terlambat,
      ijin,
      sakit,
      alpa,
      persenHadir,
    }
  } catch (err) {
    console.error('Gagal memuat absen pekan ini:', err)
  } finally {
    loadingAbsenWeek.value = false
  }
}

const GetAbsenThisMonth = async (c_periode, c_kelas_id, nowRef) => {
  if (!c_kelas_id) return
  loadingAbsenMonth.value = true
  try {
    const current = new Date(nowRef)
    const firstDay = new Date(current.getFullYear(), current.getMonth(), 1)
    const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0)
    const date_start = date.formatDate(firstDay, 'YYYY-MM-DD')
    const date_end = date.formatDate(lastDay, 'YYYY-MM-DD')

    rangeDateMonth.value = {
      start: date.formatDate(firstDay, 'DD/MM/YYYY'),
      end: date.formatDate(lastDay, 'DD/MM/YYYY'),
    }

    const meta = await getValidDatesAndStudentCount(c_periode, c_kelas_id, date_start, date_end)
    const absenRecords = await pb.collection('tb_tr_absen_murid').getFullList({
      filter: `c_periode = "${c_periode}" && c_kelas_id = "${c_kelas_id}" && d_tanggal >= "${date_start} 00:00:00" && d_tanggal <= "${date_end} 23:59:59"`,
      requestKey: null,
    })
    let ijin = 0,
      sakit = 0,
      alpa = 0,
      terlambat = 0
    absenRecords.forEach((a) => {
      let tgl = a.d_tanggal.includes('T') ? a.d_tanggal.split('T')[0] : a.d_tanggal.split(' ')[0]
      if (meta.validDates.includes(tgl)) {
        if (a.c_status_absen === 'I') ijin++
        else if (a.c_status_absen === 'S') sakit++
        else if (a.c_status_absen === 'A') alpa++
        else if (a.c_status_absen === 'L') terlambat++
      }
    })
    let hadirTepat = meta.totalTargetKehadiran - (ijin + sakit + alpa + terlambat)
    if (hadirTepat < 0) hadirTepat = 0
    const totalHadirFisik = hadirTepat + terlambat
    const persenHadir =
      meta.totalTargetKehadiran > 0
        ? Math.round((totalHadirFisik / meta.totalTargetKehadiran) * 100)
        : 0
    dataAbsenMonth.value = {
      target: meta.totalTargetKehadiran,
      totalMurid: meta.totalMurid,
      hadirTepat,
      terlambat,
      ijin,
      sakit,
      alpa,
      persenHadir,
    }
  } catch (err) {
    console.error('Gagal memuat absen bulan ini:', err)
  } finally {
    loadingAbsenMonth.value = false
  }
}

// ============================================
// KONFIGURASI APEXCHARTS (TIDAK BERUBAH)
// ============================================
const chartWeekSeries = computed(() => [
  dataJurnalWeek.value.totalHadir,
  dataJurnalWeek.value.totalBelum,
])
const chartWeekOptions = computed(() => ({
  chart: { type: 'donut' },
  labels: ['Sudah Terisi', 'Belum Terisi'],
  colors: ['#21BA45', '#E0E0E0'],
  legend: { position: 'bottom', fontFamily: 'Roboto, sans-serif', offsetY: -20, margin: 0 },
  grid: { padding: { bottom: 1 } },
  dataLabels: { enabled: false },
  plotOptions: {
    pie: {
      customScale: 0.95,
      donut: {
        size: '60%',
        labels: {
          show: true,
          name: { show: true, fontSize: '14px', color: '#616161', offsetY: -10 },
          value: {
            show: true,
            fontSize: '30px',
            fontWeight: 'bold',
            color: '#212121',
            offsetY: 10,
            formatter: () => `${dataJurnalWeek.value.persentase}%`,
          },
          total: {
            show: true,
            label: 'Pekan Ini',
            color: '#757575',
            formatter: () => `${dataJurnalWeek.value.persentase}%`,
          },
        },
      },
    },
  },
  tooltip: { y: { formatter: (val) => `${val} Jam Pelajaran` } },
}))

const chartMonthSeries = computed(() => [
  dataJurnalMonth.value.totalHadir,
  dataJurnalMonth.value.totalBelum,
])
const chartMonthOptions = computed(() => ({
  chart: { type: 'donut' },
  labels: ['Sudah Terisi', 'Belum Terisi'],
  colors: ['#009688', '#E0E0E0'],
  legend: { position: 'bottom', fontFamily: 'Roboto, sans-serif', offsetY: -20, margin: 0 },
  grid: { padding: { bottom: 1 } },
  dataLabels: { enabled: false },
  plotOptions: {
    pie: {
      customScale: 0.95,
      donut: {
        size: '60%',
        labels: {
          show: true,
          name: { show: true, fontSize: '14px', color: '#616161', offsetY: -10 },
          value: {
            show: true,
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#212121',
            offsetY: 10,
            formatter: () => `${dataJurnalMonth.value.persentase}%`,
          },
          total: {
            show: true,
            label: 'Bulan Ini',
            color: '#757575',
            formatter: () => `${dataJurnalMonth.value.persentase}%`,
          },
        },
      },
    },
  },
  tooltip: { y: { formatter: (val) => `${val} Jam Pelajaran` } },
}))

const chartAbsenWeekSeries = computed(() => [
  dataAbsenWeek.value.hadirTepat,
  dataAbsenWeek.value.terlambat,
  dataAbsenWeek.value.ijin,
  dataAbsenWeek.value.sakit,
  dataAbsenWeek.value.alpa,
])
const chartAbsenWeekOptions = computed(() => ({
  chart: { type: 'donut' },
  labels: ['Hadir Tepat Waktu', 'Terlambat', 'Ijin', 'Sakit', 'Alpa'],
  colors: ['#21BA60', '#F2C037', '#31CCEC', '#9C27B0', '#C10015'],
  legend: { show: false },
  dataLabels: { enabled: false },
  plotOptions: {
    pie: {
      customScale: 0.85,
      donut: {
        size: '60%',
        labels: {
          show: true,
          name: { show: true, fontSize: '12px', color: '#616161', offsetY: -10 },
          value: {
            show: true,
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#212121',
            offsetY: 5,
            formatter: () => `${dataAbsenWeek.value.persenHadir}%`,
          },
          total: {
            show: true,
            label: 'Kehadiran',
            color: '#757575',
            formatter: () => `${dataAbsenWeek.value.persenHadir}%`,
          },
        },
      },
    },
  },
  tooltip: { y: { formatter: (val) => `${val} Siswa` } },
}))

const chartAbsenMonthSeries = computed(() => [
  dataAbsenMonth.value.hadirTepat,
  dataAbsenMonth.value.terlambat,
  dataAbsenMonth.value.ijin,
  dataAbsenMonth.value.sakit,
  dataAbsenMonth.value.alpa,
])
const chartAbsenMonthOptions = computed(() => ({
  chart: { type: 'donut' },
  labels: ['Hadir Tepat Waktu', 'Terlambat', 'Ijin', 'Sakit', 'Alpa'],
  colors: ['#21BA99', '#F2C037', '#31CCEC', '#9C27B0', '#C10015'],
  legend: { show: false },
  dataLabels: { enabled: false },
  plotOptions: {
    pie: {
      customScale: 0.85,
      donut: {
        size: '60%',
        labels: {
          show: true,
          name: { show: true, fontSize: '12px', color: '#616161', offsetY: -10 },
          value: {
            show: true,
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#212121',
            offsetY: 5,
            formatter: () => `${dataAbsenMonth.value.persenHadir}%`,
          },
          total: {
            show: true,
            label: 'Kehadiran',
            color: '#757575',
            formatter: () => `${dataAbsenMonth.value.persenHadir}%`,
          },
        },
      },
    },
  },
  tooltip: { y: { formatter: (val) => `${val} Siswa` } },
}))

// ============================================
// WATCHER & MOUNTED
// ============================================
watch(
  [currentActiveRole, activeContext],
  () => {
    console.log('Peran/Konteks berubah, memperbarui chart...')
    loadDashboardData()
  },
  { deep: true },
)

watch(activePeriodeId, () => {
  loadDashboardData()
})

onMounted(() => {
  loadDashboardData()
  console.log('Active role saat mount:', currentActiveRole.value)
})
</script>

<template>
  <q-page class="q-pa-sm">
    <q-pull-to-refresh @refresh="onRefresh" color="primary" bg-color="white" icon="refresh">
      <!-- ==================== USER PROFILE CARD ==================== -->
      <div class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="my-card rounded-borders shadow-1">
          <q-list separator class="q-py-xs">
            <q-item class="q-py-sm" dense>
              <q-item-section avatar>
                <q-avatar
                  size="50px"
                  class="shadow-5 bg-grey-3 cursor-pointer"
                  @click="triggerUpload"
                >
                  <template v-if="isUploadingAvatar">
                    <q-spinner color="primary" size="3em" />
                  </template>
                  <template v-else-if="avatarUrl">
                    <img :src="avatarUrl" style="object-fit: cover" />
                  </template>
                  <template v-else>
                    <q-icon name="person" size="50px" color="primary" />
                  </template>
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold text-grey-9">
                  {{ currentUser.name }} ({{ currentUser.c_emp_id }})
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item class="q-py-sm" dense>
              <q-item-section avatar>
                <q-icon name="admin_panel_settings" color="indigo" size="27px" />
              </q-item-section>
              <q-item-section>
                <q-item-label caption class="text-grey-7">Peran</q-item-label>
                <q-item-label class="row q-gutter-xs q-mt-xs">
                  <template v-if="userRoles.length > 0">
                    <q-chip
                      v-for="role in userRoles"
                      :key="role.name"
                      :color="role.isActive ? 'green-2' : 'grey-3'"
                      :text-color="role.isActive ? 'green-9' : 'grey-7'"
                      :icon="role.isActive ? 'check_circle' : 'radio_button_unchecked'"
                      class="text-weight-bold q-ma-none"
                      size="sm"
                    >
                      {{ role.name }}
                    </q-chip>
                  </template>
                  <div v-else class="text-caption text-grey-5">Memuat peran...</div>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="currentActiveRole === 'Guru'" class="q-py-sm" dense>
              <q-item-section avatar>
                <q-icon name="menu_book" color="positive" size="27px" />
              </q-item-section>
              <q-item-section>
                <q-item-label caption class="text-grey-7">Mata Pelajaran yang Diampu</q-item-label>
                <q-item-label v-if="isLoading">Memuat data...</q-item-label>
                <q-item-label v-else-if="activeContext.j_mapel_id?.length">
                  <q-chip
                    v-for="mapel in activeContext.j_mapel_id"
                    :key="mapel"
                    color="positive"
                    text-color="white"
                    size="sm"
                    dense
                  >
                    {{ mapel }}
                  </q-chip>
                </q-item-label>
                <q-item-label v-else class="text-grey">Belum ada mapel diatur</q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="currentActiveRole === 'Walikelas'" class="q-py-sm" dense>
              <q-item-section avatar>
                <q-icon name="supervisor_account" color="warning" size="27px" />
              </q-item-section>
              <q-item-section>
                <q-item-label caption class="text-grey-7">Wali Kelas</q-item-label>
                <q-item-label class="text-weight-bold text-warning">
                  {{ activeContext.c_nama_kelas || 'Tidak ada' }} ({{ activeContext.c_kelas_id }})
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              v-if="currentActiveRole === 'Adminkelas' || currentActiveRole === 'Murid'"
              class="q-py-sm"
              dense
            >
              <q-item-section avatar>
                <q-icon name="school" color="info" size="27px" />
              </q-item-section>
              <q-item-section>
                <q-item-label caption class="text-grey-7">Kelas</q-item-label>
                <q-item-label class="text-weight-bold text-info">
                  {{ activeContext.c_nama_kelas || 'Tidak ada' }} ({{ activeContext.c_kelas_id }})
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- ==================== BLOK UNTUK ROLE GURU ==================== -->
      <div v-if="showJurnalCharts" class="q-mt-md">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6 col-md-4">
            <q-card flat bordered class="my-card rounded-borders shadow-1">
              <q-card-section class="q-pb-none row items-center">
                <div class="text-subtitle2 text-weight-bold text-grey-9">
                  <q-icon name="analytics" color="primary" size="xs" class="q-mr-xs" />
                  Jurnal Mengajar Pekan Ini
                </div>
                <q-space />
                <q-inner-loading :showing="loadingWeek" />
              </q-card-section>
              <q-card-section class="row items-center justify-center q-py-md">
                <div
                  v-if="dataJurnalWeek.totalJam === 0 && !loadingWeek"
                  class="text-center text-grey-6 q-py-xl"
                >
                  <q-icon name="event_busy" size="xl" />
                  <div class="q-mt-sm">Tidak ada jadwal mengajar pekan ini</div>
                </div>
                <div class="full-width flex flex-center" style="max-width: 200px; margin: 0 auto">
                  <VueApexCharts
                    type="donut"
                    width="100%"
                    height="200"
                    :options="chartWeekOptions"
                    :series="chartWeekSeries"
                    style="margin-top: -25px; margin-bottom: -30px"
                  />
                </div>
                <span
                  v-if="rangeDateWeek.start && rangeDateWeek.end"
                  class="text-caption text-grey-7 q-ml-xs"
                >
                  ({{ rangeDateWeek.start }} - {{ rangeDateWeek.end }})
                </span>
              </q-card-section>
              <q-separator inset class="q-mt-none q-mb-none" />
              <q-card-section class="q-py-xs bg-grey-1">
                <div class="row text-center text-caption text-weight-medium text-grey-7">
                  <div class="col-4">
                    <div class="text-body2 text-weight-bold text-primary">
                      {{ dataJurnalWeek.totalJam }}
                    </div>
                    Target Jam
                  </div>
                  <div class="col-4 border-left-right">
                    <div class="text-body2 text-weight-bold text-positive">
                      {{ dataJurnalWeek.totalHadir }}
                    </div>
                    Terisi (In/Out)
                  </div>
                  <div class="col-4">
                    <div class="text-body2 text-weight-bold text-warning">
                      {{ dataJurnalWeek.totalBelum }}
                    </div>
                    Sisa Jam
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-sm-6 col-md-4">
            <q-card flat bordered class="my-card rounded-borders shadow-1">
              <q-card-section class="q-pb-none row items-center">
                <div class="text-subtitle2 text-weight-bold text-grey-9">
                  <q-icon name="calendar_month" color="info" size="xs" class="q-mr-xs" />
                  Jurnal Mengajar Bulan Ini
                </div>
                <q-space />
                <q-inner-loading :showing="loadingMonth" />
              </q-card-section>
              <q-card-section class="row items-center justify-center q-py-md">
                <div
                  v-if="dataJurnalMonth.totalJam === 0 && !loadingMonth"
                  class="text-center text-grey-6 q-py-xl"
                >
                  <q-icon name="event_busy" size="xl" />
                  <div class="q-mt-sm">Tidak ada jadwal mengajar bulan ini</div>
                </div>
                <div class="full-width flex flex-center" style="max-width: 200px; margin: 0 auto">
                  <VueApexCharts
                    type="donut"
                    width="100%"
                    height="200"
                    :options="chartMonthOptions"
                    :series="chartMonthSeries"
                    style="margin-top: -25px; margin-bottom: -30px"
                  />
                </div>
                <span
                  v-if="rangeDateMonth.start && rangeDateMonth.end"
                  class="text-caption text-grey-7 q-ml-xs"
                >
                  ({{ rangeDateMonth.start }} - {{ rangeDateMonth.end }})
                </span>
              </q-card-section>
              <q-separator inset class="q-mt-none q-mb-none" />
              <q-card-section class="q-py-xs bg-grey-1">
                <div class="row text-center text-caption text-weight-medium text-grey-7">
                  <div class="col-4">
                    <div class="text-body2 text-weight-bold text-primary">
                      {{ dataJurnalMonth.totalJam }}
                    </div>
                    Target Jam
                  </div>
                  <div class="col-4 border-left-right">
                    <div class="text-body2 text-weight-bold text-positive">
                      {{ dataJurnalMonth.totalHadir }}
                    </div>
                    Terisi (In/Out)
                  </div>
                  <div class="col-4">
                    <div class="text-body2 text-weight-bold text-warning">
                      {{ dataJurnalMonth.totalBelum }}
                    </div>
                    Sisa Jam
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>

      <!-- ==================== BLOK UNTUK ROLE WALIKELAS / ADMINKELAS / MURID ==================== -->
      <div v-if="showAbsenCharts" class="q-mt-md">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6 col-md-4">
            <q-card flat bordered class="my-card rounded-borders shadow-1">
              <q-card-section class="q-pb-none row items-center">
                <div class="text-subtitle2 text-weight-bold text-grey-9">
                  <q-icon name="how_to_reg" color="positive" size="xs" class="q-mr-xs" />
                  Kehadiran Murid Pekan Ini
                </div>
                <q-space />
                <q-inner-loading :showing="loadingAbsenWeek" />
              </q-card-section>
              <q-card-section class="row items-center justify-center q-py-none">
                <div
                  v-if="dataAbsenWeek.target === 0 && !loadingAbsenWeek"
                  class="text-center text-grey-6 q-py-xl"
                >
                  <q-icon name="event_busy" size="xl" />
                  <div class="q-mt-sm">Tidak ada jadwal aktif pekan ini</div>
                </div>
                <div
                  v-else
                  class="full-width flex flex-center"
                  style="max-width: 200px; margin: 0 auto"
                >
                  <VueApexCharts
                    type="donut"
                    width="100%"
                    height="200"
                    :options="chartAbsenWeekOptions"
                    :series="chartAbsenWeekSeries"
                    style="margin-top: -10px; margin-bottom: -15px"
                  />
                </div>
                <span
                  v-if="rangeDateWeek.start && rangeDateWeek.end"
                  class="text-caption text-grey-7 q-ml-xs"
                >
                  ({{ rangeDateWeek.start }} - {{ rangeDateWeek.end }})
                </span>
              </q-card-section>
              <q-separator inset class="q-my-none" />
              <q-card-section class="q-pa-sm bg-grey-1">
                <div class="row items-center justify-between text-caption q-mb-xs">
                  <div class="text-weight-bold">Total Murid: {{ dataAbsenWeek.totalMurid }}</div>
                  <div class="text-weight-bold text-primary">
                    Target: {{ dataAbsenWeek.target }} Siswa/Pekan
                  </div>
                </div>
                <div class="row text-center text-caption text-weight-medium text-grey-8">
                  <div class="col-3 border-right">
                    <div class="text-body2 text-weight-bold text-info">
                      {{ dataAbsenWeek.ijin }}
                    </div>
                    Ijin (I)
                  </div>
                  <div class="col-3 border-right">
                    <div class="text-body2 text-weight-bold text-purple">
                      {{ dataAbsenWeek.sakit }}
                    </div>
                    Sakit (S)
                  </div>
                  <div class="col-3 border-right">
                    <div class="text-body2 text-weight-bold text-negative">
                      {{ dataAbsenWeek.alpa }}
                    </div>
                    Alpa (A)
                  </div>
                  <div class="col-3">
                    <div class="text-body2 text-weight-bold text-warning">
                      {{ dataAbsenWeek.terlambat }}
                    </div>
                    Telat (L)
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-sm-6 col-md-4">
            <q-card flat bordered class="my-card rounded-borders shadow-1">
              <q-card-section class="q-pb-none row items-center">
                <div class="text-subtitle2 text-weight-bold text-grey-9">
                  <q-icon name="how_to_reg" color="positive" size="xs" class="q-mr-xs" />
                  Kehadiran Murid Bulan Ini
                </div>
                <q-space />
                <q-inner-loading :showing="loadingAbsenMonth" />
              </q-card-section>
              <q-card-section class="row items-center justify-center q-py-none">
                <div
                  v-if="dataAbsenMonth.target === 0 && !loadingAbsenMonth"
                  class="text-center text-grey-6 q-py-xl"
                >
                  <q-icon name="event_busy" size="xl" />
                  <div class="q-mt-sm">Tidak ada jadwal aktif bulan ini</div>
                </div>
                <div
                  v-else
                  class="full-width flex flex-center"
                  style="max-width: 200px; margin: 0 auto"
                >
                  <VueApexCharts
                    type="donut"
                    width="100%"
                    height="200"
                    :options="chartAbsenMonthOptions"
                    :series="chartAbsenMonthSeries"
                    style="margin-top: -10px; margin-bottom: -15px"
                  />
                </div>
                <span
                  v-if="rangeDateMonth.start && rangeDateMonth.end"
                  class="text-caption text-grey-7 q-ml-xs"
                >
                  ({{ rangeDateMonth.start }} - {{ rangeDateMonth.end }})
                </span>
              </q-card-section>
              <q-separator inset class="q-my-none" />
              <q-card-section class="q-pa-sm bg-grey-1">
                <div class="row items-center justify-between text-caption q-mb-xs">
                  <div class="text-weight-bold">Total Murid: {{ dataAbsenMonth.totalMurid }}</div>
                  <div class="text-weight-bold text-primary">
                    Target: {{ dataAbsenMonth.target }} Siswa/Bulan
                  </div>
                </div>
                <div class="row text-center text-caption text-weight-medium text-grey-8">
                  <div class="col-3 border-right">
                    <div class="text-body2 text-weight-bold text-info">
                      {{ dataAbsenMonth.ijin }}
                    </div>
                    Ijin (I)
                  </div>
                  <div class="col-3 border-right">
                    <div class="text-body2 text-weight-bold text-purple">
                      {{ dataAbsenMonth.sakit }}
                    </div>
                    Sakit (S)
                  </div>
                  <div class="col-3 border-right">
                    <div class="text-body2 text-weight-bold text-negative">
                      {{ dataAbsenMonth.alpa }}
                    </div>
                    Alpa (A)
                  </div>
                  <div class="col-3">
                    <div class="text-body2 text-weight-bold text-warning">
                      {{ dataAbsenMonth.terlambat }}
                    </div>
                    Telat (L)
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>

      <div
        v-if="!showJurnalCharts && !showAbsenCharts && currentActiveRole"
        class="q-mt-md text-center text-grey-6"
      ></div>

      <!-- ==================== ✅ BLOK DASHBOARD JADWAL (KOMPONEN TERPISAH) ==================== -->
      <div class="q-mt-md">
        <!--
        <div class="row items-center justify-between q-mb-md">
          <q-item-label class="text-weight-bold text-grey-9"> Pengisian Jadwal </q-item-label>
        </div>-->
        <!-- Komponen DashboardJadwal di-include di sini -->
        <DashboardJadwal />
      </div>
    </q-pull-to-refresh>
  </q-page>
</template>

<style scoped>
.my-card {
  transition: transform 0.2s;
}
.my-card:hover {
  transform: translateY(-2px);
}
.border-left-right {
  border-left: 1px solid #e0e0e0;
  border-right: 1px solid #e0e0e0;
}
.hover-effect {
  transition: all 0.3s ease;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}
.hover-effect:hover {
  background-color: #e3f2fd;
  text-decoration: underline;
}

@media (max-width: 600px) {
  .q-table td,
  .q-table th {
    padding: 4px 6px;
    font-size: 11px;
  }
  .q-table .q-td .text-caption {
    font-size: 10px;
  }
}
</style>

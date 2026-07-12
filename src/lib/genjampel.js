// src/lib/genjampel.js mark
import { pb } from 'boot/pocketbase'

export async function getJampel(pr_kelas_id, pr_hari_id) {
  try {
    // 1. Tarik data master tb_mst_jamsat untuk referensi durasi dan keterangan
    const jamsatRecords = await pb.collection('tb_mst_jamsat').getFullList({
      $autoCancel: false,
    })

    // Buat lookup map agar pencarian durasi & ket lebih cepat berdasarkan c_jam_id
    const jamsatMap = {}
    jamsatRecords.forEach((record) => {
      jamsatMap[record.c_jam_id] = {
        nama: record.c_nama,
        durasi: Number(record.n_durasi),
      }
    })

    // 2. Filter server-side untuk template
    const filterString = `j_kelas_id ~ "${pr_kelas_id}" && j_hari_id ~ "${pr_hari_id}"`
    const templates = await pb.collection('tb_mst_jampel_template').getFullList({
      filter: filterString,
      $autoCancel: false,
    })

    if (templates.length === 0) {
      console.warn(
        `[getJampel] Template tidak ditemukan untuk Kelas: ${pr_kelas_id}, Hari: ${pr_hari_id}`,
      )
      return []
    }

    const dataset = []

    // Helper function: Menambahkan menit ke string waktu (HH:mm)
    const addMinutes = (timeStr, minsToAdd) => {
      if (!timeStr) return '00:00'
      const [hours, minutes] = timeStr.split(':').map(Number)
      const totalMinutes = hours * 60 + minutes + minsToAdd

      const newHours = Math.floor(totalMinutes / 60) % 24 // Modulo 24 jika lewat tengah malam
      const newMins = totalMinutes % 60

      return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`
    }

    // 3. Looping pembentukan dataset
    for (const tpl of templates) {
      const jamList = Array.isArray(tpl.j_jampel) ? tpl.j_jampel : []

      // Ambil jam mulai dari baris template
      let currentStartTime = tpl.c_jam_start || '07:00'

      for (const kodeJam of jamList) {
        // Ambil info master jam dari lookup map, beri nilai default jika tidak ketemu
        const jamInfo = jamsatMap[kodeJam] || { nama: 'Tidak Diketahui', durasi: 0 }
        const duration = jamInfo.durasi
        const ket = jamInfo.nama

        // Hitung jam selesai (jam mulai + durasi)
        const currentEndTime = addMinutes(currentStartTime, duration)

        // Bentuk objek JSON untuk j_jampel_2
        const jampel2Obj = {
          str: currentStartTime,
          dur: duration,
          end: currentEndTime,
          ket: ket,
          id: String(kodeJam),
        }

        // Push ke dataset (4 kolom)
        dataset.push({
          c_kelas_id: String(pr_kelas_id),
          n_hari_id: Number(pr_hari_id),
          c_kode_jam: String(kodeJam),
          j_jampel_2: jampel2Obj, // JSON Object
        })

        // Set jam mulai untuk baris berikutnya menggunakan jam selesai baris ini
        currentStartTime = currentEndTime
      }
    }

    return dataset
  } catch (error) {
    console.error('[getJampel] Gagal memproses data:', error)
    return []
  }
}

/*
 * ==========================================
 * CONTOH CARA AKSES DI HALAMAN LAIN (Vue/JS)
 * ==========================================
 *
 * <script setup>
 * import { getJampel } from 'src/lib/genjampel'
 *
 * async function generateJadwal() {
 *   // Panggil fungsi dengan parameter kelas dan hari
 *   const dataJampel = await getJampel('7A', 1)
 *
 *   // Dataset siap di-loop untuk insert ke tabel transaksi/jadwal
 *   for (const row of dataJampel) {
 *     console.log('Menyimpan:', row)
 *     // await pb.collection('tb_jadwal_pelajaran').create(row)
 *   }
 * }
 *
 * onMounted(() => {
 *   generateJadwal()
 * })
 * </script>
 */

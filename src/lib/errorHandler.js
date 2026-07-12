import { Notify } from 'quasar'

/**
 * Fungsi global untuk menangani error dari PocketBase
 * @param {Object} error - Objek error asli dari try-catch
 * @param {Object} customMessages - (Opsional) Pesan khusus untuk field tertentu
 */
export const handlePBError = (error, customMessages = {}) => {
  // 1. Abaikan error jika karena fitur Auto-Cancel PocketBase
  if (error?.isAbort) return

  let pesanError = 'Terjadi kesalahan sistem. Silakan coba lagi.'

  // 2. Tangani koneksi terputus (Status 0)
  if (error?.status === 0) {
    pesanError =
      'Koneksi ke server gagal. Periksa jaringan lokal atau pastikan PocketBase berjalan.'
  }
  // 3. Tangani Error Validasi / Database (Status 400)
  else if (error?.status === 400 && error?.data?.data) {
    const validationErrors = error.data.data

    // Ambil field pertama yang mengalami error (misal: 'c_kelas_id')
    const firstField = Object.keys(validationErrors)[0]
    const errorDetail = validationErrors[firstField]

    // Cek apakah komponen mengirimkan pesan kustom untuk field ini
    if (customMessages[firstField] && customMessages[firstField][errorDetail.code]) {
      pesanError = customMessages[firstField][errorDetail.code]
    } else {
      // Penanganan otomatis bawaan (Default)
      switch (errorDetail.code) {
        case 'validation_not_unique':
          pesanError = `Data "${firstField}" sudah terdaftar (Duplikat). Gunakan data lain.`
          break
        case 'validation_required':
          pesanError = `Kolom "${firstField}" wajib diisi.`
          break
        default:
          pesanError = errorDetail.message || 'Input data tidak valid.'
      }
    }
  }
  // 4. Tangani error hak akses (Status 401/403)
  else if (error?.status === 401 || error?.status === 403) {
    pesanError = 'Sesi telah habis atau Anda tidak memiliki hak akses.'
  }

  // Tampilkan notifikasi melayang
  Notify.create({
    type: 'negative',
    message: pesanError,
    position: 'bottom',
    timeout: 3000, // Hilang otomatis dalam 3 detik
    actions: [{ icon: 'close', color: 'white' }], // Tombol tutup manual
  })
}

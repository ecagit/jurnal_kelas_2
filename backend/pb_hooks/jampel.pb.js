//mark
/// <reference path="../pb_data/types.d.ts" />

// Menggunakan (e) yang merepresentasikan event request pada versi terbaru
routerAdd('GET', '/api/sp_get_jampel', (e) => {
  try {
    // 1. Ambil parameter dari request (Sintaks PocketBase v0.23+)
    const kelasId = e.request.url.query().get('kelas_id')
    const hariIdStr = e.request.url.query().get('hari_id')

    if (!kelasId || !hariIdStr) {
      // Menggunakan e.json pada versi terbaru
      return e.json(400, { message: 'Parameter kelas_id dan hari_id diperlukan' })
    }

    const hariId = parseInt(hariIdStr)

    // 2. Query ke tabel tb_mst_jampel_template
    const records = $app.findRecordsByFilter(
      'tb_mst_jampel_template',
      'j_kelas_id ~ {:kelasId} && j_hari_id ~ {:hariId}',
      '-created',
      100,
      0,
      { kelasId: kelasId, hariId: hariId },
    )

    let result = []

    // 3. Proses "Flattening" data JSON j_jampel
    records.forEach((record) => {
      const jampelList = record.get('j_jampel') // Mengambil array ["JPL00", "JPL01", ...]

      // Pastikan jampelList tidak kosong dan merupakan array sebelum dilooping
      if (jampelList && Array.isArray(jampelList)) {
        jampelList.forEach((kodeJam) => {
          result.push({
            c_kelas_id: kelasId,
            n_hari_id: hariId,
            c_kode_jam: kodeJam,
          })
        })
      }
    })

    return e.json(200, result)
  } catch (err) {
    // Menangkap error spesifik di sisi server agar mudah di-debug
    console.error('Hook sp_get_jampel error: ', err)
    return e.json(500, { error: err.message || 'Terjadi kesalahan internal' })
  }
})

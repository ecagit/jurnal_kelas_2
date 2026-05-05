import { pb } from 'boot/pocketbase'

// src/lib/utils.js
export const formatCurrency = (val) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val)
}

export const getAgamaLookup = async () => {
  try {
    const records = await pb.collection('tb_mst_agama').getFullList({
      sort: 'c_agama',
    })
    return records.map((a) => a.c_agama)
    // Kembalikan data yang sudah dipetakan (mapped)
    //return records.map(a => ({
    //    id_asli: a.c_agama,      // Nilai yang akan disimpan (misal: "A01")
    //    label: a.c_nama_agama    // Nilai yang akan muncul di dropdown (misal: "Islam")
    //    }))
  } catch (e) {
    console.error('Gagal memuat lookup agama:', e.message)
    return [] // Kembalikan array kosong jika error agar tidak crash
  }
}

//lookup untuk combobox kelas
export const getKelasLookup = async () => {
  try {
    const records = await pb.collection('tb_mst_kelas').getFullList({
      sort: 'c_kelas_id',
    })

    // Kembalikan data yang sudah dipetakan (mapped)
    return records.map((k) => ({
      id_asli: k.c_kelas_id,
      tampilan: `${k.c_nama_kelas} (${k.c_kelas_id})`,
      //tampilan: `${k.c_nama_kelas}`
    }))
  } catch (e) {
    console.error('Gagal memuat lookup kelas:', e.message)
    return [] // Kembalikan array kosong jika error agar tidak crash
  }
}

export const getMapelLookup = async () => {
  try {
    const records = await pb.collection('tb_mst_mapel').getFullList({
      sort: 'c_mapel_id',
    })

    // Kembalikan data yang sudah dipetakan (mapped)
    return records.map((k) => ({
      id_asli: k.c_mapel_id,
      tampilan: `${k.c_nama_mapel} (${k.c_mapel_id})`,
      //tampilan: `${k.c_nama_mapel}`
    }))
  } catch (e) {
    console.error('Gagal memuat lookup mapel:', e.message)
    return [] // Kembalikan array kosong jika error agar tidak crash
  }
}

export const getJamtemplateLookup = async () => {
  try {
    const records = await pb.collection('tb_mst_jamsat').getFullList({
      sort: 'c_jam_id',
      filter: 'b_aktif = true',
    })
    return records.map((r) => ({
      id_asli: r.c_jam_id,
      tampilan: r.c_nama,
    }))
  } catch (error) {
    console.error('Gagal memuat lookup jam:', error)
    return []
  }
}

/*
export const getBidangLookup = async () => {
    try {
        const records = await pb.collection('tb_mst_bidang').getFullList({
            sort: 'c_bidang',
        });

        // Kembalikan data yang sudah dipetakan (mapped)
        return records.map(b => ({
            id_asli: b.c_bidang_id,
            tampilan: `${b.c_bidang_id} - ${b.c_bidang}`
        }));
    } catch (e) {
        console.error("Gagal memuat lookup bidang:", e.message);
        return []; // Kembalikan array kosong jika error agar tidak crash
    }
};

*/

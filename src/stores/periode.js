// stores/periode.js menyimpan tahun pelajaran aktif dalam store
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pb } from 'boot/pocketbase'

export const usePeriodeStore = defineStore('periode', () => {
  // State
  const activePeriodeId = ref('')
  const activePeriodeLabel = ref('')
  const isLoading = ref(false)
  //const filterKelas = ref('')

  // Action
  const fetchActivePeriode = async () => {
    isLoading.value = true
    try {
      // Mengambil satu baris data pertama yang memenuhi kriteria b_aktif = true
      const record = await pb.collection('tb_mst_periode').getFirstListItem('b_aktif = true')

      activePeriodeId.value = record.c_periode_id
      activePeriodeLabel.value = record.c_periode
    } catch (error) {
      console.error('Gagal memuat periode aktif:', error)
      activePeriodeId.value = '-'
      activePeriodeLabel.value = 'Periode Tidak Ditemukan'
    } finally {
      isLoading.value = false
    }
  }

  return {
    activePeriodeId,
    activePeriodeLabel,
    isLoading,
    //filterKelas,
    fetchActivePeriode,
  }
})

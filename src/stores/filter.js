// stores/periode.js menyimpan tahun pelajaran aktif dalam store
//import { pb } from 'boot/pocketbase'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFilterStore = defineStore('filter', () => {
  // State
  const filterKelas = ref('')
  const filterGuru = ref('')
  const filterHari = ref(null)
  const filterTglJurnal = ref(null)
  //const isLoading = ref(false)

  return { filterKelas, filterGuru, filterHari, filterTglJurnal }
})

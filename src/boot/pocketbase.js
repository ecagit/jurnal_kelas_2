import { boot } from 'quasar/wrappers'
import PocketBase from 'pocketbase'

const pb = new PocketBase('http://127.0.0.1:8090')
//const pb = new PocketBase('http://192.168.0.10:8090')

export default boot(({ app }) => {
  // Menjadikan pb tersedia secara global di komponen Vue via this.$pb
  app.config.globalProperties.$pb = pb
})

// Mengekspor pb agar bisa diimpor secara langsung di file JS murni (seperti Store)
export { pb }

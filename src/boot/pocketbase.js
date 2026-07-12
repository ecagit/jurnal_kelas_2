import { boot } from 'quasar/wrappers'
import PocketBase from 'pocketbase'

//const pb = new PocketBase('http://127.0.0.1:8095')
//const pb = new PocketBase('http://192.168.0.192:8095')
//const hostUrl = window.location.protocol + '//' + window.location.hostname + ':8095'
//const hostUrl = window.location.origin
//const pb = new PocketBase(hostUrl)

//const pb = new PocketBase(process.env.DEV ? 'http://127.0.0.1:8095' : undefined);
//const pb = new PocketBase('http://192.168.112.99:8095')
//const pb = new PocketBase(process.env.DEV ? 'http://127.0.0.1:8095' : undefined);

const hostUrl = window.location.protocol + '//' + window.location.hostname + ':8095'
const pb = new PocketBase(process.env.DEV ? hostUrl : undefined)

export default boot(({ app }) => {
  // Menjadikan pb tersedia secara global di komponen Vue via this.$pb
  app.config.globalProperties.$pb = pb
})

// Mengekspor pb agar bisa diimpor secara langsung di file JS murni (seperti Store)
export { pb }

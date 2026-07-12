import { defineRouter } from '#q-app/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'
// 1. Import instance PocketBase Anda di sini
import { pb } from 'src/boot/pocketbase'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter((/* { store, ssrContext } */) => {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  // 2. Pasang Guard tepat sebelum "return Router"
  Router.beforeEach((to, from, next) => {
    const isLoggedIn = pb.authStore.isValid

    // Cek apakah rute yang dituju (atau induknya) membutuhkan autentikasi
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

    if (requiresAuth && !isLoggedIn) {
      // Jika butuh login tapi belum login / token expired, tendang ke halaman login
      next('/login')
    } else if (to.path === '/login' && isLoggedIn) {
      // Fitur tambahan: Jika user SUDAH login tapi mencoba akses manual ke /login,
      // otomatis alihkan kembali ke halaman utama (dashboard)
      next('/')
    } else {
      // Izinkan akses rute
      next()
    }
  })

  return Router
})

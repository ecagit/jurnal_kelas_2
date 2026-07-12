import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { pb } from 'boot/pocketbase'
//import { toRaw } from 'vue'
import { menuConfig } from 'src/config/menus'

export const useAuthStore = defineStore(
  'auth',
  () => {
    // 1. STATE UTAMA
    const user = ref(pb.authStore.model)
    const isLoggedIn = ref(pb.authStore.isValid)
    const activeRole = ref(pb.authStore.model?.c_default_role || '')
    const activePermissions = ref([])
    const roleContext = ref({})

    // ==========================================
    // ACTIONS BARU: Inisialisasi Data Peran
    // ==========================================
    async function fetchRoleContext(roleName) {
      console.log('--- [TRACE] START fetchRoleContext ---')
      console.log('1. Parameter roleName yang masuk:', roleName)

      if (!user.value) {
        console.warn('X Batal: user.value masih null')
        return
      }
      if (!user.value.c_emp_id) {
        console.warn('X Batal: Field c_emp_id pada tabel users KOSONG!')
        roleContext.value = {}
        return
      }

      try {
        const empId = user.value.c_emp_id
        console.log('2. Melakukan pencarian data dengan KODE/INITIAL c_emp_id:', empId)

        if (roleName === 'Guru' || roleName === 'Walikelas') {
          const guruRecord = await pb
            .collection('tb_mst_guru')
            .getFirstListItem(`c_guru_id="${empId}"`, { requestKey: null })

          console.log('3. Data Guru ditemukan:', guruRecord)

          roleContext.value = {
            c_guru_id: guruRecord.c_guru_id,
            c_nama: guruRecord.c_nama,
            j_mapel_id: guruRecord.j_mapel_id,
            j_nama_mapel: [], // <-- TAMBAHAN: Tempat menyimpan nama mapel hasil mapping
          }

          // --- TAMBAHAN DARI fetchProfileDetails (Mapping Mapel Guru) ---
          if (guruRecord.j_mapel_id && guruRecord.j_mapel_id.length > 0) {
            try {
              const masterMapel = await pb
                .collection('tb_mst_mapel')
                .getFullList({ requestKey: null })
              const mapelMap = new Map(masterMapel.map((m) => [m.id, m.c_nama_mapel]))

              // Petakan ID ke Nama Mapel
              roleContext.value.j_nama_mapel = guruRecord.j_mapel_id.map(
                (id) => mapelMap.get(id) || id,
              )
            } catch (e) {
              console.error('Gagal memetakan mata pelajaran:', e)
            }
          }
          // ---------------------------------------------------------------

          // -- Blok Walikelas --
          if (roleName === 'Walikelas') {
            try {
              const kelasRecord = await pb
                .collection('tb_mst_kelas')
                .getFirstListItem(`c_wali_kelas_id="${guruRecord.c_guru_id}"`, { requestKey: null })

              console.log('4. Data Kelas walikelas ditemukan:', kelasRecord)
              roleContext.value.c_kelas_id = kelasRecord.c_kelas_id
              roleContext.value.c_nama_kelas = kelasRecord.c_nama_kelas || kelasRecord.c_kelas_id
            } catch (errKelas) {
              console.warn('Wali kelas belum ditugaskan ke kelas tertentu.', errKelas)
              roleContext.value.c_kelas_id = null
              roleContext.value.c_nama_kelas = 'Belum Ditugaskan'
            }
          }
        } else if (roleName === 'Adminkelas' || roleName === 'Murid') {
          // --- DIOPTIMALKAN DARI fetchProfileDetails (Menggunakan expand) ---
          const muridRecord = await pb
            .collection('tb_mst_murid')
            .getFirstListItem(`c_murid_id="${empId}"`, {
              expand: 'c_kelas_id', // Gunakan expand agar tidak perlu join manual dua kali
              requestKey: null,
            })

          console.log('5. Data Murid ditemukan:', muridRecord)

          // Set data murid dan otomatis ambil nama kelas dari expand jika ada
          roleContext.value = {
            c_murid_id: muridRecord.c_murid_id,
            c_nama: muridRecord.c_nama,
            c_kelas_id: muridRecord.c_kelas_id,
            c_nama_kelas: muridRecord.expand?.c_kelas_id?.c_nama_kelas || 'Belum Ada Kelas',
          }

          // Fallback manual (jika fitur expand di PB tidak di-set up pada relasi c_kelas_id)
          if (muridRecord.c_kelas_id && !muridRecord.expand?.c_kelas_id) {
            try {
              const kelasMurid = await pb
                .collection('tb_mst_kelas')
                .getFirstListItem(`c_kelas_id="${muridRecord.c_kelas_id}"`, { requestKey: null })
              roleContext.value.c_nama_kelas = kelasMurid.c_nama_kelas
            } catch (errKelas) {
              console.warn('Kelas murid tidak ditemukan di master data kelas.', errKelas)
              roleContext.value.c_nama_kelas = 'Kelas Invalid'
            }
          }
          // ---------------------------------------------------------------
        } else {
          roleContext.value = {}
        }

        console.log('7. Hasil Akhir roleContext Berhasil Set:', roleContext.value)
        console.log('--- [TRACE] END fetchRoleContext ---')
      } catch (error) {
        console.error('X Gagal mengambil konteks peran:', error)
        roleContext.value = {}
      }
    }

    /**
     * Menghasilkan list guru (Dropdown Option) berdasarkan Role
     */
    async function getGuruLookup() {
      const role = activeRole.value
      const ctx = roleContext.value

      try {
        if (role === 'Guru' || role === 'Walikelas') {
          return [{ label: ctx.c_nama, value: ctx.c_guru_id }]
        } else if (role === 'Adminkelas' || role === 'Adminmurid') {
          const jadwal = await pb.collection('tb_mst_jadwal').getFullList({
            filter: `c_kelas_id="${ctx.c_kelas_id}"`,
          })
          if (jadwal.length === 0) return []

          const masterGuru = await pb.collection('tb_mst_guru').getFullList({
            filter: 'b_aktif = true',
          })

          const guruMap = new Map()
          masterGuru.forEach((g) => {
            if (g.c_guru_id) guruMap.set(g.c_guru_id, g.c_nama)
          })

          const uniqueGurus = new Map()
          jadwal.forEach((j) => {
            const codeGuru = j.c_guru_id
            if (codeGuru) {
              const namaGuru = guruMap.get(codeGuru)
              if (namaGuru) {
                uniqueGurus.set(codeGuru, { label: namaGuru, value: codeGuru })
              }
            }
          })

          const finalGurus = Array.from(uniqueGurus.values())
          finalGurus.sort((a, b) => a.label.localeCompare(b.label))
          return finalGurus
        } else if (role === 'Admin') {
          const allGuru = await pb.collection('tb_mst_guru').getFullList({
            filter: 'b_aktif = true',
          })

          const mappedGurus = allGuru.map((g) => ({
            label: g.c_nama,
            value: g.c_guru_id || g.id,
          }))

          mappedGurus.sort((a, b) => a.label.localeCompare(b.label))
          return mappedGurus
        }

        return []
      } catch (error) {
        console.error('Error getGuruLookup:', error)
        return []
      }
    }

    /**
     * Menghasilkan list kelas (Dropdown Option) berdasarkan Role
     */
    async function getKelasLookup() {
      const role = activeRole.value
      const ctx = roleContext.value

      console.log('\n--- [TRACE] START getKelasLookup ---')

      try {
        if (role === 'Guru') {
          if (!ctx.c_guru_id) return []

          const jadwal = await pb.collection('tb_mst_jadwal').getFullList({
            filter: `c_guru_id="${ctx.c_guru_id}"`,
          })
          if (jadwal.length === 0) return []

          const masterKelas = await pb.collection('tb_mst_kelas').getFullList()
          const kelasMap = new Map()
          masterKelas.forEach((k) => {
            if (k.c_kelas_id) kelasMap.set(k.c_kelas_id, `${k.c_nama_kelas} (${k.c_kelas_id})`)
          })

          const uniqueKelas = new Map()
          jadwal.forEach((j) => {
            const valueKelas = j.c_kelas_id
            if (valueKelas) {
              const labelKelas = kelasMap.get(valueKelas) || valueKelas
              uniqueKelas.set(valueKelas, { label: labelKelas, value: valueKelas })
            }
          })

          const finalResult = Array.from(uniqueKelas.values())
          finalResult.sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }))
          return finalResult
        } else if (role === 'Walikelas') {
          if (!ctx.c_guru_id) return []

          try {
            const kelasWali = await pb
              .collection('tb_mst_kelas')
              .getFirstListItem(`c_wali_kelas_id="${ctx.c_guru_id}"`, { requestKey: null })

            return [
              {
                label: `${kelasWali.c_nama_kelas} (${kelasWali.c_kelas_id})`,
                value: kelasWali.c_kelas_id,
              },
            ]
          } catch (err) {
            console.warn('Wali kelas tidak memiliki data kelas:', err)
            return []
          }
        } else if (role === 'Adminkelas' || role === 'Murid') {
          if (!ctx.c_murid_id) return []

          try {
            const muridRecord = await pb
              .collection('tb_mst_murid')
              .getFirstListItem(`c_murid_id="${ctx.c_murid_id}"`, { requestKey: null })

            if (!muridRecord.c_kelas_id) return []

            const kelasMurid = await pb
              .collection('tb_mst_kelas')
              .getFirstListItem(`c_kelas_id="${muridRecord.c_kelas_id}"`, { requestKey: null })

            return [
              {
                label: `${kelasMurid.c_nama_kelas} (${kelasMurid.c_kelas_id})`,
                value: kelasMurid.c_kelas_id,
              },
            ]
          } catch {
            return []
          }
        } else if (role === 'Admin') {
          const allKelas = await pb.collection('tb_mst_kelas').getFullList({ requestKey: null })
          const mappedAdminKelas = allKelas.map((k) => ({
            label: k.c_nama_kelas ? `${k.c_nama_kelas} (${k.c_kelas_id})` : k.c_kelas_id,
            value: k.c_kelas_id || k.id,
          }))

          mappedAdminKelas.sort((a, b) =>
            a.value.localeCompare(b.value, undefined, { numeric: true }),
          )
          return mappedAdminKelas
        } else {
          return []
        }
      } catch (error) {
        console.error('Error getKelasLookup:', error)
        return []
      }
    }

    // 2. GETTERS (COMPUTED PROPERTY)
    const allRoles = computed(() => {
      if (!user.value) return []
      const roles = new Set()

      if (user.value.c_default_role) {
        roles.add(user.value.c_default_role)
      }

      if (user.value.expand && Array.isArray(user.value.expand.c_role)) {
        user.value.expand.c_role.forEach((roleObj) => {
          if (roleObj.c_role) {
            roles.add(roleObj.c_role)
          }
        })
      }

      return Array.from(roles)
    })

    const currentMenu = computed(() => {
      if (!activeRole.value || activePermissions.value.length === 0) return []

      const filterMenu = (menus) => {
        return menus.reduce((acc, item) => {
          if (activePermissions.value.includes(item.c_code)) {
            const newItem = { ...item }
            if (newItem.children) {
              newItem.children = filterMenu(newItem.children)
            }
            acc.push(newItem)
          }
          return acc
        }, [])
      }

      return filterMenu(menuConfig)
    })

    // ==========================================
    // ACTIONS: Login & Management
    // ==========================================
    async function login(email, password) {
      const authData = await pb.collection('users').authWithPassword(email, password, {
        expand: 'c_role',
      })

      if (authData.record.b_aktif === false) {
        pb.authStore.clear()
        user.value = null
        isLoggedIn.value = false
        activeRole.value = ''
        throw new Error('Akun Anda telah dinonaktifkan oleh Admin.')
      }

      user.value = pb.authStore.model
      isLoggedIn.value = true

      const defaultRoleStr = authData.record.c_default_role || 'Guru'

      await getUserPermission(defaultRoleStr)
      await fetchRoleContext(defaultRoleStr)

      activeRole.value = defaultRoleStr

      return authData
    }

    function logout() {
      pb.authStore.clear()
      user.value = null
      isLoggedIn.value = false
      activeRole.value = ''
      activePermissions.value = []
      roleContext.value = null
    }

    async function switchRole(newRole) {
      if (allRoles.value.includes(newRole)) {
        try {
          await getUserPermission(newRole)
          await fetchRoleContext(newRole)
          activeRole.value = newRole
        } catch (error) {
          console.error(`Gagal beralih ke role ${newRole}:`, error)
        }
      } else {
        console.warn(`Akses ditolak: User tidak memiliki hak akses sebagai ${newRole}`)
      }
    }

    async function getUserPermission(roleName) {
      try {
        if (!roleName) return []

        const roleData = await pb
          .collection('tb_mst_role')
          .getFirstListItem(`c_role="${roleName}"`, {
            expand: 'c_permission',
            requestKey: null,
          })

        if (!roleData.expand || !roleData.expand.c_permission) {
          activePermissions.value = []
          return []
        }

        const allowedCodes = roleData.expand.c_permission
          .filter((perm) => perm.b_aktif === true)
          .map((perm) => perm.c_code)

        activePermissions.value = allowedCodes
        return allowedCodes
      } catch (error) {
        console.error('Gagal mengambil data permission:', error)
        activePermissions.value = []
        return []
      }
    }

    return {
      user,
      isLoggedIn,
      activeRole,
      activePermissions,
      roleContext,
      fetchRoleContext,
      allRoles,
      currentMenu,
      login,
      logout,
      switchRole,
      getUserPermission,
      getGuruLookup,
      getKelasLookup,
    }
  },
  {
    persist: {
      key: 'pms_auth_session',
      storage: localStorage,
      paths: ['user', 'isLoggedIn', 'activeRole', 'activePermissions', 'roleContext'],
    },
  },
)

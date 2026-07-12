<script setup>
import { pb } from 'boot/pocketbase'
import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { menuConfig } from 'src/config/menus'
import { handlePBError } from 'src/lib/errorHandler'

const $q = useQuasar()

// =======================================================
// STATE DATA TABEL & UI
// =======================================================
const roles = ref([])
const permissions = ref([]) // Master data dari tb_mst_permission
const loading = ref(false)
const permissionLoading = ref(false)
const filter = ref('')
const showRoleForm = ref(false) // Kontrol tampilan form Role
const isEditRole = ref(false) // Mode edit/tambah Role

// State Pagination & Sorting Server-Side
const pagination = ref({
  sortBy: 'c_role',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

// State Form Role
const roleForm = ref({
  id: '',
  c_role: '',
  b_aktif: true,
})

// State Dialog Distribusi Permission
const permissionDialog = ref(false)
const selectedRoleForPermission = ref(null)
const permissionMap = ref({}) // Format: { 'menu:home': true, ... }

// =======================================================
// KONFIGURASI KOLOM Q-TABLE
// =======================================================
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no' },
  { name: 'c_role', label: 'Nama Role / Peran', align: 'left', field: 'c_role', sortable: true },
  { name: 'b_aktif', label: 'Status Aktif', align: 'center', field: 'b_aktif', sortable: true },
  { name: 'actions', label: 'Pengaturan & Akses', align: 'center', field: 'actions' },
]

// =======================================================
// FETCH DATA SERVER-SIDE (seperti KelasPage)
// =======================================================
const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  const filterValue = props.filter

  loading.value = true

  try {
    let sortString = sortBy ? (descending ? `-${sortBy}` : `+${sortBy}`) : ''
    let filterString = filterValue ? `c_role ~ "${filterValue}"` : ''

    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage
    const result = await pb.collection('tb_mst_role').getList(page, fetchLimit, {
      sort: sortString,
      filter: filterString,
    })

    pagination.value.page = page
    pagination.value.rowsPerPage = rowsPerPage
    pagination.value.rowsNumber = result.totalItems
    pagination.value.sortBy = sortBy
    pagination.value.descending = descending

    roles.value = result.items
  } catch (error) {
    handlePBError(error)
  } finally {
    loading.value = false
  }
}

// Ambil semua master kode asset dari tb_mst_permission
const fetchPermissions = async () => {
  try {
    const records = await pb.collection('tb_mst_permission').getFullList()
    permissions.value = records
  } catch (error) {
    console.error('Gagal mengambil master data permission:', error)
  }
}

// =======================================================
// CRUD ROLE (NON-MODAL FORM)
// =======================================================
const bukaFormTambahRole = () => {
  isEditRole.value = false
  roleForm.value = {
    id: '',
    c_role: '',
    b_aktif: true,
  }
  showRoleForm.value = true
}

const bukaFormEditRole = (role) => {
  isEditRole.value = true
  roleForm.value = {
    id: role.id,
    c_role: role.c_role,
    b_aktif: role.b_aktif,
  }
  showRoleForm.value = true
}

const simpanRole = async () => {
  if (!roleForm.value.c_role.trim()) {
    $q.notify({ type: 'warning', message: 'Nama Role wajib diisi.' })
    return
  }

  try {
    const data = {
      c_role: roleForm.value.c_role,
      b_aktif: roleForm.value.b_aktif,
    }

    if (isEditRole.value) {
      await pb.collection('tb_mst_role').update(roleForm.value.id, data)
      $q.notify({ type: 'positive', message: 'Berhasil memperbarui data role.' })
    } else {
      await pb.collection('tb_mst_role').create(data)
      $q.notify({ type: 'positive', message: 'Berhasil menambahkan role baru.' })
    }

    tutupFormRole()
    onRequest({ pagination: pagination.value, filter: filter.value })
  } catch (error) {
    handlePBError(error, {
      c_role: {
        validation_not_unique: `Gagal! Nama Role "${roleForm.value.c_role}" sudah ada.`,
      },
    })
  }
}

const hapusRole = (role) => {
  $q.dialog({
    title: 'Hapus Role',
    message: `Apakah Anda yakin ingin menghapus role "${role.c_role}"?`,
    cancel: true,
    persistent: true,
    ok: { color: 'negative', label: 'Hapus' },
  }).onOk(async () => {
    try {
      await pb.collection('tb_mst_role').delete(role.id)
      $q.notify({ type: 'positive', message: 'Role berhasil dihapus.' })
      onRequest({ pagination: pagination.value, filter: filter.value })
    } catch (error) {
      handlePBError(error)
    }
  })
}

const tutupFormRole = () => {
  showRoleForm.value = false
}

// =======================================================
// PERMISSION DISTRIBUTION (TETAP MENGGUNAKAN DIALOG)
// =======================================================
const openPermissionDialog = (role) => {
  selectedRoleForPermission.value = role

  const newMap = {}
  const activePermissionIds = role.c_permission || []

  permissions.value.forEach((p) => {
    newMap[p.c_code] = activePermissionIds.includes(p.id)
  })

  permissionMap.value = newMap
  permissionDialog.value = true
}

const savePermissions = async () => {
  permissionLoading.value = true
  try {
    const selectedCodes = Object.keys(permissionMap.value).filter(
      (key) => permissionMap.value[key] === true,
    )

    const targetPermissionIds = permissions.value
      .filter((p) => selectedCodes.includes(p.c_code))
      .map((p) => p.id)

    await pb.collection('tb_mst_role').update(selectedRoleForPermission.value.id, {
      c_permission: targetPermissionIds,
    })

    $q.notify({
      type: 'positive',
      message: `Hak akses untuk role "${selectedRoleForPermission.value.c_role}" berhasil disimpan.`,
    })

    permissionDialog.value = false
    await onRequest({ pagination: pagination.value, filter: filter.value })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Gagal menyimpan hak akses: ' + error.message,
    })
  } finally {
    permissionLoading.value = false
  }
}

// Computed untuk status "Pilih Semua" di permission dialog
const isAllSelected = computed({
  get: () => {
    const keys = Object.keys(permissionMap.value)
    if (keys.length === 0) return false
    return keys.every((key) => permissionMap.value[key] === true)
  },
  set: (val) => {
    Object.keys(permissionMap.value).forEach((key) => {
      permissionMap.value[key] = val
    })
  },
})

// Lifecycle
onMounted(async () => {
  await fetchPermissions() // Ambil master permission terlebih dahulu
  await onRequest({ pagination: pagination.value, filter: filter.value })
})
</script>

<template>
  <q-page class="q-pa-sm">
    <!-- TAMPILAN TABEL ROLE (KETIKA FORM TIDAK DITAMPILKAN) -->
    <q-card v-if="!showRoleForm" flat bordered>
      <q-table
        title="Data Role / Peran"
        :rows="roles"
        :columns="columns"
        row-key="id"
        v-model:pagination="pagination"
        :loading="loading"
        :filter="filter"
        @request="onRequest"
        flat
        bordered
        separator="cell"
        binary-state-sort
        no-data-label="Tidak ada data role"
        no-results-label="Pencarian tidak ditemukan"
        class="my-zebra-table"
      >
        <template v-slot:top-right>
          <q-input
            debounce="300"
            v-model="filter"
            placeholder="Cari Nama Role..."
            label="Cari Nama Role..."
            outlined
            clearable
            dense
            style="min-width: 200px; background: white"
            class="q-mr-sm"
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>

          <q-btn
            color="primary"
            icon="add"
            label="Tambah Role"
            @click="bukaFormTambahRole"
            class="q-mr-sm"
            unelevated
          />
          <q-btn
            round
            color="teal"
            icon="refresh"
            @click="onRequest({ pagination, filter })"
            unelevated
          >
            <q-tooltip>Refresh Data</q-tooltip>
          </q-btn>
        </template>

        <!-- Kolom Nomor Urut
        <template v-slot:body-cell-no="props">
          <q-td :props="props" class="text-center">
            {{ (pagination.page - 1) * pagination.rowsPerPage + props.rowIndex + 1 }}
          </q-td>
        </template>
-->
        <template v-slot:body-cell-no="props">
          <q-td :props="props" class="text-center">
            {{ props.rowIndex + 1 }}
          </q-td>
        </template>

        <!-- Kolom Status Aktif -->
        <template v-slot:body-cell-b_aktif="props">
          <q-td :props="props">
            <q-chip
              :color="props.row.b_aktif ? 'green-1 text-green-9' : 'red-1 text-red-9'"
              :label="props.row.b_aktif ? 'Aktif' : 'Non-Aktif'"
              size="sm"
              class="text-weight-bold"
            />
          </q-td>
        </template>

        <!-- Kolom Aksi -->
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-x-sm">
            <q-btn
              color="secondary"
              icon="lock_open"
              label="Hak Akses"
              size="sm"
              dense
              class="q-px-sm"
              @click="openPermissionDialog(props.row)"
            >
              <q-tooltip>Kelola Distribusi Menu & Aksi</q-tooltip>
            </q-btn>

            <q-btn
              flat
              dense
              color="amber-9"
              icon="edit"
              @click="bukaFormEditRole(props.row)"
              title="Edit Role"
            />

            <q-btn
              flat
              dense
              color="negative"
              icon="delete"
              @click="hapusRole(props.row)"
              title="Hapus Role"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- FORM CRUD ROLE (NON-MODAL) -->
    <q-card v-else flat bordered>
      <q-card-section class="row items-center q-pb-none">
        <q-btn flat round dense icon="arrow_back" @click="tutupFormRole" class="q-mr-sm" />
        <div class="text-h6">{{ isEditRole ? 'Edit Data Role' : 'Tambah Role Baru' }}</div>
      </q-card-section>

      <q-card-section class="q-pa-sm">
        <q-form @submit.prevent="simpanRole" class="q-gutter-y-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-8">
              <q-input
                v-model="roleForm.c_role"
                label="Nama Role / Peran *"
                outlined
                dense
                autofocus
                placeholder="Contoh: Wakil Kepala Sekolah, Piket"
                :rules="[(val) => !!val || 'Nama role harus diisi']"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-toggle v-model="roleForm.b_aktif" label="Status Role Aktif" color="primary" />
            </div>
          </div>

          <div class="row justify-end q-mt-lg q-gutter-sm">
            <q-btn label="Batal" color="secondary" flat @click="tutupFormRole" />
            <q-btn
              type="submit"
              :label="isEditRole ? 'Update Role' : 'Simpan Role'"
              color="primary"
              icon="save"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>

    <!-- DIALOG DISTRIBUSI PERMISSION (TETAP MENGGUNAKAN MODAL) -->
    <q-dialog v-model="permissionDialog" persistent max-width="600px">
      <q-card style="width: 550px; max-width: 100vw">
        <q-card-section class="row items-center q-px-md q-pt-md q-pb-none">
          <div>
            <div class="text-h6 text-weight-bold text-primary" style="line-height: 1.2">
              Atur Matriks Hak Akses
            </div>
            <div class="text-caption text-grey-7 row items-center q-mt-xs">
              Peran:
              <span class="text-weight-bold text-dark q-ml-xs">
                {{ selectedRoleForPermission?.c_role }}
              </span>
            </div>
          </div>

          <q-space />

          <div class="row items-center q-gutter-x-sm">
            <div
              class="row items-center bg-grey-1 q-px-sm rounded-borders"
              style="border: 1px solid #e0e0e0; height: 36px"
            >
              <span class="text-caption text-dark q-mr-xs text-weight-bold">Pilih Semua</span>
              <q-toggle v-model="isAllSelected" color="positive" dense />
            </div>

            <q-btn icon="close" flat round dense v-close-popup color="grey-7" />
          </div>
        </q-card-section>

        <q-card-section class="scroll q-py-md" style="max-height: 65vh">
          <div class="text-caption text-blue-9 q-mb-md bg-blue-1 q-pa-sm rounded-borders">
            💡 Aktifkan tanda centang untuk menampilkan item menu pada aplikasi pengguna.
          </div>

          <q-list bordered separator class="rounded-borders">
            <template v-for="menu in menuConfig" :key="menu.c_code">
              <template v-if="menu.children && menu.children.length > 0">
                <q-item-label
                  header
                  class="text-primary text-weight-bold q-mt-sm bg-grey-1 q-py-xs"
                >
                  Grup: {{ menu.c_nama }}
                </q-item-label>

                <q-item>
                  <q-item-section avatar style="min-width: 40px">
                    <q-icon :name="menu.icon" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-bold text-dark">{{
                      menu.c_nama
                    }}</q-item-label>
                    <q-item-label caption class="text-grey-6"
                      >Induk Menu ({{ menu.c_code }})</q-item-label
                    >
                  </q-item-section>
                  <q-item-section side>
                    <q-toggle v-model="permissionMap[menu.c_code]" color="primary" />
                  </q-item-section>
                </q-item>

                <q-item v-for="child in menu.children" :key="child.c_code" class="q-pl-xl">
                  <q-item-section avatar style="min-width: 40px">
                    <q-icon :name="child.icon" size="xs" color="grey-5" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-body2 text-grey-9">{{ child.c_nama }}</q-item-label>
                    <q-item-label caption class="text-grey-6">
                      Kode: {{ child.c_code }}
                      <span v-if="child.action" class="text-orange-8"
                        >| Aksi: {{ child.action }}</span
                      >
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-toggle v-model="permissionMap[child.c_code]" color="secondary" />
                  </q-item-section>
                </q-item>
              </template>

              <q-item v-else>
                <q-item-section avatar style="min-width: 40px">
                  <q-icon :name="menu.icon" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-bold text-dark">{{ menu.c_nama }}</q-item-label>
                  <q-item-label caption class="text-grey-6">
                    Menu Utama Tunggal ({{ menu.c_code }})
                    <span v-if="menu.action" class="text-orange-8">| Aksi: {{ menu.action }}</span>
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-toggle v-model="permissionMap[menu.c_code]" color="primary" />
                </q-item-section>
              </q-item>
            </template>
          </q-list>
        </q-card-section>

        <q-card-actions
          align="right"
          class="q-py-md q-px-md bg-grey-1"
          style="border-top: 1px solid #e0e0e0"
        >
          <q-btn flat label="Batal" v-close-popup color="grey-8" :disable="permissionLoading" />
          <q-btn
            unelevated
            label="Simpan Hak Akses"
            color="primary"
            :loading="permissionLoading"
            @click="savePermissions"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
/* Optional: styling zebra table seperti pada KelasPage */
.my-zebra-table :deep(.q-table tbody tr:nth-child(even)) {
  background-color: #f5f5f5;
}
</style>

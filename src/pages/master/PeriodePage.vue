<script setup>
//mark 1
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { pb } from 'boot/pocketbase'
import { handlePBError } from 'src/lib/errorHandler'

const $q = useQuasar()

// State Data Table & UI
const rows = ref([])
const loading = ref(false)
const showForm = ref(false)
const isEdit = ref(false)

// State Pagination & Sorting Server-Side
const pagination = ref({
  sortBy: 'c_periode_id',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

// State Form
const form = ref({
  id: '',
  c_periode_id: '',
  b_aktif: false,
})

// ============================================
// KONFIGURASI KOLOM Q-TABLE
// ============================================
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no', style: 'vertical-align: top;' },
  {
    name: 'c_periode_id',
    label: 'KODE PERIODE',
    align: 'left',
    field: 'c_periode_id',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'c_periode',
    label: 'PERIODE',
    align: 'left',
    field: 'c_periode',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'b_aktif',
    label: 'STATUS',
    align: 'center',
    field: 'b_aktif',
    sortable: true,
    style: 'vertical-align: top;',
  },
  {
    name: 'actions',
    label: 'AKSI',
    align: 'center',
    field: 'actions',
    style: 'vertical-align: top;',
  },
]

// ============================================
// FUNGSI FETCH DATA (DIPANGGIL OLEH Q-TABLE)
// ============================================
const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination

  loading.value = true

  try {
    let sortString = sortBy ? (descending ? `-${sortBy}` : `+${sortBy}`) : ''
    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage

    const result = await pb.collection('tb_mst_periode').getList(page, fetchLimit, {
      sort: sortString,
    })

    pagination.value.page = page
    pagination.value.rowsPerPage = rowsPerPage
    pagination.value.rowsNumber = result.totalItems
    pagination.value.sortBy = sortBy
    pagination.value.descending = descending

    rows.value = result.items
  } catch (error) {
    handlePBError(error)
  } finally {
    loading.value = false
  }
}

// ============================================
// FUNGSI CRUD
// ============================================
const simpanData = async () => {
  try {
    loading.value = true // Beri loading agar user tidak klik berkali-kali

    // 1. Jika user menset periode ini AKTIF, maka nonaktifkan periode lain terlebih dahulu
    if (form.value.b_aktif === true) {
      // Cari record yang saat ini b_aktif = true
      const activePeriods = await pb.collection('tb_mst_periode').getFullList({
        filter: 'b_aktif = true',
      })

      // Update semua yang aktif menjadi false (kecuali dirinya sendiri jika sedang edit)
      for (const item of activePeriods) {
        if (item.id !== form.value.id) {
          await pb.collection('tb_mst_periode').update(item.id, { b_aktif: false })
        }
      }
    }

    // 2. Siapkan Payload
    const payload = {
      c_periode_id: form.value.c_periode_id,
      b_aktif: form.value.b_aktif,
    }

    // 3. Eksekusi Simpan/Update
    if (isEdit.value) {
      await pb.collection('tb_mst_periode').update(form.value.id, payload)
      $q.notify({ type: 'positive', message: 'Data berhasil diupdate!', position: 'bottom' })
    } else {
      await pb.collection('tb_mst_periode').create(payload)
      $q.notify({ type: 'positive', message: 'Data berhasil ditambahkan!', position: 'bottom' })
    }

    tutupForm()
    onRequest({ pagination: pagination.value })
  } catch (error) {
    console.error('Proses simpan gagal:', error)
    handlePBError(error, {
      c_periode_id: {
        validation_not_unique: `Gagal! Periode "${form.value.c_periode_id}" sudah ada di database.`,
      },
    })
  } finally {
    loading.value = false
  }
}

const hapusData = (id, namaPeriode) => {
  $q.dialog({
    title: 'Konfirmasi',
    message: `Yakin ingin menghapus periode <strong>${namaPeriode}</strong>?`,
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await pb.collection('tb_mst_periode').delete(id)
      $q.notify({ type: 'positive', message: 'Data berhasil dihapus!', position: 'bottom' })
      onRequest({ pagination: pagination.value })
    } catch (error) {
      handlePBError(error)
    }
  })
}

// ============================================
// KONTROL FORM
// ============================================
const bukaFormTambah = () => {
  isEdit.value = false
  form.value = {
    id: '',
    c_periode_id: '',
    c_periode: '',
    b_aktif: false,
  }
  showForm.value = true
}

const bukaFormEdit = (item) => {
  isEdit.value = true
  form.value = {
    id: item.id,
    c_periode_id: item.c_periode_id || '',
    c_periode: item.c_periode || '',
    b_aktif: item.b_aktif ?? false,
  }
  showForm.value = true
}

const tutupForm = () => {
  showForm.value = false
}

onMounted(() => {
  onRequest({ pagination: pagination.value })
})
</script>

<template>
  <q-page class="q-pa-sm">
    <q-card v-if="!showForm" flat bordered>
      <q-table
        title="Data Periode"
        :rows="rows"
        :columns="columns"
        row-key="id"
        v-model:pagination="pagination"
        :loading="loading"
        @request="onRequest"
        flat
        bordered
        separator="cell"
        binary-state-sort
        no-data-label="Data tidak ditemukan"
      >
        <template v-slot:top-right>
          <q-btn
            color="primary"
            icon="add"
            label="Tambah"
            @click="bukaFormTambah"
            class="q-mr-sm"
            unelevated
          />
          <q-btn round color="teal" icon="refresh" @click="onRequest({ pagination })" unelevated>
            <q-tooltip>Refresh Data</q-tooltip>
          </q-btn>
        </template>

        <template v-slot:body-cell-no="props">
          <q-td :props="props" class="text-center">
            {{ (pagination.page - 1) * pagination.rowsPerPage + props.rowIndex + 1 }}
          </q-td>
        </template>

        <template v-slot:body-cell-b_aktif="props">
          <q-td :props="props">
            <q-badge :color="props.row.b_aktif ? 'positive' : 'grey-5'" class="q-px-md q-py-sm">
              {{ props.row.b_aktif ? 'Aktif' : 'Nonaktif' }}
            </q-badge>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-x-sm">
            <q-btn
              flat
              dense
              color="primary"
              icon="edit"
              @click="bukaFormEdit(props.row)"
              title="Edit"
            />
            <q-btn
              flat
              dense
              color="negative"
              icon="delete"
              @click="hapusData(props.row.id, props.row.c_periode_id)"
              title="Hapus"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-card v-else flat bordered>
      <q-card-section class="row items-center q-pb-none">
        <q-btn flat round dense icon="arrow_back" @click="tutupForm" class="q-mr-sm" />
        <div class="text-h6">
          {{ isEdit ? 'Edit Data Periode' : 'Tambah Data Periode Baru' }}
        </div>
      </q-card-section>

      <q-card-section class="q-pa-sm">
        <q-form @submit.prevent="simpanData" class="q-gutter-y-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input v-model="form.c_periode_id" label="Kode Periode *" outlined dense required />
            </div>

            <div class="col-12 col-md-6">
              <q-input v-model="form.c_periode" label="Periode *" outlined dense required />
            </div>

            <div class="col-12 col-md-6 flex items-center">
              <q-toggle
                v-model="form.b_aktif"
                :label="form.b_aktif ? 'Aktif' : 'Nonaktif'"
                color="green"
                keep-color
                icon="check"
                size="lg"
                unchecked-icon="clear"
              />
            </div>
          </div>

          <div class="row justify-end q-mt-lg q-gutter-sm">
            <q-btn label="Batal" color="secondary" flat @click="tutupForm" />
            <q-btn
              type="submit"
              :label="isEdit ? 'Update Data' : 'Simpan Data'"
              color="primary"
              icon="save"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped>
/* Quasar menangani layout, spacing, form, dan table secara bawaan */
</style>

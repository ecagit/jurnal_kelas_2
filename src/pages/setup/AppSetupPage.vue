<template>
  <q-page class="q-pa-sm">
    <q-card v-if="!showForm" flat bordered>
      <q-table
        title="Setup Aplikasi"
        :rows="rows"
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
        no-data-label="Data tidak ditemukan"
        no-results-label="Pencarian tidak ditemukan"
        class="my-zebra-table"
      >
        <template v-slot:top-right>
          <q-input
            debounce="300"
            v-model="filter"
            placeholder="Cari ID / Value..."
            label="Cari ID / Value..."
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
            label="Tambah"
            @click="bukaFormTambah"
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

        <template v-slot:body-cell-no="props">
          <q-td :props="props" class="text-center">
            {{ props.rowIndex + 1 }}
          </q-td>
        </template>

        <template v-slot:body-cell-j_set="props">
          <q-td :props="props">
            <div v-for="(item, idx) in props.row.j_set" :key="idx" class="text-caption">
              {{ item }}
            </div>
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
              @click="hapusData(props.row.id, props.row.c_set_id)"
              title="Hapus"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-card v-else flat bordered>
      <q-card-section class="row items-center q-pb-none">
        <q-btn flat round dense icon="arrow_back" @click="tutupForm" class="q-mr-sm" />
        <div class="text-h6">{{ isEdit ? 'Edit Setup' : 'Tambah Setup Baru' }}</div>
      </q-card-section>

      <q-card-section class="q-pa-sm">
        <q-form @submit.prevent="simpanData" class="q-gutter-y-md">
          <div class="row q-col-gutter-md">
            <div class="col-12">
              <q-input
                v-model="form.c_set_id"
                label="Set ID *"
                outlined
                dense
                required
                hint="Contoh: info_sekolah, pengaturan_aplikasi"
                :disable="isEdit"
              />
            </div>

            <div class="col-12">
              <q-card flat bordered class="q-pa-md bg-grey-1">
                <div class="text-subtitle2 q-mb-sm text-primary">Data Pengaturan (JSON Array)</div>

                <div v-if="form.dynamicList.length === 0" class="text-caption text-grey q-mb-md">
                  Belum ada entri. Klik "Tambah Elemen" untuk membuat editbox baru.
                </div>

                <div
                  v-for="(item, index) in form.dynamicList"
                  :key="index"
                  class="row q-col-gutter-sm q-mb-sm items-center"
                >
                  <div class="col-12 col-sm-4">
                    <q-input
                      v-model="item.key"
                      label="Label / Kunci"
                      outlined
                      dense
                      placeholder="Cth: Nama"
                    />
                  </div>
                  <div class="col-12 col-sm-7">
                    <q-input
                      v-model="item.value"
                      label="Isi Nilai"
                      outlined
                      dense
                      placeholder="Cth: SMPN 1 Palu"
                    />
                  </div>
                  <div class="col-12 col-sm-1 flex flex-center">
                    <q-btn
                      icon="delete"
                      color="negative"
                      flat
                      round
                      dense
                      @click="removeDynamicItem(index)"
                    >
                      <q-tooltip>Hapus Baris</q-tooltip>
                    </q-btn>
                  </div>
                </div>

                <q-btn
                  icon="add"
                  label="Tambah Elemen"
                  color="primary"
                  flat
                  dense
                  class="q-mt-sm"
                  @click="addDynamicItem"
                />
              </q-card>
            </div>
          </div>

          <div class="row justify-end q-mt-lg q-gutter-sm">
            <q-btn label="Batal" color="secondary" flat @click="tutupForm" />
            <q-btn
              type="submit"
              :label="isEdit ? 'Update Data' : 'Simpan Data'"
              color="primary"
              icon="save"
              unelevated
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { pb } from 'boot/pocketbase'
import { handlePBError } from 'src/lib/errorHandler'

const $q = useQuasar()

// State
const rows = ref([])
const loading = ref(false)
const filter = ref('')
const showForm = ref(false)
const isEdit = ref(false)

const pagination = ref({
  sortBy: 'c_set_id',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

// MODIFIKASI: Form data disederhanakan
const form = ref({
  id: '',
  c_set_id: '',
  dynamicList: [], // Menyimpan array of { key: '', value: '' }
})

// Columns table
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no' },
  { name: 'c_set_id', label: 'SET ID', align: 'left', field: 'c_set_id', sortable: true },
  { name: 'j_set', label: 'NILAI (JSON)', align: 'left', field: 'j_set', sortable: false },
  { name: 'actions', label: 'AKSI', align: 'center', field: 'actions' },
]

// ============================================
// LOGIKA FORM DINAMIS (KEY-VALUE BUILDER)
// ============================================
const addDynamicItem = () => {
  form.value.dynamicList.push({ key: '', value: '' })
}

const removeDynamicItem = (index) => {
  form.value.dynamicList.splice(index, 1)
}

// Convert ["Nama: SMPN 1 Palu"] -> [{ key: 'Nama', value: 'SMPN 1 Palu' }]
const parseJSetToDynamicList = (j_set) => {
  if (!j_set || !Array.isArray(j_set)) return []

  return j_set.map((item) => {
    const separatorIndex = item.indexOf(':')
    if (separatorIndex === -1) return { key: item, value: '' }
    return {
      key: item.substring(0, separatorIndex).trim(),
      value: item.substring(separatorIndex + 1).trim(),
    }
  })
}

// Convert [{ key: 'Nama', value: 'SMPN 1 Palu' }] -> ["Nama: SMPN 1 Palu"]
const formatDynamicListToJSet = (list) => {
  return list
    .filter((item) => item.key.trim() !== '') // Abaikan jika kuncinya kosong
    .map((item) => `${item.key.trim()}: ${item.value.trim()}`)
}

// Smart Auto-Populate: Munculkan 7 field jika user mengetik info_sekolah
watch(
  () => form.value.c_set_id,
  (newVal) => {
    if (!isEdit.value && newVal === 'info_sekolah' && form.value.dynamicList.length === 0) {
      form.value.dynamicList = [
        { key: 'Nama', value: '' },
        { key: 'NPSN', value: '' },
        { key: 'Alamat', value: '' },
        { key: 'Kelurahan', value: '' },
        { key: 'Kecamatan', value: '' },
        { key: 'Telepon', value: '' },
        { key: 'email', value: '' },
      ]
    }
  },
)

// ============================================
// FETCH DATA
// ============================================
const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  const filterValue = props.filter
  loading.value = true
  try {
    let sortString = sortBy ? (descending ? `-${sortBy}` : `+${sortBy}`) : ''
    let filterString = filterValue ? `c_set_id ~ "${filterValue}"` : ''
    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage
    const result = await pb.collection('tb_set_app').getList(page, fetchLimit, {
      sort: sortString,
      filter: filterString,
    })
    pagination.value = {
      ...pagination.value,
      page,
      rowsPerPage,
      rowsNumber: result.totalItems,
      sortBy,
      descending,
    }
    rows.value = result.items
  } catch (error) {
    handlePBError(error)
  } finally {
    loading.value = false
  }
}

// ============================================
// CRUD
// ============================================
const simpanData = async () => {
  try {
    const payload = {
      c_set_id: form.value.c_set_id,
      j_set: formatDynamicListToJSet(form.value.dynamicList),
    }

    if (isEdit.value) {
      await pb.collection('tb_set_app').update(form.value.id, payload)
      $q.notify({ type: 'positive', message: 'Data berhasil diupdate!', position: 'bottom' })
    } else {
      await pb.collection('tb_set_app').create(payload)
      $q.notify({ type: 'positive', message: 'Data berhasil ditambahkan!', position: 'bottom' })
    }
    tutupForm()
    onRequest({ pagination: pagination.value, filter: filter.value })
  } catch (error) {
    console.error('Proses simpan gagal:', error)
    handlePBError(error, {
      c_set_id: {
        validation_not_unique: `Gagal! Set ID "${form.value.c_set_id}" sudah ada.`,
      },
    })
  }
}

const hapusData = (id, setID) => {
  $q.dialog({
    title: 'Konfirmasi',
    message: `Yakin ingin menghapus setup <strong>${setID}</strong>?`,
    html: true,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await pb.collection('tb_set_app').delete(id)
      $q.notify({ type: 'positive', message: 'Data berhasil dihapus!', position: 'bottom' })
      onRequest({ pagination: pagination.value, filter: filter.value })
    } catch (error) {
      handlePBError(error)
    }
  })
}

// ============================================
// FORM CONTROL
// ============================================
const bukaFormTambah = () => {
  isEdit.value = false
  form.value = {
    id: '',
    c_set_id: '',
    dynamicList: [], // Reset array
  }
  showForm.value = true
}

const bukaFormEdit = (item) => {
  isEdit.value = true
  form.value = {
    id: item.id,
    c_set_id: item.c_set_id,
    // Ekstrak string JSON "Key: Val" menjadi array object textboxes terpisah
    dynamicList: parseJSetToDynamicList(item.j_set),
  }
  showForm.value = true
}

const tutupForm = () => {
  showForm.value = false
}

onMounted(() => {
  onRequest({ pagination: pagination.value, filter: filter.value })
})
</script>

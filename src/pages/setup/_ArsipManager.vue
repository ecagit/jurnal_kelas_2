<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { pb } from 'boot/pocketbase'
import { useAuthStore } from 'src/stores/authStore'

const $q = useQuasar()

// --- STATE MANAGEMENT ---
const loading = ref(false)
const formLoading = ref(false)
const filterText = ref('')
const currentFolderId = ref('')
const folderPath = ref([])
const selected = ref([])
const authStore = useAuthStore()

const allMediaData = ref([])
const activeContext = computed(() => authStore.roleContext || {})
const bidangOptions = computed(() => activeContext.value.j_mapel_id || [])

const selectedRow = computed(() => (selected.value.length > 0 ? selected.value[0] : null))

const filteredRows = computed(() => {
  return allMediaData.value.filter((item) => {
    const masterId = item.c_master_id || ''
    return masterId === currentFolderId.value
  })
})

const columns = [
  { name: 'c_judul', align: 'left', label: 'Nama / Deskripsi', field: 'c_judul', sortable: true },
  { name: 'c_bidang', align: 'center', label: 'Bidang', field: 'c_bidang', sortable: true },
  { name: 'c_tipe', align: 'center', label: 'Format Tipe', field: 'c_tipe', sortable: true },
]

// --- MODELS FOR DIALOGS ---
const dialogFolder = ref({
  show: false,
  mode: 'create',
  form: { id: null, c_judul: '', c_bidang: '', placement: 'current' },
})

const dialogFile = ref({
  show: false,
  fileInput: null,
  form: { c_judul: '', c_bidang: '', c_tipe: '' },
})

const dialogMove = ref({
  show: false,
  targetFolder: null,
})

// --- STATE UNTUK DIALOG PREVIEW ---
const dialogPreview = ref({
  show: false,
  url: '',
  title: '',
  ext: '',
  type: '',
  zoom: 1,
  rotation: 0,
  originalRotation: 0,
  flipX: 1,
  flipY: 1,
  panX: 0,
  panY: 0,
  isDragging: false,
  startX: 0,
  startY: 0,
  currentRow: null,
  // TAMBAHAN: State untuk Pinch-to-Zoom
  initialPinchDistance: 0,
  initialZoom: 1,
})

// TAMBAHAN: Helper untuk menghitung jarak antara 2 jari
const getPinchDistance = (touches) => {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

// MODIFIKASI: Memisahkan logika geser 1 jari dan cubit 2 jari
const onDragStart = (e) => {
  dialogPreview.value.isDragging = true

  if (e.touches && e.touches.length === 2) {
    // Mode Cubit (Pinch-to-Zoom) dimulai
    dialogPreview.value.initialPinchDistance = getPinchDistance(e.touches)
    dialogPreview.value.initialZoom = dialogPreview.value.zoom
  } else {
    // Mode Geser (Panning) dimulai
    const point = e.touches ? e.touches[0] : e
    dialogPreview.value.startX = point.clientX - dialogPreview.value.panX
    dialogPreview.value.startY = point.clientY - dialogPreview.value.panY
  }
}

// MODIFIKASI: Menghitung skala zoom saat 2 jari bergerak
const onDrag = (e) => {
  if (!dialogPreview.value.isDragging) return

  if (e.touches && e.touches.length === 2) {
    // Mengeksekusi Zoom
    e.preventDefault()
    if (dialogPreview.value.initialPinchDistance > 0) {
      const currentDistance = getPinchDistance(e.touches)
      const scale = currentDistance / dialogPreview.value.initialPinchDistance
      // Batasi zoom minimal 0.4x dan maksimal 5x agar gambar tidak hilang
      dialogPreview.value.zoom = Math.max(0.4, Math.min(dialogPreview.value.initialZoom * scale, 5))
    }
  } else if (!e.touches || e.touches.length === 1) {
    // Mengeksekusi Geser
    e.preventDefault()
    const point = e.touches ? e.touches[0] : e
    dialogPreview.value.panX = point.clientX - dialogPreview.value.startX
    dialogPreview.value.panY = point.clientY - dialogPreview.value.startY
  }
}

// MODIFIKASI: Mencegah gambar melompat saat melepas satu jari setelah mencubit
const onDragEnd = (e) => {
  if (e.touches && e.touches.length === 1) {
    // Jika masih ada 1 jari menempel (selesai zoom, lanjut geser)
    dialogPreview.value.initialPinchDistance = 0
    dialogPreview.value.startX = e.touches[0].clientX - dialogPreview.value.panX
    dialogPreview.value.startY = e.touches[0].clientY - dialogPreview.value.panY
  } else {
    // Semua jari terlepas
    dialogPreview.value.isDragging = false
    dialogPreview.value.initialPinchDistance = 0
  }
}

const resetTransform = () => {
  dialogPreview.value.zoom = 1
  dialogPreview.value.rotation = dialogPreview.value.originalRotation || 0
  dialogPreview.value.flipX = 1
  dialogPreview.value.flipY = 1
  dialogPreview.value.panX = 0
  dialogPreview.value.panY = 0
}

// --- METHOD: LOGIKA PREVIEW FILE ---
const openPreviewDialog = (fileRow) => {
  if (!fileRow || fileRow.c_jenis !== 'file' || !fileRow.f_files) return

  const extension = (fileRow.c_tipe || '').toLowerCase()
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)
  const isPdf = extension === 'pdf'
  const isOffice = ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(extension)

  try {
    const fileUrl = pb.files.getUrl(fileRow, fileRow.f_files)
    const cacheBuster = '?cb=' + new Date().getTime()
    const finalFileUrl = isImage ? fileUrl + cacheBuster : fileUrl

    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`

    const savedRotation = fileRow.c_rotation ? Number(fileRow.c_rotation) : 0

    dialogPreview.value = {
      show: true,
      url: isOffice ? officeViewerUrl : finalFileUrl,
      title: `${fileRow.c_judul}.${extension}`,
      ext: extension,
      type: isImage ? 'image' : isPdf ? 'pdf' : isOffice ? 'office' : 'unsupported',
      zoom: 1,
      rotation: savedRotation,
      originalRotation: savedRotation,
      flipX: 1,
      flipY: 1,
      panX: 0,
      panY: 0,
      isDragging: false,
      startX: 0,
      startY: 0,
      initialPinchDistance: 0,
      initialZoom: 1,
      currentRow: fileRow,
    }
  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: 'Gagal memuat pratinjau.' })
  }
}

// --- WATCHERS ---
watch(currentFolderId, () => {
  selected.value = []
})

const isSavingImage = ref(false)

const saveImageChanges = async () => {
  const rowToSave = dialogPreview.value.currentRow || selectedRow.value
  if (!rowToSave) {
    $q.notify({
      type: 'warning',
      message: 'Tidak ada gambar yang dipilih.',
      position: 'top',
    })
    return
  }

  isSavingImage.value = true

  try {
    const img = new Image()
    img.crossOrigin = 'Anonymous'

    const url = dialogPreview.value.url.includes('?')
      ? dialogPreview.value.url.split('?')[0] + '?t=' + Date.now()
      : dialogPreview.value.url + '?t=' + Date.now()

    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('Gagal memuat gambar'))
      img.src = url
    })

    let rot = dialogPreview.value.rotation % 360
    if (rot < 0) rot += 360
    if (rot === 360) rot = 0

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    const isRotated = rot === 90 || rot === 270
    canvas.width = isRotated ? img.height : img.width
    canvas.height = isRotated ? img.width : img.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.scale(dialogPreview.value.flipX, dialogPreview.value.flipY)
    ctx.rotate((rot * Math.PI) / 180)
    ctx.drawImage(img, -img.width / 2, -img.height / 2)
    ctx.restore()

    const mimeType = dialogPreview.value.ext === 'png' ? 'image/png' : 'image/jpeg'
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, mimeType, 0.95)
    })

    if (!blob) throw new Error('Gagal memproses gambar pada Canvas')

    const formData = new FormData()
    const fileName = `${rowToSave.c_judul}_${Date.now()}.${dialogPreview.value.ext || 'jpg'}`
    formData.append('f_files', blob, fileName)
    formData.append('c_rotation', rot)

    const updatedRecord = await pb.collection('_tb_mst_media').update(rowToSave.id, formData)

    await loadDataFromBackend()

    const updatedRowData = allMediaData.value.find((r) => r.id === rowToSave.id)
    if (updatedRowData) {
      dialogPreview.value.currentRow = updatedRowData
      selected.value = [updatedRowData]
    }

    const newUrl = pb.files.getUrl(updatedRecord, updatedRecord.f_files) + '?cb=' + Date.now()
    dialogPreview.value.url = newUrl

    dialogPreview.value.originalRotation = 0
    dialogPreview.value.rotation = 0
    dialogPreview.value.flipX = 1
    dialogPreview.value.flipY = 1
    dialogPreview.value.panX = 0
    dialogPreview.value.panY = 0
    dialogPreview.value.zoom = 1

    $q.notify({
      type: 'positive',
      message: `Gambar berhasil disimpan dengan rotasi ${rot}°`,
      position: 'top',
      timeout: 3000,
      icon: 'check_circle',
    })
  } catch (error) {
    console.error('Save Image Error:', error)
    $q.notify({
      type: 'negative',
      message: error.message || 'Gagal menyimpan perubahan gambar',
      position: 'top',
      icon: 'error',
    })
  } finally {
    isSavingImage.value = false
  }
}

// --- METHOD: READ DATA DARI POCKETBASE ---
const loadDataFromBackend = async () => {
  loading.value = true
  try {
    const records = await pb.collection('_tb_mst_media').getFullList({
      sort: '-created',
    })
    allMediaData.value = records
  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: 'Gagal memuat data arsip dari server' })
  } finally {
    loading.value = false
  }
}

// --- METHOD: NAVIGASI HIRARKI ---
const onRowDblClick = (row) => {
  if (row.c_jenis === 'folder') {
    currentFolderId.value = row.id
    folderPath.value.push(row)
  } else if (row.c_jenis === 'file') {
    openPreviewDialog(row)
  }
}

const navigateToRoot = () => {
  currentFolderId.value = ''
  folderPath.value = []
}

const navigateToFolder = (index) => {
  const targetFolder = folderPath.value[index]
  currentFolderId.value = targetFolder.id
  folderPath.value = folderPath.value.slice(0, index + 1)
}

// --- METHOD: CREATE & UPDATE FOLDER ---
const openFolderDialog = (mode) => {
  dialogFolder.value.mode = mode
  if (mode === 'create') {
    const defaultBidang = bidangOptions.value.length > 0 ? bidangOptions.value[0] : ''

    dialogFolder.value.form = {
      id: null,
      c_judul: '',
      c_bidang: selectedRow.value?.c_bidang || defaultBidang,
      placement: selectedRow.value && selectedRow.value.c_jenis === 'folder' ? 'sub' : 'current',
    }
  }
  dialogFolder.value.show = true
}

const openRenameDialog = () => {
  if (!selectedRow.value) return
  dialogFolder.value.mode = 'rename'
  dialogFolder.value.form = {
    id: selectedRow.value.id,
    c_judul: selectedRow.value.c_judul,
    c_bidang: selectedRow.value.c_bidang,
    placement: 'current',
  }
  dialogFolder.value.show = true
}

const saveFolder = async () => {
  const form = dialogFolder.value.form
  if (!form.c_judul) return

  formLoading.value = true
  try {
    if (dialogFolder.value.mode === 'create') {
      let computedMasterId = currentFolderId.value
      if (selectedRow.value && selectedRow.value.c_jenis === 'folder' && form.placement === 'sub') {
        computedMasterId = selectedRow.value.id
      }

      const newFolderData = {
        c_master_id: computedMasterId || '',
        c_judul: form.c_judul,
        c_bidang: form.c_bidang,
        c_jenis: 'folder',
        c_tipe: '',
      }

      await pb.collection('_tb_mst_media').create(newFolderData)
      $q.notify({ type: 'positive', message: 'Folder baru sukses dibuat' })
    } else {
      await pb.collection('_tb_mst_media').update(form.id, {
        c_judul: form.c_judul,
      })
      $q.notify({ type: 'positive', message: 'Nama folder berhasil diubah' })
    }

    await loadDataFromBackend()
    dialogFolder.value.show = false
    selected.value = []
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'Proses penyimpanan data ke server gagal' })
  } finally {
    formLoading.value = false
  }
}

// --- METHOD: UPLOAD FILE ---
const openFileDialog = () => {
  dialogFile.value.fileInput = null
  const defaultBidang = bidangOptions.value.length > 0 ? bidangOptions.value[0] : ''

  dialogFile.value.form = {
    c_judul: '',
    c_bidang: selectedRow.value?.c_bidang || defaultBidang,
    c_tipe: '',
  }
  dialogFile.value.show = true
}

const onFileSelected = (file) => {
  if (!file) return

  const originalName = file.name
  const lastDotIndex = originalName.lastIndexOf('.')

  if (lastDotIndex !== -1) {
    dialogFile.value.form.c_judul = originalName.substring(0, lastDotIndex)
    dialogFile.value.form.c_tipe = originalName.substring(lastDotIndex + 1).toLowerCase()
  } else {
    dialogFile.value.form.c_judul = originalName
    dialogFile.value.form.c_tipe = 'unknown'
  }
}

const getTargetUploadLocationName = () => {
  if (selectedRow.value && selectedRow.value.c_jenis === 'folder') {
    return `Sub-folder dari "${selectedRow.value.c_judul}"`
  }
  return currentFolderId.value
    ? `Folder Aktif Saat Ini (${folderPath.value[folderPath.value.length - 1]?.c_judul})`
    : 'Direktori Utama (Root)'
}

const uploadFileAction = async () => {
  const form = dialogFile.value.form
  if (!dialogFile.value.fileInput || !form.c_judul || !form.c_bidang) return

  formLoading.value = true
  try {
    let computedMasterId = currentFolderId.value
    if (selectedRow.value && selectedRow.value.c_jenis === 'folder') {
      computedMasterId = selectedRow.value.id
    }

    const formData = new FormData()
    formData.append('c_master_id', computedMasterId || '')
    formData.append('c_judul', form.c_judul)
    formData.append('c_bidang', form.c_bidang)
    formData.append('c_jenis', 'file')
    formData.append('c_tipe', form.c_tipe)
    formData.append('f_files', dialogFile.value.fileInput)

    await pb.collection('_tb_mst_media').create(formData)

    $q.notify({ type: 'positive', message: 'File berhasil terupload dan dicatat di server' })
    await loadDataFromBackend()
    dialogFile.value.show = false
    selected.value = []
  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: 'Gagal melakukan upload dokumen' })
  } finally {
    formLoading.value = false
  }
}

const downloadFile = (fileRow) => {
  if (!fileRow || fileRow.c_jenis !== 'file' || !fileRow.f_files) return
  try {
    const fileUrl = pb.files.getUrl(fileRow, fileRow.f_files)
    window.open(fileUrl, '_blank')
  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: 'Gagal membuat tautan unduhan' })
  }
}

// --- METHOD: PINDAH FOLDER ---
const openMoveDialog = () => {
  if (!selectedRow.value) return
  dialogMove.value.targetFolder = null
  dialogMove.value.show = true
}

const availableTargetFolders = computed(() => {
  const list = [{ id: 'ROOT_SYSTEM', c_judul: '[ Pindahkan ke ROOT ]' }]
  allMediaData.value.forEach((item) => {
    if (item.c_jenis === 'folder' && item.id !== selectedRow.value?.id) {
      list.push(item)
    }
  })
  return list
})

const executeMoveItem = async () => {
  if (!selectedRow.value || !dialogMove.value.targetFolder) return

  formLoading.value = true
  try {
    const targetId =
      dialogMove.value.targetFolder === 'ROOT_SYSTEM' ? '' : dialogMove.value.targetFolder

    await pb.collection('_tb_mst_media').update(selectedRow.value.id, {
      c_master_id: targetId,
    })

    $q.notify({
      type: 'positive',
      message: `"${selectedRow.value.c_judul}" berhasil dipindahkan.`,
    })

    await loadDataFromBackend()
    dialogMove.value.show = false
    selected.value = []
  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: 'Gagal memindahkan berkas di database' })
  } finally {
    formLoading.value = false
  }
}

// --- METHOD: HAPUS ITEM ---
const confirmDelete = () => {
  if (!selectedRow.value) return

  $q.dialog({
    title: 'Konfirmasi Penghapusan',
    message: `Apakah Anda yakin ingin menghapus ${selectedRow.value.c_jenis}: "${selectedRow.value.c_judul}" secara permanen?`,
    cancel: true,
    persistent: true,
    ok: { label: 'Hapus', color: 'negative', flat: false },
  }).onOk(async () => {
    try {
      await pb.collection('_tb_mst_media').delete(selectedRow.value.id)

      $q.notify({ type: 'positive', message: 'Data berhasil dihapus dari sistem' })
      await loadDataFromBackend()
      selected.value = []
    } catch (e) {
      console.error(e)
      $q.notify({ type: 'negative', message: 'Gagal menghapus item dari database' })
    }
  })
}

// --- FILE HELPER ICONS MAP ---
const getFileIcon = (ext) => {
  if (!ext) return 'insert_drive_file'
  const map = {
    pdf: 'picture_as_pdf',
    docx: 'description',
    doc: 'description',
    xlsx: 'table_view',
    xls: 'table_view',
    jpg: 'image',
    png: 'image',
    jpeg: 'image',
    gif: 'image',
    zip: 'archive',
    rar: 'archive',
  }
  return map[ext.toLowerCase()] || 'insert_drive_file'
}

onMounted(() => {
  loadDataFromBackend()
})
</script>

<template>
  <q-page padding>
    <q-card flat bordered class="q-pa-md">
      <div class="row items-center justify-between q-mb-md">
        <div class="row items-center gap-sm">
          <q-icon name="folder_open" size="md" color="primary" />
          <div class="text-h6">Manajer Arsip & Dokumen</div>
        </div>

        <q-item-section>
          <q-item-label v-if="activeContext.j_mapel_id?.length">
            <q-chip
              v-for="mapel in activeContext.j_mapel_id"
              :key="mapel"
              color="positive"
              text-color="white"
              size="lg"
              dense
            >
              {{ mapel }}
            </q-chip>
          </q-item-label>
          <q-item-label v-else class="text-grey">Belum ada mapel diatur</q-item-label>
        </q-item-section>

        <q-input
          v-model="filterText"
          dense
          outlined
          placeholder="Cari file/folder..."
          class="bg-white"
        >
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>

      <div class="row items-center q-mb-lg bg-grey-2 q-pa-sm rounded-borders">
        <q-btn flat dense icon="home" label="Root" @click="navigateToRoot" color="primary" />
        <span v-for="(folder, index) in folderPath" :key="folder.id" class="row items-center">
          <q-icon name="chevron_right" size="xs" class="q-mx-xs text-grey-6" />
          <q-btn flat dense :label="folder.c_judul" @click="navigateToFolder(index)" />
        </span>
      </div>

      <div class="row gap-md q-mb-md actions-bar">
        <q-btn
          color="primary"
          icon="create_new_folder"
          label="Buat Folder"
          @click="openFolderDialog('create')"
        />
        <q-btn color="secondary" icon="cloud_upload" label="Upload File" @click="openFileDialog" />

        <q-separator vertical class="q-mx-sm" />

        <q-btn
          :disable="!selectedRow"
          color="warning"
          text-color="dark"
          icon="edit"
          label="Rename"
          @click="openRenameDialog"
        />
        <q-btn
          :disable="!selectedRow"
          color="purple"
          icon="drive_file_move"
          label="Pindahkan"
          @click="openMoveDialog"
        />
        <q-btn
          :disable="!selectedRow"
          color="negative"
          icon="delete"
          label="Hapus"
          @click="confirmDelete"
        />
        <q-btn
          :disable="!selectedRow || selectedRow.c_jenis !== 'file'"
          color="cyan"
          icon="visibility"
          label="Preview"
          @click="openPreviewDialog(selectedRow)"
        />
        <q-btn
          :disable="!selectedRow || selectedRow.c_jenis !== 'file'"
          color="info"
          icon="cloud_download"
          label="Download"
          @click="downloadFile(selectedRow)"
        />
      </div>

      <q-banner
        v-if="selectedRow && selectedRow.c_jenis === 'folder'"
        inline-actions
        class="bg-blue-1 text-blue-9 q-mb-md rounded-borders"
      >
        <template v-slot:avatar>
          <q-icon name="info" />
        </template>
        Folder terpilih: <strong>{{ selectedRow.c_judul }}</strong
        >. Item baru akan dibuat di dalam folder ini jika Anda memilih opsi "Sub-Item".
        <template v-slot:action>
          <q-btn flat label="Batal Pilih" @click="((selectedRow = null), (selected = []))" />
        </template>
      </q-banner>

      <q-table
        :rows="filteredRows"
        :columns="columns"
        row-key="id"
        flat
        bordered
        :filter="filterText"
        selection="single"
        v-model:selected="selected"
        :loading="loading"
        no-data-label="Folder ini kosong"
      >
        <template v-slot:body-cell-c_judul="props">
          <q-td :props="props" class="cursor-pointer" @dblclick="onRowDblClick(props.row)">
            <q-icon
              :name="props.row.c_jenis === 'folder' ? 'folder' : getFileIcon(props.row.c_tipe)"
              :color="props.row.c_jenis === 'folder' ? 'amber-8' : 'blue-7'"
              size="sm"
              class="q-mr-sm"
            />
            <span class="text-weight-medium">{{ props.row.c_judul }}</span>
            <q-tooltip v-if="props.row.c_jenis === 'folder'"
              >Double click untuk membuka folder</q-tooltip
            >
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="dialogFolder.show" persistent>
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            {{ dialogFolder.mode === 'create' ? 'Buat Folder Baru' : 'Rename Folder/File' }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div
            v-if="dialogFolder.mode === 'create' && selectedRow && selectedRow.c_jenis === 'folder'"
            class="q-mb-md"
          >
            <span class="text-caption text-grey-7">Lokasi Folder Baru:</span>
            <q-option-group
              v-model="dialogFolder.form.placement"
              :options="[
                { label: 'Di Tingkat Folder saat ini', value: 'current' },
                { label: `Masuk sebagai sub-folder dari: ${selectedRow.c_judul}`, value: 'sub' },
              ]"
              color="primary"
              inline
            />
          </div>

          <q-input
            v-model="dialogFolder.form.c_judul"
            label="Nama Folder *"
            outlined
            dense
            class="q-mb-md"
            :rules="[(val) => !!val || 'Nama folder wajib diisi']"
          />

          <q-select
            v-if="dialogFolder.mode === 'create'"
            v-model="dialogFolder.form.c_bidang"
            :options="bidangOptions"
            label="Bidang *"
            outlined
            dense
            :rules="[(val) => !!val || 'Pilih bidang terlebih dahulu']"
          />
        </q-card-section>

        <q-card-actions align="right" class="text-primary q-pa-md">
          <q-btn flat label="Batal" v-close-popup />
          <q-btn color="primary" label="Simpan" @click="saveFolder" :loading="formLoading" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialogFile.show" persistent>
      <q-card style="min-width: 450px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Upload File Baru</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <q-file
            v-model="dialogFile.fileInput"
            label="Pilih File *"
            outlined
            dense
            class="q-mb-md"
            @update:model-value="onFileSelected"
            :rules="[(val) => !!val || 'File belum dipilih']"
          >
            <template v-slot:prepend>
              <q-icon name="attach_file" />
            </template>
          </q-file>

          <q-input
            v-model="dialogFile.form.c_judul"
            label="Deskripsi / Judul File *"
            outlined
            dense
            class="q-mb-md"
            :rules="[(val) => !!val || 'Judul file wajib diisi']"
          />

          <div class="row gap-md q-mb-md">
            <q-input
              v-model="dialogFile.form.c_tipe"
              label="Ekstensi Tipe File"
              outlined
              dense
              readonly
              disable
              class="col"
            />
            <q-select
              v-model="dialogFile.form.c_bidang"
              :options="bidangOptions"
              label="Bidang *"
              outlined
              dense
              class="col"
              :rules="[(val) => !!val || 'Wajib dipilih']"
            />
          </div>

          <div class="text-caption text-grey-7 bg-amber-1 q-pa-sm rounded-borders">
            <q-icon name="info" color="warning" />
            File akan diupload ke: <strong>{{ getTargetUploadLocationName() }}</strong>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="text-primary q-pa-md">
          <q-btn flat label="Batal" v-close-popup />
          <q-btn
            color="secondary"
            label="Upload"
            @click="uploadFileAction"
            :loading="formLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialogMove.show" persistent>
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Pindahkan Item</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <p>
            Pindahkan <strong>{{ selectedRow?.c_judul }}</strong> ke dalam folder tujuan berikut:
          </p>

          <q-select
            v-model="dialogMove.targetFolder"
            :options="availableTargetFolders"
            option-label="c_judul"
            option-value="id"
            label="Pilih Folder Tujuan"
            outlined
            dense
            emit-value
            map-options
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey"
                  >Tidak ada folder tujuan lain yang tersedia</q-item-section
                >
              </q-item>
            </template>
          </q-select>
        </q-card-section>

        <q-card-actions align="right" class="text-primary q-pa-md">
          <q-btn flat label="Batal" v-close-popup />
          <q-btn
            color="purple"
            label="Pindahkan Sekarang"
            @click="executeMoveItem"
            :loading="formLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog
      v-model="dialogPreview.show"
      maximized
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card class="bg-dark text-white">
        <q-bar class="bg-black text-white q-pa-md" style="height: 50px">
          <q-icon :name="getFileIcon(dialogPreview.ext)" size="sm" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">{{ dialogPreview.title }}</div>
          <q-space />
          <q-btn
            dense
            flat
            icon="cloud_download"
            label="Download"
            @click="downloadFile(selectedRow)"
            class="q-mr-md"
          />
          <q-btn dense flat icon="close" v-close-popup>
            <q-tooltip class="bg-white text-primary">Tutup Pratinjau</q-tooltip>
          </q-btn>
        </q-bar>

        <q-card-section class="q-pa-none flex flex-center" style="height: calc(100vh - 50px)">
          <div v-if="dialogPreview.type === 'image'" class="full-width flex flex-center column">
            <q-toolbar
              class="bg-dark text-white shadow-2 q-mb-md rounded-borders"
              style="width: fit-content; min-width: 300px"
            >
              <q-btn flat round dense icon="zoom_in" @click="dialogPreview.zoom += 0.2" />
              <q-btn
                flat
                round
                dense
                icon="zoom_out"
                @click="dialogPreview.zoom = Math.max(0.4, dialogPreview.zoom - 0.2)"
              />
              <q-separator dark vertical inset class="q-mx-sm" />
              <q-btn flat round dense icon="rotate_left" @click="dialogPreview.rotation -= 90" />
              <q-btn flat round dense icon="rotate_right" @click="dialogPreview.rotation += 90" />
              <q-separator dark vertical inset class="q-mx-sm" />
              <q-btn flat round dense icon="flip" @click="dialogPreview.flipX *= -1" />
              <q-btn
                flat
                round
                dense
                icon="flip"
                class="rotate-90"
                @click="dialogPreview.flipY *= -1"
              />
              <q-separator dark vertical inset class="q-mx-sm" />
              <q-btn flat round dense icon="refresh" color="warning" @click="resetTransform" />
              <q-separator dark vertical inset class="q-mx-sm" />
              <q-btn
                flat
                round
                dense
                icon="save"
                color="positive"
                @click="saveImageChanges"
                :loading="isSavingImage"
              >
                <q-tooltip class="bg-white text-dark">Simpan Posisi Gambar</q-tooltip>
              </q-btn>
            </q-toolbar>

            <div
              class="overflow-hidden flex flex-center"
              style="width: 100%; height: 70vh; background-color: #333; user-select: none"
              :style="{ cursor: dialogPreview.isDragging ? 'grabbing' : 'grab' }"
              @mousedown.prevent="onDragStart"
              @mousemove.prevent="onDrag"
              @mouseup="onDragEnd"
              @mouseleave="onDragEnd"
              @touchstart="onDragStart"
              @touchmove.prevent="onDrag"
              @touchend="onDragEnd"
            >
              <img
                :src="dialogPreview.url"
                :style="{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  transform: `translate(${dialogPreview.panX}px, ${dialogPreview.panY}px) scale(${dialogPreview.zoom}) rotate(${dialogPreview.rotation}deg) scaleX(${dialogPreview.flipX}) scaleY(${dialogPreview.flipY})`,
                  transition: dialogPreview.isDragging ? 'none' : 'transform 0.3s ease',
                  transformOrigin: 'center center',
                }"
                draggable="false"
              />
            </div>
          </div>

          <iframe
            v-else-if="dialogPreview.type === 'pdf'"
            :src="dialogPreview.url"
            width="100%"
            height="100%"
            style="border: none"
          ></iframe>

          <div v-else class="text-center">
            <q-icon name="warning" size="5rem" color="warning" />
            <div class="text-h5 q-mt-md">Pratinjau Tidak Tersedia</div>
            <div class="text-body1 text-grey-5 q-mb-lg">
              Tipe file <strong>.{{ dialogPreview.ext }}</strong> tidak dapat dipratinjau langsung
              di browser.
            </div>
            <q-btn
              color="primary"
              icon="cloud_download"
              label="Download File"
              size="lg"
              @click="downloadFile(selectedRow)"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.gap-md {
  gap: 16px;
}
.gap-sm {
  gap: 8px;
}
.rounded-borders {
  border-radius: 4px;
}
.actions-bar .q-btn {
  text-transform: none;
}
</style>

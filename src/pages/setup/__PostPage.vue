<script setup>
/* catatanku
masih perlu pembatasan file size untuk upload media, bisa ditambahkan validasi sebelum uploadMediaFileToServer dipanggil, misal:
if (file.size > 10 * 1024 * 1024) {
  $q.notify({ type: 'negative', message: 'File terlalu besar. Maksimal 10MB.' })
  return
}
pembatasan bisa bervariasi sesuai jenis media, misal gambar 5MB, audio 10MB, video 50MB, dll. Sesuaikan dengan kebutuhan dan kapasitas server Anda.
*/
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useQuasar, date } from 'quasar'
import { pb } from 'boot/pocketbase'
import { useAuthStore } from 'stores/authStore'
import { handlePBError } from 'src/lib/errorHandler'

// Import Tiptap Core & Extensions
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'

// Import core untuk membuat custom extension Audio & Video
import { Node, mergeAttributes } from '@tiptap/core'

// 1. Impor Ekstensi Baru di bagian atas
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import Youtube from '@tiptap/extension-youtube' // <--- 1. IMPORT YOUTUBE

const $q = useQuasar()
const auth = useAuthStore()

// State Data Table & UI
const rows = ref([])
const loading = ref(false)
const filter = ref('')
const showForm = ref(false)
const isEdit = ref(false)

// State Pagination & Sorting Server-Side
const pagination = ref({
  sortBy: 'd_tanggal',
  descending: true,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

// State Form
const form = ref({
  id: '',
  d_tanggal: '',
  c_judul: '',
  c_post: '',
  c_emp_id: '',
  c_email: '',
})

const toggleLinkPrompt = () => {
  // Ambil URL yang sudah ada jika posisi kursor sedang berada di sebuah link
  const previousUrl = editor.value.getAttributes('link').href

  $q.dialog({
    title: 'Sisipkan Tautan (Link)',
    message: 'Masukkan alamat URL lengkap:',
    prompt: {
      model: previousUrl || 'https://',
      type: 'text',
    },
    cancel: true,
    persistent: true,
  }).onOk((url) => {
    // Jika input dikosongkan, hapus tautan tersebut
    if (url === '' || url === 'https://') {
      editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      // Jika ada isi, pasang link-nya
      editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  })
}

// ============================================
// FUNGSI PROMPT LINK VIDEO (YOUTUBE & MP4)
// ============================================
const promptVideoLink = () => {
  $q.dialog({
    title: 'Embed Link Video',
    message: 'Masukkan link URL Video (MP4) atau link YouTube:',
    prompt: {
      model: 'https://',
      type: 'url',
    },
    cancel: true,
    persistent: true,
  }).onOk((url) => {
    if (!url || url === 'https://') return

    // Deteksi apakah URL mengarah ke YouTube
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')

    if (isYouTube) {
      // Gunakan ekstensi bawaan YouTube
      editor.value.chain().focus().setYoutubeVideo({ src: url }).run()
    } else {
      // Gunakan custom VideoExtension Anda yang sudah ada untuk MP4/WebM eksternal
      editor.value.chain().focus().setVideo({ src: url }).run()
    }
  })
}

// ============================================
// CUSTOM EXTENSION TIPTAP (AUDIO & VIDEO) - Tidak Berubah
// ============================================
const VideoExtension = Node.create({
  name: 'video',
  group: 'block',
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
    }
  },
  parseHTML() {
    return [{ tag: 'video' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(HTMLAttributes, { style: 'max-width: 100%; border-radius: 8px;' }),
    ]
  },
  addCommands() {
    return {
      setVideo:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: options })
        },
    }
  },
})

const AudioExtension = Node.create({
  name: 'audio',
  group: 'block',
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
    }
  },
  parseHTML() {
    return [{ tag: 'audio' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['audio', mergeAttributes(HTMLAttributes, { style: 'width: 100%; margin-top: 8px;' })]
  },
  addCommands() {
    return {
      setAudio:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: options })
        },
    }
  },
})

// ============================================
// 🔥 INISIALISASI TIPTAP EDITOR (DENGAN DUKUNGAN PASTE) 🔥
// ============================================
const editor = useEditor({
  extensions: [
    StarterKit,
    Image,
    VideoExtension,
    AudioExtension, // <--- DISINI TADI KURANG TANDA KOMA ( , )

    // 2. DAFTARKAN EKSTENSI YOUTUBE
    Youtube.configure({
      controls: true,
      nocookie: true,
      allowFullscreen: true,
    }),

    // Konfigurasi Rata Kiri, Tengah, Kanan, Justify
    TextAlign.configure({
      types: ['heading', 'paragraph'], // Diterapkan pada elemen apa saja
    }),

    // Konfigurasi Link
    Link.configure({
      openOnClick: false, // Jangan buka link saat di-klik di dalam editor
      HTMLAttributes: {
        class: 'text-primary', // Tambahkan class Quasar agar warna link otomatis biru
      },
    }),

    // Konfigurasi Tabel
    Table.configure({
      resizable: true, // Memungkinkan baris/kolom ditarik ukurannya
    }),
    TableRow,
    TableHeader,
    TableCell,
  ],
  content: '',
  // 🔥 EDITOR PROPS DI SINI 🔥
  editorProps: {
    // Menggunakan _view dengan underscore agar ESLint tidak protes no-unused-vars
    handlePaste: (_view, event) => {
      const items = (event.clipboardData || event.originalEvent.clipboardData).items

      // Cek apakah ada data di clipboard
      if (!items) return false

      let handled = false

      // Loop semua data di clipboard
      for (const item of items) {
        // Jika data yang di-paste berjenis Image
        if (item.type.indexOf('image') === 0) {
          // 1. Hentikan proses paste standar browser (mencegah Base64)
          event.preventDefault()

          // 2. Ambil file gambar fisiknya dari clipboard
          const file = item.getAsFile()

          // 3. Jalankan fungsi upload ke PocketBase
          uploadMediaFileToServer(file, 'image')

          // Tandai bahwa event paste sudah ditangani secara custom
          handled = true
          break // Biasanya hanya satu gambar per paste
        }
      }

      // Kembalikan true jika ditangani custom, false untuk biarkan Tiptap/Browser tangani
      return handled
    },
  },
  onUpdate: ({ editor }) => {
    form.value.c_post = editor.getHTML()
  },
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

// ============================================
// 🔥 FUNGSI UPLOAD GENERIK KE SERVER POCKETBASE (REFAKTORISASI) 🔥
// ============================================
// Fungsi ini dipisahkan agar bisa dipanggil tombol toolbar DAN event paste
const uploadMediaFileToServer = async (file, type) => {
  // Pastikan koleksi tb_media sudah dibuat di PocketBase
  if (!file) return

  $q.loading.show({ message: `Mengunggah ${type} ke server...` })

  try {
    // 1. Siapkan data file
    const formData = new FormData()
    formData.append('file_upload', file)

    // 2. Unggah ke koleksi tb_media di PocketBase
    const record = await pb.collection('tb_media').create(formData)

    // 3. Ambil URL Absolut permanen dari server
    const fileUrl = pb.files.getUrl(record, record.file_upload)

    // 4. Sisipkan URL server ke editor Tiptap sesuai tipe media
    if (type === 'image') {
      editor.value.chain().focus().setImage({ src: fileUrl }).run()
    } else if (type === 'audio') {
      editor.value.chain().focus().setAudio({ src: fileUrl }).run()
    } else if (type === 'video') {
      editor.value.chain().focus().setVideo({ src: fileUrl }).run()
    }
  } catch (err) {
    console.error('Upload media gagal:', err)
    $q.notify({ type: 'negative', message: 'Gagal mengunggah file media ke server.' })
  } finally {
    $q.loading.hide()
  }
}

// ============================================
// KONTROL TOMBOL TOOLBAR UPLOAD (DISESUAIKAN)
// ============================================
const handleMediaUpload = (type) => {
  // <--- Ubah namanya kembali menjadi ini
  // Buat elemen input file tersembunyi
  const input = document.createElement('input')
  input.type = 'file'

  if (type === 'image') input.accept = 'image/*'
  if (type === 'audio') input.accept = 'audio/*'
  if (type === 'video') input.accept = 'video/*'

  input.onchange = async (e) => {
    const file = e.target.files[0]
    // Panggil fungsi upload generik
    uploadMediaFileToServer(file, type)
  }

  input.click()
}

// ============================================
// KONFIGURASI KOLOM Q-TABLE & FUNGSI CRUD (TIDAK ADA PERUBAHAN LOGIKA)
// ============================================
const columns = [
  { name: 'no', label: 'NO', align: 'center', field: 'no' },
  {
    name: 'd_tanggal',
    label: 'TANGGAL',
    align: 'left',
    field: (row) => date.formatDate(row.d_tanggal, 'DD/MM/YYYY'),
    sortable: true,
  },
  { name: 'c_judul', label: 'JUDUL POST', align: 'left', field: 'c_judul', sortable: true },
  { name: 'c_email', label: 'PENULIS (EMAIL)', align: 'left', field: 'c_email', sortable: true },
  { name: 'actions', label: 'AKSI', align: 'center', field: 'actions' },
]

const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  const filterValue = props.filter
  loading.value = true
  try {
    let sortString = sortBy ? (descending ? `-${sortBy}` : `+${sortBy}`) : '-d_tanggal'
    let filterString = filterValue
      ? `c_judul ~ "${filterValue}" || c_post ~ "${filterValue}" || c_email ~ "${filterValue}"`
      : ''
    const fetchLimit = rowsPerPage === 0 ? 500 : rowsPerPage
    const result = await pb
      .collection('_tb_tr_post')
      .getList(page, fetchLimit, { sort: sortString, filter: filterString })
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

const simpanData = async () => {
  try {
    let kontenHtml = editor.value.getHTML()

    // Ambil base URL PocketBase saat ini dinamis
    const pbBaseUrl = pb.baseUrl

    // Bersihkan URL Absolut menjadi Relatif agar tidak mengikat ke satu IP/Localhost
    const kontenRelatif = kontenHtml.replaceAll(pbBaseUrl, '')

    const payload = {
      d_tanggal: form.value.d_tanggal,
      c_judul: form.value.c_judul,
      c_post: kontenRelatif, // <--- Simpan relatif
      c_email: auth.user?.email || form.value.c_email,
    }

    if (isEdit.value) {
      await pb.collection('_tb_tr_post').update(form.value.id, payload)
    } else {
      payload.c_emp_id = auth.user?.c_emp_id || ''
      payload.c_email = auth.user?.email || ''
      await pb.collection('_tb_tr_post').create(payload)
    }

    tutupForm()
    onRequest({ pagination: pagination.value, filter: filter.value })
  } catch (error) {
    handlePBError(error)
  }
}

const hapusData = (id, judul) => {
  $q.dialog({
    title: 'Konfirmasi Hapus',
    message: `Yakin hapus <strong>"${judul}"</strong>?`,
    html: true,
    cancel: true,
  }).onOk(async () => {
    try {
      await pb.collection('_tb_tr_post').delete(id)
      $q.notify({ type: 'positive', message: 'Post dihapus!', position: 'bottom' })
      onRequest({ pagination: pagination.value, filter: filter.value })
    } catch (error) {
      handlePBError(error)
    }
  })
}

const bukaFormTambah = () => {
  isEdit.value = false
  form.value = {
    id: '',
    d_tanggal: date.formatDate(Date.now(), 'YYYY-MM-DD'),
    c_judul: '',
    c_post: '',
    c_emp_id: auth.user?.c_emp_id || '',
    c_email: auth.user?.email || '',
  }
  editor.value?.commands.setContent('')
  showForm.value = true
}

const bukaFormEdit = (item) => {
  isEdit.value = true
  form.value = { ...item }

  // Perbaikan format tanggal edit
  if (item.d_tanggal) {
    form.value.d_tanggal = date.formatDate(item.d_tanggal, 'YYYY-MM-DD')
  }

  // Konten dari DB berbentuk relatif: /api/files/...
  let kontenDariDb = item.c_post || ''

  // Jika konten tidak diawali http, tambahkan baseUrl PocketBase secara dinamis
  let kontenAbsolut = kontenDariDb.replaceAll('src="/api/files/', `src="${pb.baseUrl}/api/files/`)

  editor.value?.commands.setContent(kontenAbsolut)
  showForm.value = true
}

const tutupForm = () => {
  showForm.value = false
}
onMounted(() => {
  onRequest({ pagination: pagination.value, filter: filter.value })
})
</script>

<template>
  <q-page class="q-pa-sm">
    <q-card v-if="!showForm" flat bordered>
      <q-table
        title="Daftar Pengumuman / Post"
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
      >
        <template v-slot:top-right>
          <q-input
            debounce="300"
            v-model="filter"
            placeholder="Cari..."
            outlined
            dense
            class="q-mr-sm"
          >
            <template v-slot:append><q-icon name="search" /></template>
          </q-input>
          <q-btn
            color="primary"
            icon="add"
            label="Post Baru"
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
          />
        </template>
        <template v-slot:body-cell-no="props">
          <q-td :props="props" class="text-center">{{
            (pagination.page - 1) * pagination.rowsPerPage + props.rowIndex + 1
          }}</q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-x-sm text-center">
            <q-btn flat dense round color="primary" icon="edit" @click="bukaFormEdit(props.row)" />
            <q-btn
              flat
              dense
              round
              color="negative"
              icon="delete"
              @click="hapusData(props.row.id, props.row.c_judul)"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-card v-else flat bordered>
      <q-card-section class="row items-center q-pb-none">
        <q-btn flat round dense icon="arrow_back" @click="tutupForm" class="q-mr-sm" />
        <div class="text-h6">{{ isEdit ? 'Edit Konten Post' : 'Tulis Konten Post Baru' }}</div>
      </q-card-section>

      <q-card-section class="q-pa-md">
        <q-form @submit.prevent="simpanData" class="q-gutter-y-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-4">
              <q-input
                v-model="form.d_tanggal"
                type="date"
                label="Tanggal Post *"
                outlined
                dense
                required
              />
            </div>
            <div class="col-12 col-md-8">
              <q-input v-model="form.c_judul" label="Judul *" outlined dense required />
            </div>

            <div class="col-12">
              <label class="text-weight-medium text-grey-8 block q-mb-xs">Konten Isi Post *</label>
              <div class="tiptap-border-wrapper">
                <div
                  v-if="editor"
                  class="tiptap-toolbar row items-center q-gutter-xs q-pa-xs bg-grey-2 border-bottom"
                >
                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="format_bold"
                    :color="editor.isActive('bold') ? 'primary' : 'grey-7'"
                    @click="editor.chain().focus().toggleBold().run()"
                  />
                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="format_italic"
                    :color="editor.isActive('italic') ? 'primary' : 'grey-7'"
                    @click="editor.chain().focus().toggleItalic().run()"
                  />
                  <q-separator vertical class="q-mx-xs" />

                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="format_align_left"
                    :color="editor.isActive({ textAlign: 'left' }) ? 'primary' : 'grey-7'"
                    @click="editor.chain().focus().setTextAlign('left').run()"
                  />
                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="format_align_center"
                    :color="editor.isActive({ textAlign: 'center' }) ? 'primary' : 'grey-7'"
                    @click="editor.chain().focus().setTextAlign('center').run()"
                  />
                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="format_align_right"
                    :color="editor.isActive({ textAlign: 'right' }) ? 'primary' : 'grey-7'"
                    @click="editor.chain().focus().setTextAlign('right').run()"
                  />
                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="format_align_justify"
                    :color="editor.isActive({ textAlign: 'justify' }) ? 'primary' : 'grey-7'"
                    @click="editor.chain().focus().setTextAlign('justify').run()"
                  />
                  <q-separator vertical class="q-mx-xs" />

                  <q-btn
                    flat
                    dense
                    size="sm"
                    label="H1"
                    :color="editor.isActive('heading', { level: 1 }) ? 'primary' : 'grey-7'"
                    @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
                  />
                  <q-btn
                    flat
                    dense
                    size="sm"
                    label="H2"
                    :color="editor.isActive('heading', { level: 2 }) ? 'primary' : 'grey-7'"
                    @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
                  />
                  <q-separator vertical class="q-mx-xs" />
                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="format_list_bulleted"
                    :color="editor.isActive('bulletList') ? 'primary' : 'grey-7'"
                    @click="editor.chain().focus().toggleBulletList().run()"
                  />
                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="format_list_numbered"
                    :color="editor.isActive('orderedList') ? 'primary' : 'grey-7'"
                    @click="editor.chain().focus().toggleOrderedList().run()"
                  />
                  <q-separator vertical class="q-mx-xs" />

                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="link"
                    :color="editor.isActive('link') ? 'primary' : 'grey-7'"
                    @click="toggleLinkPrompt"
                  />
                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="link_off"
                    color="grey-7"
                    @click="editor.chain().focus().unsetLink().run()"
                    :disabled="!editor.isActive('link')"
                  />
                  <q-separator vertical class="q-mx-xs" />

                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="image"
                    color="grey-7"
                    @click="handleMediaUpload('image')"
                    title="Sisipkan Gambar"
                  />
                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="audiotrack"
                    color="grey-7"
                    @click="handleMediaUpload('audio')"
                    title="Sisipkan Audio MP3"
                  />
                  <!--
                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="movie"
                    color="grey-7"
                    @click="handleMediaUpload('video')"
                    title="Sisipkan Video MP4"
                  />
-->
                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="movie"
                    color="grey-7"
                    @click="handleMediaUpload('video')"
                    title="Upload Video MP4 ke Server"
                  />

                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="smart_display"
                    color="grey-7"
                    @click="promptVideoLink"
                    title="Embed Video dari Tautan (YouTube/MP4)"
                  />

                  <q-separator vertical class="q-mx-xs" />

                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="table_chart"
                    color="grey-7"
                    @click="
                      editor
                        .chain()
                        .focus()
                        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                        .run()
                    "
                    title="Sisipkan Tabel"
                  />

                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="playlist_add"
                    color="grey-7"
                    @click="editor.chain().focus().addRowAfter().run()"
                    :disabled="!editor.isActive('table')"
                    title="Tambah Baris"
                  />

                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="view_column"
                    color="grey-7"
                    @click="editor.chain().focus().addColumnAfter().run()"
                    :disabled="!editor.isActive('table')"
                    title="Tambah Kolom"
                  />

                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="delete_sweep"
                    color="negative"
                    @click="editor.chain().focus().deleteTable().run()"
                    :disabled="!editor.isActive('table')"
                    title="Hapus Tabel"
                  />
                  <q-separator vertical class="q-mx-xs" />

                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="undo"
                    color="grey-7"
                    @click="editor.chain().focus().undo().run()"
                    :disable="!editor.can().undo()"
                  />
                  <q-btn
                    flat
                    dense
                    size="sm"
                    icon="redo"
                    color="grey-7"
                    @click="editor.chain().focus().redo().run()"
                    :disable="!editor.can().redo()"
                  />
                </div>

                <editor-content :editor="editor" class="tiptap-content-area q-pa-md" />
              </div>
            </div>
          </div>

          <div class="row justify-end q-mt-lg q-gutter-sm">
            <q-btn label="Batal" color="secondary" flat @click="tutupForm" />
            <q-btn
              type="submit"
              :label="isEdit ? 'Perbarui Post' : 'Terbitkan Post'"
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

<style scoped>
.tiptap-border-wrapper {
  border: 1px solid rgba(0, 0, 0, 0.24);
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
  transition: border-color 0.3s;
}
.tiptap-border-wrapper:focus-within {
  border-color: var(--q-primary);
}
.tiptap-toolbar {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  flex-wrap: wrap; /* Agar tombol turun ke bawah jika layar HP sempit */
}
.tiptap-content-area {
  min-height: 250px;
  max-height: 500px;
  overflow-y: auto;
}

:deep(.tiptap) {
  outline: none;
}
:deep(.tiptap p) {
  margin: 0 0 8px 0;
}
:deep(.tiptap h1, .tiptap h2) {
  font-weight: bold;
}

/* Styling Tambahan untuk Media Tiptap */
:deep(.tiptap img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  display: block;
  margin: 8px 0;
}
:deep(.tiptap video) {
  max-width: 100%;
  border-radius: 8px;
  display: block;
  margin: 8px 0;
}
:deep(.tiptap audio) {
  width: 100%;
  margin: 8px 0;
  display: block;
}

/* Styling untuk Iframe YouTube agar responsif */
:deep(.tiptap iframe) {
  width: 100%;
  min-height: 320px;
  border-radius: 8px;
  border: none;
  margin: 16px 0;
  display: block;
}

/* Mempertegas outline saat iframe YouTube di-klik di editor */
:deep(.tiptap div[data-youtube-video].ProseMirror-selectednode iframe) {
  outline: 3px solid var(--q-primary);
  outline-offset: 2px;
}

/* Menandai elemen yang sedang di-klik/dipilih di dalam editor */
:deep(.tiptap img.ProseMirror-selectednode),
:deep(.tiptap video.ProseMirror-selectednode),
:deep(.tiptap audio.ProseMirror-selectednode) {
  outline: 3px solid var(--q-primary);
}

/* Styling Tambahan untuk Tabel Tiptap agar terlihat rapi */
:deep(.tiptap table) {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 0;
  overflow: hidden;
}
:deep(.tiptap table td),
:deep(.tiptap table th) {
  min-width: 1em;
  border: 1px solid #ced4da;
  padding: 3px 5px;
  vertical-align: top;
  box-sizing: border-box;
  position: relative;
}
:deep(.tiptap table th) {
  font-weight: bold;
  text-align: left;
  background-color: #f1f3f5;
}
:deep(.tiptap table .selectedCell:after) {
  z-index: 2;
  position: absolute;
  content: '';
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(200, 200, 255, 0.4);
  pointer-events: none;
}
:deep(.tiptap table .column-resize-handle) {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: -2px;
  width: 4px;
  background-color: #adf;
  pointer-events: none;
}
</style>

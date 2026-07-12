<template>
  <q-page class="q-pa-sm">
    <q-card flat bordered class="my-card">
      <q-tabs
        v-model="tab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="left"
        narrow-indicator
        inline-label
        @update:model-value="onTabChange"
      >
        <q-tab name="template" icon="layers" label="Pola Jam" />
        <q-tab name="satuan" icon="watch_later" label="Jam Satuan" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="tab" animated>
        <q-tab-panel name="template" class="q-pa-none">
          <JampelTemplateComponent ref="templateRef" />
        </q-tab-panel>

        <q-tab-panel name="satuan" class="q-pa-none">
          <JamSatComponent ref="jamSatRef" />
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import JampelTemplateComponent from './JampelTemplatePage.vue'
import JamSatComponent from './JamSatPage.vue'

const tab = ref('template')

// Hubungkan template ref dengan komponen anak
const templateRef = ref(null)
const jamSatRef = ref(null)

// State untuk mencatat apakah tab tersebut sudah pernah memuat data sebelumnya
const isTemplateLoaded = ref(false)
const isJamSatLoaded = ref(false)

// Fungsi yang otomatis dipicu saat tab berubah
const onTabChange = async (targetTab) => {
  // Tunggu sampai DOM selesai merender komponen anak secara penuh
  await nextTick()

  if (targetTab === 'template' && !isTemplateLoaded.value) {
    // Pastikan di dalam file JampelTemplatePage.vue Anda, fungsi fetch datanya diexpose atau bernama requestData/loadData
    if (templateRef.value && typeof templateRef.value.onRequest === 'function') {
      console.log('Lazy Loading: Memuat data Template Jam untuk pertama kali...')
      // Jalankan fungsi fetch data milik komponen anak (sesuaikan nama fungsinya, misal: onRequest)
      await templateRef.value.onRequest({ pagination: templateRef.value.pagination })
      isTemplateLoaded.value = true // Tandai sudah di-load
    }
  } else if (targetTab === 'satuan' && !isJamSatLoaded.value) {
    if (jamSatRef.value && typeof jamSatRef.value.onRequest === 'function') {
      console.log('Lazy Loading: Memuat data Jam Satuan untuk pertama kali...')
      // Jalankan fungsi fetch data milik komponen anak JamSat
      await jamSatRef.value.onRequest({ pagination: jamSatRef.value.pagination })
      isJamSatLoaded.value = true // Tandai sudah di-load
    }
  }
}

// Saat halaman induk pertama kali dibuka, muat data untuk tab default (template)
onMounted(() => {
  // Berikan sedikit delay/nextTick agar ref komponen anak sudah siap terikat
  nextTick(() => {
    onTabChange('template')
  })
})
</script>

<style scoped>
.my-card {
  width: 100%;
  background: white;
}
</style>

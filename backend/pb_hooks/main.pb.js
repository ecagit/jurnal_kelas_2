/// <reference path="../pb_data/types.d.ts" />

// Langsung panggil fungsi hooks secara global tanpa prefix 'core.'
onRecordCreate((e) => {
  // Memaksa status user menjadi terverifikasi sebelum data masuk ke DB
  e.record.set('verified', true)
  e.record.set('emailVisibility', true)
  return e.next()
}, 'users')

/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_38756568522")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_lhtex6g7mo` ON `tb_tr_absen_murid` (\n  `c_periode`,\n  `c_kelas_id`,\n  `d_tanggal`\n)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_38756568522")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})

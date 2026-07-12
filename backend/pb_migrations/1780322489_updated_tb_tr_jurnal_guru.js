/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3638381985")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_h25cnhfn6z` ON `tb_tr_jurnal_guru` (\n  `c_periode`,\n  `c_kelas_id`,\n  `d_tanggal`\n)",
      "CREATE INDEX `idx_tzmvzehyde` ON `tb_tr_jurnal_guru` (\n  `c_periode`,\n  `c_guru_id`,\n  `d_tanggal`\n)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3638381985")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_h25cnhfn6z` ON `tb_tr_jurnal_guru` (\n  `c_periode`,\n  `c_kelas_id`,\n  `d_tanggal`\n)"
    ]
  }, collection)

  return app.save(collection)
})

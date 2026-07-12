/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1872512942")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_fya6dvlny0` ON `tb_tr_jurnal_` (\n  `c_hari_id`,\n  `c_guru_id`,\n  `c_mapel_id`\n)"
    ],
    "name": "tb_tr_jurnal_"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1872512942")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_fya6dvlny0` ON `tb_tr_jurnal` (\n  `c_hari_id`,\n  `c_guru_id`,\n  `c_mapel_id`\n)"
    ],
    "name": "tb_tr_jurnal"
  }, collection)

  return app.save(collection)
})

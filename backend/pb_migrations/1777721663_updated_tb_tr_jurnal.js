/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1872512942")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_fya6dvlny0` ON `tb_tr_jurnal` (\n  `c_hari_id`,\n  `c_guru_id`,\n  `c_mapel_id`\n)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1872512942")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})

/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_18725129422")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_jadwal_optimal` ON `tb_mst_jadwal` (\n  `c_periode`,\n  `c_kelas_id`,\n  `n_hari_id`\n)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_18725129422")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_a5od9nxl9i` ON `tb_mst_jadwal` (\n  `c_periode`,\n  `c_kelas_id`,\n  `n_hari_id`\n)"
    ]
  }, collection)

  return app.save(collection)
})

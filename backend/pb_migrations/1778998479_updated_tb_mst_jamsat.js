/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_450536613")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_sbjzdq809f` ON `tb_mst_jamsat` (`c_jam_id`)",
      "CREATE INDEX `idx_xixtnyiply` ON `tb_mst_jamsat` (\n  `c_jam_id`,\n  `n_durasi`,\n  `c_nama`\n)",
      "CREATE INDEX `idx_quch55q6yf` ON `tb_mst_jamsat` (\n  `c_jam_id`,\n  `c_nama`,\n  `n_durasi`\n)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_450536613")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_sbjzdq809f` ON `tb_mst_jamsat` (`c_jam_id`)"
    ]
  }, collection)

  return app.save(collection)
})

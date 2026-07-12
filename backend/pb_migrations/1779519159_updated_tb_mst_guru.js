/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3628563156")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_tdlvyrl16t` ON `tb_mst_guru` (`c_guru_id`)",
      "CREATE UNIQUE INDEX `idx_6lj3ggvr0k` ON `tb_mst_guru` (`c_nip`)",
      "CREATE INDEX `idx_0234ral7ri` ON `tb_mst_guru` (\n  `c_guru_id`,\n  `c_nama`\n)",
      "CREATE INDEX `idx_h0cgm5cv7r` ON `tb_mst_guru` (\n  `c_guru_id`,\n  `c_nip`,\n  `c_nama`\n)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3628563156")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tdlvyrl16t` ON `tb_mst_guru` (`c_guru_id`)",
      "CREATE UNIQUE INDEX `idx_6lj3ggvr0k` ON `tb_mst_guru` (`c_nip`)",
      "CREATE INDEX `idx_0234ral7ri` ON `tb_mst_guru` (\n  `c_guru_id`,\n  `c_nama`\n)",
      "CREATE INDEX `idx_h0cgm5cv7r` ON `tb_mst_guru` (\n  `c_guru_id`,\n  `c_nip`,\n  `c_nama`\n)"
    ]
  }, collection)

  return app.save(collection)
})

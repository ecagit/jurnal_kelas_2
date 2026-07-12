/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3628563156")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tdlvyrl16t` ON `tb_mst_guru` (`c_guru_id`)",
      "CREATE UNIQUE INDEX `idx_6lj3ggvr0k` ON `tb_mst_guru` (`c_nip`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3628563156")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tdlvyrl16t` ON `tb_mst_guru` (`c_guru_id`)"
    ]
  }, collection)

  return app.save(collection)
})

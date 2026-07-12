/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_932674829")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_kaddsbdoxz` ON `tb_mst_kelas` (`c_kelas_id`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_932674829")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})

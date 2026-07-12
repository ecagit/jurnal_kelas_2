/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3044826759")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_2l4oeg5rhh` ON `tb_mst_murid` (`c_murid_id`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3044826759")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})

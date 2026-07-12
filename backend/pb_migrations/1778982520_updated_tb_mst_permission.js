/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3569289686")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_gnv79uasdd` ON `tb_mst_permission` (`c_permission_id`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3569289686")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})

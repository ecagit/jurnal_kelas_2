/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2349596412")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_ekz4d207x1` ON `tb_mst_periode` (`c_periode_id`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2349596412")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})

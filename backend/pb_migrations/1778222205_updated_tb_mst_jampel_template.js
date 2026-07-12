/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1733585326")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_k2r5ns843b` ON `tb_mst_jampel_template` (`c_name`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1733585326")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})

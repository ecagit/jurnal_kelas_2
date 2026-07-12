/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2163867696")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_gz00y5qmd3` ON `tb_mst_agama` (`c_agama`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2163867696")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})

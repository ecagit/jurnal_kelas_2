/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3421343007")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tj6dzzpg4v` ON `tb_mst_mapel` (`c_mapel_id`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3421343007")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})

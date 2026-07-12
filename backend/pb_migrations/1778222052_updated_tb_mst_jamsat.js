/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_450536613")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_sbjzdq809f` ON `tb_mst_jamsat` (`c_jam_id`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_450536613")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})

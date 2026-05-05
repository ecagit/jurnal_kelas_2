/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_18725129422")

  // update collection data
  unmarshal({
    "name": "tb_mst_jadwal"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_18725129422")

  // update collection data
  unmarshal({
    "name": "tb_mst_jampel_"
  }, collection)

  return app.save(collection)
})

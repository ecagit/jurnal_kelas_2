/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1872512942")

  // update collection data
  unmarshal({
    "name": "tb_tr_jurnal"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1872512942")

  // update collection data
  unmarshal({
    "name": "tb_mst_jampel"
  }, collection)

  return app.save(collection)
})

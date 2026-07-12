/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3875656852")

  // update collection data
  unmarshal({
    "name": "tb_tr_absen_murid_"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3875656852")

  // update collection data
  unmarshal({
    "name": "tb_tr_absen_murid"
  }, collection)

  return app.save(collection)
})

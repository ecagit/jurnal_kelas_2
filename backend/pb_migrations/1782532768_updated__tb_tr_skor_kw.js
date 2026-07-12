/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_892539741")

  // update collection data
  unmarshal({
    "name": "_tb_tr_skor"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_892539741")

  // update collection data
  unmarshal({
    "name": "_tb_tr_skor_kw"
  }, collection)

  return app.save(collection)
})

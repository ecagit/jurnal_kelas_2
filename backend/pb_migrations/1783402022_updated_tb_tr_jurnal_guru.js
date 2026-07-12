/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3638381985")

  // remove field
  collection.fields.removeById("bool167871959")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3638381985")

  // add field
  collection.fields.addAt(15, new Field({
    "help": "",
    "hidden": false,
    "id": "bool167871959",
    "name": "b_utama",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
})

/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_892539741")

  // add field
  collection.fields.addAt(19, new Field({
    "help": "",
    "hidden": false,
    "id": "json1850745972",
    "maxSize": 0,
    "name": "j_detail",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_892539741")

  // remove field
  collection.fields.removeById("json1850745972")

  return app.save(collection)
})

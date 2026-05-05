/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2163867696")

  // remove field
  collection.fields.removeById("text2658232491")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2163867696")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2658232491",
    "max": 0,
    "min": 0,
    "name": "c_agama_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
})

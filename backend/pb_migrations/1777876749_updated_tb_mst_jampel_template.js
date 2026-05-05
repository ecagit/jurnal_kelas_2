/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1733585326")

  // remove field
  collection.fields.removeById("text458228865")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1733585326")

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text458228865",
    "max": 0,
    "min": 0,
    "name": "c_kelas_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
})

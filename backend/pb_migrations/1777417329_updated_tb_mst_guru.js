/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3628563156")

  // add field
  collection.fields.addAt(9, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text709219713",
    "max": 0,
    "min": 0,
    "name": "c_jk",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3628563156")

  // remove field
  collection.fields.removeById("text709219713")

  return app.save(collection)
})

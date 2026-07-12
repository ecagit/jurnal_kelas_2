/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3638381985")

  // add field
  collection.fields.addAt(13, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2407248041",
    "max": 0,
    "min": 0,
    "name": "c_chk_str",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(14, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3542687969",
    "max": 0,
    "min": 0,
    "name": "c_chk_end",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3638381985")

  // remove field
  collection.fields.removeById("text2407248041")

  // remove field
  collection.fields.removeById("text3542687969")

  return app.save(collection)
})

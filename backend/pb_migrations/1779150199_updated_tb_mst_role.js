/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1741149284")

  // remove field
  collection.fields.removeById("text3432819625")

  // add field
  collection.fields.addAt(3, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3569289686",
    "help": "",
    "hidden": false,
    "id": "relation3432819625",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "c_permission",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1741149284")

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3432819625",
    "max": 0,
    "min": 0,
    "name": "c_permission",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("relation3432819625")

  return app.save(collection)
})

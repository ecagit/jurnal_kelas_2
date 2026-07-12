/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1741149284")

  // update field
  collection.fields.addAt(3, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3569289686",
    "help": "",
    "hidden": false,
    "id": "relation3432819625",
    "maxSelect": 100,
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

  // update field
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
})

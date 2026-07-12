/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update field
  collection.fields.addAt(8, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1741149284",
    "help": "",
    "hidden": false,
    "id": "relation4090286395",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "c_role",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update field
  collection.fields.addAt(8, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1741149284",
    "help": "",
    "hidden": false,
    "id": "relation4090286395",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "c_role",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})

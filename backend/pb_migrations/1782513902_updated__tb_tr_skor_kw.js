/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_892539741")

  // add field
  collection.fields.addAt(17, new Field({
    "help": "",
    "hidden": false,
    "id": "number779275865",
    "max": null,
    "min": null,
    "name": "n_shootoff1",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(18, new Field({
    "help": "",
    "hidden": false,
    "id": "number3078332387",
    "max": null,
    "min": null,
    "name": "n_shootoff2",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(19, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text691440920",
    "max": 0,
    "min": 0,
    "name": "c_user",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_892539741")

  // remove field
  collection.fields.removeById("number779275865")

  // remove field
  collection.fields.removeById("number3078332387")

  // remove field
  collection.fields.removeById("text691440920")

  return app.save(collection)
})

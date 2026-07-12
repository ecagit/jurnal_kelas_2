/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_892539741")

  // update field
  collection.fields.addAt(17, new Field({
    "help": "",
    "hidden": false,
    "id": "number779275865",
    "max": null,
    "min": null,
    "name": "n_shootoff",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_892539741")

  // update field
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

  return app.save(collection)
})

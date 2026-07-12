/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2202764853")

  // update field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "autodate4217026637",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2202764853")

  // update field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "autodate4217026637",
    "name": "c_email",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
})

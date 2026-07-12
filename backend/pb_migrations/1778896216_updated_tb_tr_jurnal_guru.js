/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3638381985")

  // remove field
  collection.fields.removeById("date3688717994")

  // remove field
  collection.fields.removeById("date2274348770")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3638381985")

  // add field
  collection.fields.addAt(14, new Field({
    "help": "",
    "hidden": false,
    "id": "date3688717994",
    "max": "",
    "min": "",
    "name": "d_jad_str",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(15, new Field({
    "help": "",
    "hidden": false,
    "id": "date2274348770",
    "max": "",
    "min": "",
    "name": "d_jad_end",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
})

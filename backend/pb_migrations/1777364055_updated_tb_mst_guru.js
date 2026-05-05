/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3628563156")

  // add field
  collection.fields.addAt(7, new Field({
    "help": "",
    "hidden": false,
    "id": "date2526182935",
    "max": "",
    "min": "",
    "name": "d_tgl_lahir",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3628563156")

  // remove field
  collection.fields.removeById("date2526182935")

  return app.save(collection)
})

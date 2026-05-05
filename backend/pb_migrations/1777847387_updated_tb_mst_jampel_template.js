/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1733585326")

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2735550250",
    "max": 0,
    "min": 0,
    "name": "c_keterangan",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1733585326")

  // remove field
  collection.fields.removeById("text2735550250")

  return app.save(collection)
})

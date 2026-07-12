/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3995838392")

  // add field
  collection.fields.addAt(2, new Field({
    "help": "",
    "hidden": false,
    "id": "date1166450957",
    "max": "",
    "min": "",
    "name": "d_tanggal",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(3, new Field({
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
  const collection = app.findCollectionByNameOrId("pbc_3995838392")

  // remove field
  collection.fields.removeById("date1166450957")

  // remove field
  collection.fields.removeById("text2735550250")

  return app.save(collection)
})

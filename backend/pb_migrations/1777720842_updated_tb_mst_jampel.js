/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1872512942")

  // add field
  collection.fields.addAt(4, new Field({
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

  // add field
  collection.fields.addAt(5, new Field({
    "help": "",
    "hidden": false,
    "id": "date4079991826",
    "max": "",
    "min": "",
    "name": "d_hdr_str",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "help": "",
    "hidden": false,
    "id": "date2944216154",
    "max": "",
    "min": "",
    "name": "d_hdr_end",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "help": "",
    "hidden": false,
    "id": "number1718858296",
    "max": null,
    "min": null,
    "name": "n_hdr_dur",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(2, new Field({
    "help": "",
    "hidden": false,
    "id": "number1876356228",
    "max": null,
    "min": null,
    "name": "n_jad_dur",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "date993929639",
    "max": "",
    "min": "",
    "name": "d_jad_str",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1872512942")

  // remove field
  collection.fields.removeById("date2274348770")

  // remove field
  collection.fields.removeById("date4079991826")

  // remove field
  collection.fields.removeById("date2944216154")

  // remove field
  collection.fields.removeById("number1718858296")

  // update field
  collection.fields.addAt(2, new Field({
    "help": "",
    "hidden": false,
    "id": "number1876356228",
    "max": null,
    "min": null,
    "name": "n_durasi",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "date993929639",
    "max": "",
    "min": "",
    "name": "d_jad_star",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
})

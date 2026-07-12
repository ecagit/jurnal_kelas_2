/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_892539741")

  // remove field
  collection.fields.removeById("text2676217692")

  // remove field
  collection.fields.removeById("text2775238955")

  // remove field
  collection.fields.removeById("text1644546635")

  // remove field
  collection.fields.removeById("text1850091208")

  // add field
  collection.fields.addAt(10, new Field({
    "help": "",
    "hidden": false,
    "id": "number1729303533",
    "max": null,
    "min": null,
    "name": "n_ord",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "help": "",
    "hidden": false,
    "id": "number2775238955",
    "max": null,
    "min": null,
    "name": "n_score_total",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(12, new Field({
    "help": "",
    "hidden": false,
    "id": "number1644546635",
    "max": null,
    "min": null,
    "name": "n_scorex_total",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(13, new Field({
    "help": "",
    "hidden": false,
    "id": "number1850091208",
    "max": null,
    "min": null,
    "name": "n_score10_total",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(14, new Field({
    "help": "",
    "hidden": false,
    "id": "number2155459718",
    "max": null,
    "min": null,
    "name": "n_score9_total",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(15, new Field({
    "help": "",
    "hidden": false,
    "id": "number638500658",
    "max": null,
    "min": null,
    "name": "n_score8_total",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(16, new Field({
    "help": "",
    "hidden": false,
    "id": "number3494301659",
    "max": null,
    "min": null,
    "name": "n_score7_total",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_892539741")

  // add field
  collection.fields.addAt(10, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2676217692",
    "max": 0,
    "min": 0,
    "name": "c_ord",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2775238955",
    "max": 0,
    "min": 0,
    "name": "n_score_total",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(12, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1644546635",
    "max": 0,
    "min": 0,
    "name": "n_scorex_total",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(13, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1850091208",
    "max": 0,
    "min": 0,
    "name": "n_score10_total",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("number1729303533")

  // remove field
  collection.fields.removeById("number2775238955")

  // remove field
  collection.fields.removeById("number1644546635")

  // remove field
  collection.fields.removeById("number1850091208")

  // remove field
  collection.fields.removeById("number2155459718")

  // remove field
  collection.fields.removeById("number638500658")

  // remove field
  collection.fields.removeById("number3494301659")

  return app.save(collection)
})

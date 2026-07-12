/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_892539741")

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2181787965",
    "max": 0,
    "min": 0,
    "name": "c_sesi",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1595599091",
    "max": 0,
    "min": 0,
    "name": "c_tim",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1982335814",
    "max": 0,
    "min": 0,
    "name": "c_grup",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text450546281",
    "max": 0,
    "min": 0,
    "name": "c_nopes",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text998463864",
    "max": 0,
    "min": 0,
    "name": "c_notarget",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

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

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_892539741")

  // remove field
  collection.fields.removeById("text2181787965")

  // remove field
  collection.fields.removeById("text1595599091")

  // remove field
  collection.fields.removeById("text1982335814")

  // remove field
  collection.fields.removeById("text450546281")

  // remove field
  collection.fields.removeById("text998463864")

  // remove field
  collection.fields.removeById("text2676217692")

  // remove field
  collection.fields.removeById("text2775238955")

  // remove field
  collection.fields.removeById("text1644546635")

  // remove field
  collection.fields.removeById("text1850091208")

  return app.save(collection)
})

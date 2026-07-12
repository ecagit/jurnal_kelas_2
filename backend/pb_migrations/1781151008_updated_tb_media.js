/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1082763749")

  // update field
  collection.fields.addAt(1, new Field({
    "help": "",
    "hidden": false,
    "id": "file2947203232",
    "maxSelect": 0,
    "maxSize": 0,
    "mimeTypes": [
      "audio/mpeg",
      "video/mp4",
      "video/3gpp",
      "audio/mp4",
      "video/x-flv",
      "application/pdf",
      "application/vnd.ms-excel",
      "application/msword",
      "application/vnd.ms-powerpoint",
      "application/ogg",
      "image/png",
      "image/vnd.mozilla.apng",
      "image/jpeg"
    ],
    "name": "file_upload",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": null,
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1082763749")

  // update field
  collection.fields.addAt(1, new Field({
    "help": "",
    "hidden": false,
    "id": "file2947203232",
    "maxSelect": 0,
    "maxSize": 0,
    "mimeTypes": null,
    "name": "file_upload",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": null,
    "type": "file"
  }))

  return app.save(collection)
})

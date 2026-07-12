/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1767061899")

  // update field
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "file1220914119",
    "maxSelect": 0,
    "maxSize": 50000,
    "mimeTypes": [
      "application/zip",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/x-7z-compressed",
      "application/msword",
      "image/vnd.adobe.photoshop",
      "application/ogg",
      "image/png",
      "image/vnd.mozilla.apng",
      "image/jpeg",
      "image/gif",
      "audio/mpeg",
      "video/mp4",
      "text/csv",
      "application/pdf",
      "audio/mp4",
      "video/x-flv"
    ],
    "name": "f_files",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": null,
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1767061899")

  // update field
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "file1220914119",
    "maxSelect": 0,
    "maxSize": 100,
    "mimeTypes": [
      "application/zip",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/x-7z-compressed",
      "application/msword",
      "image/vnd.adobe.photoshop",
      "application/ogg",
      "image/png",
      "image/vnd.mozilla.apng",
      "image/jpeg",
      "image/gif",
      "audio/mpeg",
      "video/mp4",
      "text/csv",
      "application/pdf",
      "audio/mp4",
      "video/x-flv"
    ],
    "name": "f_files",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": null,
    "type": "file"
  }))

  return app.save(collection)
})

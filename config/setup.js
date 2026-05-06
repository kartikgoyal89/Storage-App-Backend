import mongoose from "mongoose";
import { connectDB } from "./db.js";
await connectDB();

const client = mongoose.connection.getClient();

try {
  const db = mongoose.connection.db;

  await db.command({
    collMod: "users",
    validator: {
      $jsonSchema: {
        required: ["_id", "name", "email", "rootDirId"],
        properties: {
          _id: {
            bsonType: "objectId",
          },
          name: {
            bsonType: "string",
            minLength: 3,
            description:
              "name field should be a string with atleast 3 characters.",
          },
          role: {
            bsonType: "string",
          },
          maxStorageInBytes: {
            bsonType: "long",
          },
          email: {
            bsonType: "string",
            pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$",
            description: "please enter a valid email",
          },
          password: {
            bsonType: "string",
            minLength: 4,
          },
          picture: {
            bsonType: "string",
          },
          rootDirId: {
            bsonType: "objectId",
          },
          deleted: {
            bsonType: "bool",
          },
          __v: {
            bsonType: "int",
          },
        },
        additionalProperties: false,
      },
    },
    validationAction: "error",
    validationLevel: "strict",
  });

  await db.command({
    collMod: "directories",
    validator: {
      $jsonSchema: {
        required: ["_id", "name", "parentDirId", "userId"],
        properties: {
          _id: {
            bsonType: "objectId",
          },
          name: {
            bsonType: "string",
          },
          size: {
            bsonType: "int",
          },
          parentDirId: {
            bsonType: ["objectId", "null"],
          },
          userId: {
            bsonType: "objectId",
          },
          createdAt: {
            bsonType: "date",
          },
          updatedAt: {
            bsonType: "date",
          },
          __v: {
            bsonType: "int",
          },
        },
        additionalProperties: false,
      },
    },
    validationAction: "error",
    validationLevel: "strict",
  });

  await db.command({
    collMod: "files",
    validator: {
      $jsonSchema: {
        required: ["_id", "name", "parentDirId", "userId", "extension"],
        properties: {
          _id: {
            bsonType: "objectId",
          },
          name: {
            bsonType: "string",
          },
          size: {
            bsonType: "int",
          },
          parentDirId: {
            bsonType: "objectId",
          },
          userId: {
            bsonType: "objectId",
          },
          extension: {
            bsonType: "string",
          },
          createdAt: {
            bsonType: "date",
          },
          updatedAt: {
            bsonType: "date",
          },
          __v: {
            bsonType: "int",
          },
        },
        additionalProperties: false,
      },
    },
    validationAction: "error",
    validationLevel: "strict",
  });
} catch (err) {
  console.log(err);
  console.log("Error in Setting up the Database");
} finally {
  await client.close();
}

// It is only to keep a track of how was our schema back then, because if we want to update or rollback to old schema we can use it.


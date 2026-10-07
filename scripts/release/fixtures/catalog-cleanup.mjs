import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";

const state = await readFile("catalog-state.json", "utf8").catch((error) => {
  if (error.code === "ENOENT") return null;
  throw error;
});
if (state) {
  const { databaseName } = JSON.parse(state);
  assert.match(databaseName, /^trinacria_catalog_[a-f0-9]+_e2e$/);
  const uri = new URL(process.env.MONGO_URI);
  uri.pathname = "/" + databaseName;
  const connection = await mongoose.createConnection(uri.toString()).asPromise();
  try {
    await connection.dropDatabase();
  } finally {
    await connection.close();
  }
}

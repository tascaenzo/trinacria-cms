import assert from "node:assert/strict";
import mongoose from "mongoose";

// The parent owns this exact random database, even if a child exits before its own cleanup.
const target = new URL(process.env.MONGO_URI);
const database = decodeURIComponent(target.pathname.slice(1));
assert.match(database, /^trinacria_external_host_[a-f0-9]{32}_e2e$/);
const connection = mongoose.createConnection(target.toString());
try {
  await connection.asPromise();
  assert.equal(connection.name, database);
  await connection.dropDatabase();
  assert.equal(
    (await connection.db.listCollections().toArray()).length,
    0,
    "External fixture collections must be absent after cleanup"
  );
} finally {
  await connection.close();
}

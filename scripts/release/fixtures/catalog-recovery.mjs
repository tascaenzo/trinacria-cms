import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import mongoose from "mongoose";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function fileInventory(root, relative = "") {
  const files = [];
  for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
    const path = join(relative, entry.name);
    assert.ok(!entry.isSymbolicLink(), "Recovery fixture does not follow symlinks");
    if (entry.isDirectory()) files.push(...(await fileInventory(root, path)));
    else {
      const bytes = await readFile(join(root, path));
      files.push({ path, sha256: digest(bytes), bytes: bytes.length });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
/** Logical fixture backup with BSON types, options and indexes; not a production backup utility. */
export async function snapshotFixture(connection, mediaRoot, configuration, root) {
  assert.match(connection.name, /^trinacria_catalog_[a-f0-9]+_e2e$/);
  await mkdir(root, { recursive: false, mode: 0o700 });
  const collections = [];
  for (const info of await connection.db.listCollections().toArray()) {
    assert.equal(info.type, "collection", "Fixture backup supports collections only");
    const documents = await connection.db.collection(info.name).find({}).toArray();
    const indexes = await connection.db.collection(info.name).listIndexes().toArray();
    const bytes = mongoose.mongo.BSON.serialize({ documents });
    const file = `collection-${collections.length}.bson`;
    await writeFile(join(root, file), bytes, { mode: 0o600 });
    collections.push({
      name: info.name,
      file,
      documents: documents.length,
      indexes,
      options: info.options,
      sha256: digest(bytes)
    });
  }
  await cp(mediaRoot, join(root, "media"), { recursive: true });
  const files = await fileInventory(join(root, "media"));
  const config = Buffer.from(JSON.stringify(configuration));
  await writeFile(join(root, "configuration.json"), config, { mode: 0o600 });
  await writeFile(
    join(root, "inventory.json"),
    JSON.stringify({ collections, files, configurationSha256: digest(config) }),
    { mode: 0o600 }
  );
  return {
    collections: collections.length,
    documents: collections.reduce((total, collection) => total + collection.documents, 0),
    indexes: collections.reduce((total, collection) => total + collection.indexes.length, 0),
    mediaFiles: files.length,
    format: "fixture-bson-v1"
  };
}
export async function restoreFixture(connection, root, mediaRoot) {
  assert.match(connection.name, /^trinacria_catalog_[a-f0-9]+_restore$/);
  assert.equal(
    (await connection.db.listCollections().toArray()).length,
    0,
    "Restore requires a new empty fixture database"
  );
  const inventory = JSON.parse(await readFile(join(root, "inventory.json"), "utf8"));
  for (const collection of inventory.collections) {
    const bytes = await readFile(join(root, collection.file));
    assert.equal(digest(bytes), collection.sha256);
    const documents = mongoose.mongo.BSON.deserialize(bytes).documents;
    const target = await connection.db.createCollection(collection.name, collection.options);
    if (documents.length) await target.insertMany(documents);
    for (const index of collection.indexes) {
      if (index.name === "_id_") continue;
      const { key, v, ns, ...options } = index;
      await target.createIndex(key, options);
    }
    assert.equal(await target.countDocuments(), collection.documents);
    assert.deepEqual(await target.listIndexes().toArray(), collection.indexes);
  }
  await cp(join(root, "media"), mediaRoot, { recursive: true });
  assert.deepEqual(await fileInventory(mediaRoot), inventory.files);
  const configuration = await readFile(join(root, "configuration.json"));
  assert.equal(digest(configuration), inventory.configurationSha256);
  return { configuration: JSON.parse(configuration.toString()) };
}

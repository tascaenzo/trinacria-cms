import mongoose from "mongoose";
import { E2E_MONGO_URI } from "./e2e-env.js";

export async function resetE2eDatabase(uri = E2E_MONGO_URI): Promise<void> {
  assertDedicatedE2eDatabase(uri);
  const connection = await mongoose.createConnection(uri).asPromise();
  try {
    await connection.dropDatabase();
  } finally {
    await connection.close();
  }
}

export async function smokeBackupAndRestoreE2eDatabase(): Promise<{
  collections: number;
  documents: number;
}> {
  assertDedicatedE2eDatabase(E2E_MONGO_URI);
  const restoreUri = buildRestoreUri(E2E_MONGO_URI);
  assertDedicatedE2eDatabase(restoreUri);
  const source = await mongoose.createConnection(E2E_MONGO_URI).asPromise();
  const restore = await mongoose.createConnection(restoreUri).asPromise();

  try {
    const sourceDb = source.db;
    const restoreDb = restore.db;
    if (!sourceDb || !restoreDb) throw new Error("Mongo E2E connections are not initialized");
    await restore.dropDatabase();
    const collections = (await sourceDb.listCollections().toArray())
      .map((collection) => collection.name)
      .filter((name) => !name.startsWith("system."));
    let documents = 0;

    for (const collectionName of collections) {
      const snapshot = await sourceDb.collection(collectionName).find({}).toArray();
      documents += snapshot.length;
      if (snapshot.length > 0) {
        await restoreDb.collection(collectionName).insertMany(snapshot);
      } else {
        await restoreDb.createCollection(collectionName);
      }
      const restoredCount = await restoreDb.collection(collectionName).countDocuments();
      if (restoredCount !== snapshot.length) {
        throw new Error(
          `Restore mismatch for ${collectionName}: expected ${snapshot.length}, received ${restoredCount}`
        );
      }
    }

    return { collections: collections.length, documents };
  } finally {
    await restore.dropDatabase().catch(() => undefined);
    await Promise.all([source.close(), restore.close()]);
  }
}

function buildRestoreUri(uri: string): string {
  const parsed = new URL(uri);
  const sourceDatabase = parsed.pathname.replace(/^\//, "");
  parsed.pathname = `/${sourceDatabase}_restore_e2e`;
  return parsed.toString();
}

function assertDedicatedE2eDatabase(uri: string): void {
  const databaseName = new URL(uri).pathname.replace(/^\//, "");
  if (!databaseName.endsWith("_e2e")) {
    throw new Error(
      `Refusing to reset Mongo database "${databaseName}" because its name does not end in _e2e`
    );
  }
}

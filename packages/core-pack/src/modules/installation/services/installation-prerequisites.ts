import { randomUUID } from "node:crypto";
import type { InstallationCheck } from "@trinacria-cms/kernel";
import {
  buildPhysicalCollectionName,
  readSecurePayloadKeyring
} from "@trinacria-cms/kernel/runtime";
import mongoose from "mongoose";

/** Native client is deliberately independent of the application's Mongoose lifecycle. */
const SETTINGS_COLLECTION = buildPhysicalCollectionName({ pluginId: "core-pack" }, "settings");

export async function inspectInstallationPrerequisites(
  uri: string
): Promise<{ installed: boolean; checks: InstallationCheck[] }> {
  const checks: InstallationCheck[] = [];
  let installed = false;
  let client: InstanceType<typeof mongoose.mongo.MongoClient> | undefined;
  try {
    client = new mongoose.mongo.MongoClient(uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000
    });
    await client.connect();
    const db = client.db();
    await db.command({ ping: 1 });
    checks.push({ id: "database", status: "pass", message: "database-ready" });
    const hello = await db.command({ hello: 1 });
    const transactional = Boolean(hello.setName || hello.msg === "isdbgrid");
    checks.push({
      id: "transactions",
      status: transactional ? "pass" : "fail",
      message: transactional ? "transactions-ready" : "configure-replica-set"
    });
    if (transactional) {
      const session = client.startSession();
      try {
        session.startTransaction();
        const id = randomUUID();
        const collection = db.collection(SETTINGS_COLLECTION);
        await collection.insertOne(
          {
            id,
            kind: "value",
            key: `core-pack:installation:probe-${id}`,
            ownerPluginId: "core-pack",
            value: true,
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          { session }
        );
        await collection.updateOne({ id }, { $set: { value: false } }, { session });
        const written = await collection.findOne({ id }, { session });
        if (written?.value !== false) throw new Error("Probe readback failed");
        await collection.deleteOne({ id }, { session });
        checks.push({ id: "write-access", status: "pass", message: "write-access-ready" });
      } catch {
        checks.push({ id: "write-access", status: "fail", message: "grant-database-write-access" });
      } finally {
        if (session.inTransaction()) await session.abortTransaction().catch(() => {});
        await session.endSession();
      }
    } else checks.push({ id: "write-access", status: "blocked", message: "configure-replica-set" });
    installed =
      (
        await db
          .collection(SETTINGS_COLLECTION)
          .findOne({ kind: "install_state", key: "core-pack" })
      )?.installed === true;
  } catch {
    if (!checks.some((check) => check.id === "database"))
      checks.push({ id: "database", status: "fail", message: "configure-mongo" });
    else {
      const failure: InstallationCheck = {
        id: "write-access",
        status: "fail",
        message: "grant-database-write-access"
      };
      const index = checks.findIndex((check) => check.id === "write-access");
      if (index < 0) checks.push(failure);
      else checks[index] = failure;
    }
    for (const id of ["transactions", "write-access"] as const)
      if (!checks.some((check) => check.id === id))
        checks.push({ id, status: "blocked", message: "configure-mongo" });
  } finally {
    await client?.close().catch(() => {});
  }
  try {
    readSecurePayloadKeyring();
    checks.push({ id: "runtime-keys", status: "pass", message: "runtime-keys-ready" });
  } catch {
    checks.push({ id: "runtime-keys", status: "fail", message: "configure-runtime-keys" });
  }
  return { installed, checks };
}

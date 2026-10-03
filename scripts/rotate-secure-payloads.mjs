import {
  buildPhysicalCollectionName,
  createMongoDbAdapter,
  EntityRegistry,
  readSecurePayloadKeyring,
  SECURE_EVENT_PAYLOADS_ENTITY,
  SecureEventPayloadCrypto,
  SecureEventPayloadsRepository,
  SecureEventPayloadsService
} from "@trinacria-cms/kernel/runtime";
import mongoose from "mongoose";

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const fromIndex = args.indexOf("--from-key-id");
  const fromKeyId = fromIndex >= 0 ? args[fromIndex + 1] : undefined;
  const known = args.filter((_, index) => index !== fromIndex && index !== fromIndex + 1);
  if (
    !fromKeyId ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(fromKeyId) ||
    known.some((arg) => arg !== "--apply") ||
    !process.env.MONGO_URI
  ) {
    throw new Error(
      "Usage: MONGO_URI and keyring environment required; --from-key-id KEY [--apply]"
    );
  }
  const crypto = new SecureEventPayloadCrypto(readSecurePayloadKeyring());
  if (fromKeyId === crypto.activeKeyId)
    throw new Error("Source key must differ from the active writer key");
  const connection = await mongoose.createConnection(process.env.MONGO_URI).asPromise();
  try {
    const legacy = await connection.db
      .listCollections({ name: { $regex: "^(plugin_|kernel__)" } }, { nameOnly: true })
      .toArray();
    if (legacy.length)
      throw new Error("Previous storage layout requires an explicit migration before rotation");
    const collection = connection.collection(
      buildPhysicalCollectionName({ pluginId: "kernel" }, "secure_event_payloads")
    );
    const filter = { "encryptedPayload.keyVersion": fromKeyId };
    const before = await collection.countDocuments(filter);
    // The default inventory is read-only, including indexes and ownership registry.
    if (!apply) {
      console.log(JSON.stringify({ mode: "inventory", recordsUsingSourceKey: before }));
      return;
    }
    const registry = new EntityRegistry();
    registry.register(SECURE_EVENT_PAYLOADS_ENTITY);
    const repository = new SecureEventPayloadsRepository(
      createMongoDbAdapter({ connection, entityRegistry: registry })
    );
    await repository.initialize();
    const service = new SecureEventPayloadsService(repository, crypto);
    let changed = 0;
    while (true) {
      const batch = await service.reencryptBatch(fromKeyId, 100);
      if (batch.scanned === 0) break;
      changed += batch.changed;
      console.log(JSON.stringify({ mode: "apply", changed }));
      if (batch.changed === 0 && (await collection.countDocuments(filter)) > 0)
        throw new Error(
          "Rotation made no progress; retain source key and retry after concurrent operations settle"
        );
    }
    console.log(
      JSON.stringify({
        mode: "complete",
        changed,
        recordsUsingSourceKey: await collection.countDocuments(filter)
      })
    );
  } finally {
    await connection.close();
  }
}
main().catch((error) => {
  // Driver/configuration errors can contain credentials or ciphertext. Print only
  // known maintenance messages and stable service codes, never raw error text.
  const knownMessages = new Set([
    "Usage: MONGO_URI and keyring environment required; --from-key-id KEY [--apply]",
    "Source key must differ from the active writer key",
    "Previous storage layout requires an explicit migration before rotation",
    "Rotation made no progress; retain source key and retry after concurrent operations settle"
  ]);
  console.error(
    knownMessages.has(error?.message)
      ? error.message
      : "Secure payload rotation failed; retain the source key and inspect the host configuration",
    {
      code:
        typeof error?.code === "string" && /^secure_event_payload_[a-z_]+$/.test(error.code)
          ? error.code
          : "secure_payload_rotation_failed"
    }
  );
  process.exitCode = 1;
});

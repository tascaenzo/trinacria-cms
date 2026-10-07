import { E2E_DEGRADED_MONGO_URI, E2E_DOWN_MONGO_URI, E2E_MONGO_URI } from "./e2e-env.js";
import { resetE2eDatabase } from "./mongo-lifecycle.js";

export default async function globalTeardown(): Promise<void> {
  const mongoose = (await import("mongoose")).default;
  const { writeFile } = await import("node:fs/promises");
  const { buildPhysicalCollectionName } = await import("@trinacria-cms/kernel/runtime");
  const connection = await mongoose.createConnection(E2E_MONGO_URI).asPromise();
  try {
    const diagnostics: Record<string, unknown> = {};
    for (const entity of ["event_outbox", "event_deliveries", "secure_email_jobs"]) diagnostics[entity] = await connection
      .collection(buildPhysicalCollectionName({ pluginId: "kernel" }, entity)).find({}, { projection: { _id: 0, eventName: 1, state: 1, status: 1, reason: 1, attempt: 1, consumerPluginId: 1 } }).limit(1000).toArray();
    await writeFile("test-results/durable-queue-diagnostics.json", JSON.stringify(diagnostics, null, 2));
  } finally { await connection.close(); }

  await Promise.all([
    resetE2eDatabase(),
    resetE2eDatabase(E2E_DEGRADED_MONGO_URI),
    resetE2eDatabase(E2E_DOWN_MONGO_URI)
  ]);
}

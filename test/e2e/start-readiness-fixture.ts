import mongoose from "mongoose";

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  const fixture = process.env.E2E_READINESS_FIXTURE;
  if (!uri || (fixture !== "degraded" && fixture !== "down")) {
    throw new Error("MONGO_URI and a valid E2E_READINESS_FIXTURE are required");
  }
  assertDedicatedE2eDatabase(uri);

  const resetConnection = await mongoose.createConnection(uri).asPromise();
  await resetConnection.dropDatabase();
  await resetConnection.close();

  const { createPlaygroundCmsApp } = await import("../../apps/playground/dist/playground-app.js");
  const app = await createPlaygroundCmsApp();
  if (fixture === "degraded") {
    await app.handle.runtime.disable("email-pack", "e2e-readiness-degraded");
  } else {
    const database = mongoose.connection.db;
    if (!database) throw new Error("Mongo connection is unavailable before down simulation");
    (database as unknown as { command: (input: unknown) => Promise<unknown> }).command =
      async () => {
        throw new Error("e2e simulated Mongo outage");
      };
  }

  registerShutdown(app.handle.shutdown);
}

function registerShutdown(shutdownApp: () => Promise<void>): void {
  const shutdown = async () => {
    await shutdownApp();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function assertDedicatedE2eDatabase(uri: string): void {
  const databaseName = new URL(uri).pathname.replace(/^\//, "");
  if (!databaseName.endsWith("_e2e")) {
    throw new Error(`Refusing readiness fixture database without _e2e suffix: ${databaseName}`);
  }
}

void main().catch((error) => {
  console.error("[e2e] readiness fixture bootstrap failed", error);
  process.exit(1);
});

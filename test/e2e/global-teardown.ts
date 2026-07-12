import { E2E_DEGRADED_MONGO_URI, E2E_DOWN_MONGO_URI } from "./e2e-env.js";
import { resetE2eDatabase } from "./mongo-lifecycle.js";

export default async function globalTeardown(): Promise<void> {
  await Promise.all([
    resetE2eDatabase(),
    resetE2eDatabase(E2E_DEGRADED_MONGO_URI),
    resetE2eDatabase(E2E_DOWN_MONGO_URI)
  ]);
}

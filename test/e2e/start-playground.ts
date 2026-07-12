import { E2E_BACKEND_LOG_PATH } from "./e2e-env.js";
import { installBackendLogCapture } from "./backend-log-capture.js";
import { resetE2eDatabase } from "./mongo-lifecycle.js";

async function main(): Promise<void> {
  installBackendLogCapture(E2E_BACKEND_LOG_PATH);
  await resetE2eDatabase();
  await import("../../apps/playground/dist/main.js");
}

void main().catch((error) => {
  console.error("[e2e] playground bootstrap failed", error);
  process.exit(1);
});

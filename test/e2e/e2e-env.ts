export const E2E_APP_URL = process.env.E2E_APP_URL ?? "http://127.0.0.1:4174";
export const E2E_API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:3000";
export const E2E_DEGRADED_API_URL = process.env.E2E_DEGRADED_API_URL ?? "http://127.0.0.1:3002";
export const E2E_DOWN_API_URL = process.env.E2E_DOWN_API_URL ?? "http://127.0.0.1:3003";
export const E2E_MONGO_URI =
  process.env.E2E_MONGO_URI ??
  "mongodb://trinacria:trinacria@127.0.0.1:27017/trinacria_cms_e2e?authSource=admin";
export const E2E_DEGRADED_MONGO_URI =
  process.env.E2E_DEGRADED_MONGO_URI ?? withDatabase(E2E_MONGO_URI, "trinacria_cms_degraded_e2e");
export const E2E_DOWN_MONGO_URI =
  process.env.E2E_DOWN_MONGO_URI ?? withDatabase(E2E_MONGO_URI, "trinacria_cms_down_e2e");
export const E2E_OBSERVABILITY_TOKEN =
  process.env.E2E_OBSERVABILITY_TOKEN ?? "trinacria-e2e-observability-token";
export const E2E_SECURE_PAYLOAD_KEY =
  process.env.E2E_SECURE_PAYLOAD_KEY ?? "trinacria-e2e-secure-payload-master-key";
export const E2E_PLUGIN_AUTH_SECRET =
  process.env.E2E_PLUGIN_AUTH_SECRET ?? "trinacria-e2e-email-pack-plugin-secret";
export const E2E_BACKEND_LOG_PATH =
  process.env.E2E_BACKEND_LOG_PATH ?? "test-results/e2e-backend.log";

export const E2E_ADMIN = {
  firstName: "E2E",
  lastName: "Admin",
  email: "admin.e2e@trinacria.local",
  password: "Trinacria-E2E-Password-2026!"
} as const;

function withDatabase(uri: string, database: string): string {
  const parsed = new URL(uri);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

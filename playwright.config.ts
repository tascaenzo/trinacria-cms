import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
import {
  E2E_API_URL,
  E2E_APP_URL,
  E2E_BACKEND_LOG_PATH,
  E2E_DEGRADED_API_URL,
  E2E_DEGRADED_MONGO_URI,
  E2E_DOWN_API_URL,
  E2E_DOWN_MONGO_URI,
  E2E_MONGO_URI,
  E2E_OBSERVABILITY_TOKEN,
  E2E_PLUGIN_AUTH_SECRET,
  E2E_SECURE_PAYLOAD_KEY
} from "./test/e2e/e2e-env.js";

const workspaceRoot = process.cwd();
const fixtureEnvPath = resolve(workspaceRoot, ".env.example");

export default defineConfig({
  testDir: "./test/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["line"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  globalTeardown: "./test/e2e/global-teardown.ts",
  use: {
    baseURL: E2E_APP_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: [
    {
      command: "node --import tsx test/e2e/start-playground.ts",
      url: `${E2E_API_URL}/ready`,
      cwd: workspaceRoot,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        NODE_ENV: "production",
        CMS_ENV_FILE: fixtureEnvPath,
        CMS_INSTALLED: "false",
        MONGO_URI: E2E_MONGO_URI,
        HTTP_HOST: "127.0.0.1",
        HTTP_PORT: "3000",
        HTTP_CORS_ORIGINS: E2E_APP_URL,
        CMS_CSRF_PROTECTION: "true",
        CMS_CSRF_TRUSTED_ORIGINS: E2E_APP_URL,
        CMS_JWT_SECRET: "trinacria-e2e-only-jwt-secret-with-more-than-thirty-two-characters",
        CMS_STRICT_JWT_SECRET_REQUIRED: "true",
        CMS_JWT_COOKIE_SECURE: "false",
        CMS_JWT_COOKIE_SAME_SITE: "lax",
        CMS_SECURE_PAYLOAD_MASTER_KEY: E2E_SECURE_PAYLOAD_KEY,
        CMS_PLUGIN_AUTH_KEYS_JSON: JSON.stringify({
          "email-pack": E2E_PLUGIN_AUTH_SECRET
        }),
        CMS_OPENAPI_ENABLED: "false",
        CMS_SWAGGER_ENABLED: "false",
        OBSERVABILITY_ENABLED: "true",
        METRICS_ENABLED: "true",
        OPS_CHECKLIST_ENABLED: "true",
        OBSERVABILITY_TOKEN: E2E_OBSERVABILITY_TOKEN,
        E2E_BACKEND_LOG_PATH,
        LOG_FORMAT: "json"
      }
    },
    {
      command: "npm run preview -w @trinacria-cms/backoffice -- --host 127.0.0.1 --port 4174",
      url: E2E_APP_URL,
      cwd: workspaceRoot,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_CMS_PROXY_TARGET: E2E_API_URL
      }
    },
    {
      command: "node --import tsx test/e2e/start-readiness-fixture.ts",
      url: `${E2E_DEGRADED_API_URL}/health`,
      cwd: workspaceRoot,
      reuseExistingServer: false,
      timeout: 120_000,
      env: readinessFixtureEnv({
        fixture: "degraded",
        apiUrl: E2E_DEGRADED_API_URL,
        mongoUri: E2E_DEGRADED_MONGO_URI
      })
    },
    {
      command: "node --import tsx test/e2e/start-readiness-fixture.ts",
      url: `${E2E_DOWN_API_URL}/health`,
      cwd: workspaceRoot,
      reuseExistingServer: false,
      timeout: 120_000,
      env: readinessFixtureEnv({
        fixture: "down",
        apiUrl: E2E_DOWN_API_URL,
        mongoUri: E2E_DOWN_MONGO_URI
      })
    }
  ]
});

function readinessFixtureEnv(input: {
  fixture: "degraded" | "down";
  apiUrl: string;
  mongoUri: string;
}): Record<string, string> {
  return {
    ...definedProcessEnv(),
    NODE_ENV: "production",
    CMS_ENV_FILE: fixtureEnvPath,
    CMS_INSTALLED: "false",
    MONGO_URI: input.mongoUri,
    HTTP_HOST: "127.0.0.1",
    HTTP_PORT: new URL(input.apiUrl).port,
    HTTP_CORS_ORIGINS: E2E_APP_URL,
    CMS_CSRF_PROTECTION: "true",
    CMS_CSRF_TRUSTED_ORIGINS: E2E_APP_URL,
    CMS_JWT_SECRET: "trinacria-e2e-only-jwt-secret-with-more-than-thirty-two-characters",
    CMS_STRICT_JWT_SECRET_REQUIRED: "true",
    CMS_SECURE_PAYLOAD_MASTER_KEY: E2E_SECURE_PAYLOAD_KEY,
    CMS_OPENAPI_ENABLED: "false",
    CMS_SWAGGER_ENABLED: "false",
    OBSERVABILITY_ENABLED: "true",
    METRICS_ENABLED: "true",
    OPS_CHECKLIST_ENABLED: "true",
    OBSERVABILITY_TOKEN: E2E_OBSERVABILITY_TOKEN,
    E2E_READINESS_FIXTURE: input.fixture,
    LOG_FORMAT: "json"
  };
}

function definedProcessEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );
}

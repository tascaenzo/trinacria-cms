import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const playgroundRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const playgroundEnvPath = resolve(playgroundRoot, ".env");
const workspaceEnvPath = resolve(playgroundRoot, "..", "..", ".env");

export function loadPlaygroundEnv(): string {
  const resolvedEnvPath = resolveCmsEnvFilePath();
  process.env.CMS_ENV_FILE = resolvedEnvPath;
  loadEnv({ path: resolvedEnvPath });
  return resolvedEnvPath;
}

function resolveCmsEnvFilePath(): string {
  const explicitEnvPath = process.env.CMS_ENV_FILE?.trim();
  if (explicitEnvPath) {
    return explicitEnvPath;
  }
  if (existsSync(playgroundEnvPath)) {
    return playgroundEnvPath;
  }
  return workspaceEnvPath;
}

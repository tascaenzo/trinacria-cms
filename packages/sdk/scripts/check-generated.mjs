import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(currentDir, "..");
const repoRoot = resolve(packageDir, "..", "..");

execFileSync(
  process.execPath,
  [
    resolve(packageDir, "scripts", "generate-sdk.mjs"),
    resolve(packageDir, "openapi", "trinacria-cms.openapi.json"),
    resolve(packageDir, "src", "generated")
  ],
  {
    cwd: repoRoot,
    stdio: "inherit"
  }
);

try {
  execFileSync("git", ["diff", "--exit-code", "--", "packages/sdk/src/generated"], {
    cwd: repoRoot,
    stdio: "inherit"
  });
} catch {
  process.exitCode = 1;
  console.error(
    "[sdk:check] Generated SDK is out of date. Run `npm run sdk:generate` and commit the result."
  );
}

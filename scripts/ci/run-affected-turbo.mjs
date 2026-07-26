import { spawnSync } from "node:child_process";

const tasks = process.argv.slice(2);
if (!tasks.length) {
  throw new Error("Pass at least one Turborepo task, for example: npm run turbo:affected -- build");
}

const baseRevision = affectedBaseRevision();
const turboArguments = ["run", ...tasks];
if (baseRevision) {
  turboArguments.push(`--filter=...[${baseRevision}]`);
  console.log(`Running affected Turborepo tasks since ${baseRevision}.`);
} else {
  console.log("No CI base revision is available; running all Turborepo tasks.");
}

const result = spawnSync("npx", ["turbo", ...turboArguments], { stdio: "inherit" });
process.exitCode = result.status ?? 1;

function affectedBaseRevision() {
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: GitHub provides this only to select CI scope.
  if (process.env.GITHUB_BASE_REF) {
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: GitHub provides this only to select CI scope.
    return `origin/${process.env.GITHUB_BASE_REF}`;
  }
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: GitHub provides this only to select CI scope.
  const previousCommit = process.env.GITHUB_EVENT_BEFORE;
  return previousCommit && !/^0+$/.test(previousCommit) ? previousCommit : undefined;
}

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source =
  "// Generated from scripts/contracts/plugin-auth-canonical.ts; run npm run signing:update.\n" +
  (await readFile(resolve(root, "scripts/contracts/plugin-auth-canonical.ts"), "utf8"));
for (const file of [
  "packages/sdk/src/runtime/plugin-auth-canonical.gen.ts",
  "packages/core-pack/src/modules/settings/auth/plugin-auth-canonical.gen.ts"
]) {
  const target = resolve(root, file);
  if (process.argv.includes("--update")) await writeFile(target, source);
  else if ((await readFile(target, "utf8").catch(() => "")) !== source)
    throw new Error(`Protocol signing source drift: ${file}`);
}
console.log("Core/SDK signing canonicalization sources aligned");

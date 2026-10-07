import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, ".."),
  source = join(root, "examples/catalog-plugin"),
  files = {};
async function walk(path = "") {
  for (const name of (await readdir(join(source, path))).sort()) {
    if (["dist", "node_modules", ".turbo"].includes(name)) continue;
    const file = join(path, name),
      entry = join(source, file);
    const { lstat } = await import("node:fs/promises");
    const stat = await lstat(entry);
    if (stat.isSymbolicLink()) throw new Error("Template symlinks are forbidden");
    if (stat.isDirectory()) await walk(file);
    else files[file] = await readFile(entry, "utf8");
  }
}
await walk();
const path = join(root, "packages/kernel/templates/catalog-v1.json"),
  result = JSON.stringify({ version: 1, files }, null, 2) + "\n";
if (process.argv.includes("--update")) await writeFile(path, result);
else if ((await readFile(path, "utf8")) !== result)
  throw new Error("Starter template stale: npm run template:update");

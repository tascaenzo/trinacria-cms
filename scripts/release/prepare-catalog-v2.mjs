import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Builds a reviewed next-version fixture from the generated, dedicated test project. */
export async function prepareCatalogV2(directory) {
  const packageFile = join(directory, "package.json");
  const manifest = JSON.parse(await readFile(packageFile, "utf8"));
  assert.equal(manifest.name, "catalog-plugin");
  assert.equal(manifest.version, "0.1.0");
  manifest.version = "0.2.0";
  manifest.exports["./deploy"] = { types: "./dist/deploy.d.ts", import: "./dist/deploy.js" };
  await writeFile(packageFile, JSON.stringify(manifest, null, 2));
  async function replace(file, before, after) {
    const path = join(directory, "src", file);
    const source = await readFile(path, "utf8");
    assert.equal(source.split(before).length, 2, `Unique fixture patch required: ${file}`);
    await writeFile(path, source.replace(before, after));
  }
  await replace(
    "contracts.ts",
    "    version: s.number",
    '    currency: s.enum(["EUR"] as const),\n    version: s.number'
  );
  await replace("contracts.ts", "  version: number;", '  currency: "EUR";\n  version: number;');
  await replace("service.ts", "      version: 1,", '      currency: "EUR",\n      version: 1,');
  await replace("manifest.ts", 'version: "0.1.0"', 'version: "0.2.0"');
  await replace("manifest.ts", "schemaVersion: 1", "schemaVersion: 2");
  await replace(
    "manifest.ts",
    "  settings: [",
    `  migrations: [{ id: "0002-currency", checksum: "${"0".repeat(64)}", sourceFiles: ["dist/migrate-v2.js"], entities: ["items"], fromSchemaVersion: 1, toSchemaVersion: 2, kind: "transactional", destructive: false, idempotent: true }],\n  settings: [`
  );
  await replace(
    "index.ts",
    'import { ITEM } from "./contracts.js";',
    'import { ITEM } from "./contracts.js";\nimport { run } from "./migrate-v2.js";'
  );
  await replace(
    "index.ts",
    "    manifest: CATALOG_MANIFEST,",
    "    manifest: CATALOG_MANIFEST,\n    migrations: [{ ...CATALOG_MANIFEST.migrations![0]!, run }],"
  );
  await writeFile(join(directory, "src/deploy.ts"), 'export { ITEM } from "./contracts.js";\n');
  await writeFile(
    join(directory, "src/migrate-v2.ts"),
    `import type { MigrationContext } from "@trinacria-cms/kernel/contracts";
export async function run(context: MigrationContext): Promise<void> {
  const items = context.repository<{id: string; currency?: string}>("items");
  for (const item of await items.findMany({ filter: { currency: { $exists: false } }, limit: 500, sort: { id: "asc" } }))
    await items.updateOne({ filter: { id: item.id, currency: { $exists: false } } }, { currency: "EUR" });
}
`
  );
}

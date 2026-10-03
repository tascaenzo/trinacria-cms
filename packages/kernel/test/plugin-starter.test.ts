import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { createPlugin } from "../scripts/create-trinacria-plugin.mjs";
import { checkPluginContract } from "../scripts/plugin-conformance.mjs";
import { definePluginManifest } from "../src/plugin-api/manifest.js";
test("starter creates a coherent independent project without overwrites or script execution", async () => {
 const root = await mkdtemp(join(tmpdir(), "trinacria-starter-"));
 try {
   const target = join(root, "catalog");
   const result = await createPlugin(target, "my-catalog"); assert.equal(result.templateVersion, 1);
   const manifest = JSON.parse(await readFile(join(target, "package.json"), "utf8")); assert.equal(manifest.name, "my-catalog"); assert.equal(manifest.private, undefined);
   assert.doesNotMatch(await readFile(join(target, "src/manifest.ts"), "utf8"), /catalog-plugin/);
   assert.equal(JSON.parse(await readFile(join(target, "tsconfig.json"), "utf8")).extends, undefined);
   await writeFile(join(target, "sentinel"), "preserve"); await assert.rejects(createPlugin(target, "my-catalog"), /already exists/);
   assert.equal(await readFile(join(target, "sentinel"), "utf8"), "preserve");
   await assert.rejects(createPlugin(join(root, "bad"), "core"));
   const link = join(root, "link"); await symlink(target, link); await assert.rejects(createPlugin(link, "my-catalog"), /already exists/);
 } finally { await rm(root, { recursive: true, force: true }); }
});
test("conformance rejects incompatible versions, missing async semantics and unsafe HTTP declarations", () => {
 const manifest = { id: "my-catalog", version: "0.1.0", requiresCore: "^0.1.0" };
 assert.throws(() => checkPluginContract(manifest, "0.2.0"));
 assert.throws(() => checkPluginContract({ ...manifest, events: { emits: [{ name: "created", version: 1, visibility: "protected" }] } }, "0.1.0"));
 assert.throws(() => checkPluginContract(manifest, "0.1.0", { paths: { "/v1/catalog": { get: { "x-cms-plugin-id": "my-catalog", operationId: "get", responses: {} } } } }));
 assert.deepEqual(checkPluginContract(manifest, "0.1.0").checks.includes("semver"), true);
 const migration = { id: "v2", checksum: "a".repeat(64), sourceFiles: ["dist/migration.js"], entities: ["items"], fromSchemaVersion: 1, toSchemaVersion: 2, kind: "transactional", destructive: false, idempotent: true } as const;
 assert.equal(definePluginManifest({ ...manifest, migrations: [migration] }).migrations?.[0].id, "v2");
});

// npm exposes executable entry points through symlinks, including outside the monorepo.
test("packaged starter and conformance CLIs execute through npm-style symlinks", async () => {
 const run = promisify(execFile);
 const root = await mkdtemp(join(tmpdir(), "trinacria-cli-"));
 try {
   const generator = join(root, "create-trinacria-plugin");
   await symlink(new URL("../scripts/create-trinacria-plugin.mjs", import.meta.url).pathname, generator);
   const target = join(root, "project");
   const generated = await run(process.execPath, [generator, target, "cli-catalog"]);
   assert.match(generated.stdout, /templateVersion/);
   assert.equal(JSON.parse(await readFile(join(target, "package.json"), "utf8")).name, "cli-catalog");
   const checker = join(root, "cms-plugin-conformance");
   await symlink(new URL("../scripts/plugin-conformance.mjs", import.meta.url).pathname, checker);
   const manifest = join(root, "manifest.json");
   await writeFile(manifest, JSON.stringify({ id: "cli-catalog", version: "0.1.0", requiresCore: "^0.1.0" }));
   const valid = await run(process.execPath, [checker, "--manifest", manifest, "--core-version", "0.1.0"]);
   assert.equal(JSON.parse(valid.stdout).complete, false);
   await assert.rejects(run(process.execPath, [checker, "--manifest", manifest, "--core-version", "0.2.0"]));
 } finally { await rm(root, { recursive: true, force: true }); }
});

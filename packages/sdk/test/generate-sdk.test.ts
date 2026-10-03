import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { generateSdk, schemaToTs } from "../scripts/generate-sdk.mjs";

const schema = { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false };
const operation = (id = "getCatalogItem", tag = "Catalog", owner = "catalog-plugin") => ({ operationId: id, tags: [tag], "x-cms-plugin-id": owner, responses: { 200: { description: "Item", content: { "application/json": { schema } } } } });
const document = () => ({ openapi: "3.0.3", paths: { "/catalog": { get: operation() } } });

test("overlay uses exported runtime, preserves manual files and compiles outside workspace", async () => {
  const root = await mkdtemp(join(tmpdir(), "trinacria-overlay-test-"));
  try {
    const output = join(root, "generated");
    await generateSdk(document(), output, { mode: "overlay", owner: "catalog-plugin" });
    const before = await readFile(join(output, "index.ts"), "utf8");
    assert.match(before, /createPluginSdk/);
    assert.match(before, /@trinacria-cms\/sdk\/runtime/);
    await writeFile(join(output, "notes.txt"), "manual");
    await generateSdk(document(), output, { mode: "overlay", owner: "catalog-plugin" });
    assert.equal(await readFile(join(output, "index.ts"), "utf8"), before);
    assert.equal(await readFile(join(output, "notes.txt"), "utf8"), "manual");
    const sdkDir = join(root, "node_modules/@trinacria-cms/sdk");
    await mkdir(sdkDir, { recursive: true });
    await cp(resolve(import.meta.dirname, "../dist"), join(sdkDir, "dist"), { recursive: true });
    await cp(resolve(import.meta.dirname, "../package.json"), join(sdkDir, "package.json"));
    await writeFile(join(root, "consumer.ts"), `import { createCmsSdkClientCore } from "@trinacria-cms/sdk/runtime";\nimport { createPluginSdk } from "./generated/index.js";\nconst overlay = createPluginSdk(createCmsSdkClientCore({baseUrl:"https://fixture.invalid"}));\nconst item: Promise<{id:string}> = overlay.catalog.getCatalogItem();\n`);
    execFileSync(process.execPath, [resolve(import.meta.dirname, "../../../node_modules/typescript/bin/tsc"), "--strict", "--noEmit", "--skipLibCheck", "--module", "ESNext", "--moduleResolution", "Bundler", "--target", "ES2022", join(root, "consumer.ts")], { cwd: root });
    // A changed tag removes only the old file owned by the manifest.
    const changed = document(); changed.paths["/catalog"].get.tags = ["Products"];
    await generateSdk(changed, output, { mode: "overlay", owner: "catalog-plugin" });
    assert.equal((await readdir(output)).includes("catalog.gen.ts"), false);
    assert.equal(await readFile(join(output, "notes.txt"), "utf8"), "manual");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("generation rejects collisions, unsafe directories and forged cleanup manifests before mutation", async () => {
  const root = await mkdtemp(join(tmpdir(), "trinacria-sdk-safety-"));
  try {
    const output = join(root, "generated"); await mkdir(output); await writeFile(join(output, "keep.ts"), "manual");
    await assert.rejects(generateSdk(document(), output), /no generator marker/);
    await assert.rejects(generateSdk(document(), process.cwd()), /Unsafe/);
    await assert.rejects(generateSdk(document(), join(root, "node_modules/generated")), /Unsafe/);
    await mkdir(join(root, "node_modules"));
    await symlink(join(root, "node_modules"), join(root, "indirect"));
    await assert.rejects(generateSdk(document(), join(root, "indirect/new/deep")), /Unsafe canonical/);
    await symlink(output, join(root, "link"));
    await assert.rejects(generateSdk(document(), join(root, "link")), /real directory/);
    await writeFile(join(output, ".trinacria-sdk-generator.json"), JSON.stringify({ version: 1, files: ["../keep.ts"] }));
    await assert.rejects(generateSdk(document(), output), /Invalid generator ownership/);
    assert.equal(await readFile(join(output, "keep.ts"), "utf8"), "manual");
    const collision = document(); collision.paths["/second"] = { get: operation("get-catalog-item") };
    await assert.rejects(generateSdk(collision, join(root, "collision")), /Colliding operation/);
    const tags = document(); tags.paths["/second"] = { get: operation("getSecond", "catalog") };
    await assert.rejects(generateSdk(tags, join(root, "tags")), /Colliding tags/);
    await assert.rejects(generateSdk(document(), join(root, "empty"), { mode: "overlay", owner: "missing" }), /No selected/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("schema conversion handles refs, unions, nullable, enums and strict empty objects; unsupported schemas fail", () => {
  const doc = { components: { schemas: { Value: { enum: ["one", "two"] } } } };
  assert.equal(schemaToTs(doc, { $ref: "#/components/schemas/Value" }), '"one" | "two"');
  assert.equal(schemaToTs(doc, { type: "string", nullable: true }), "(string) | null");
  assert.equal(schemaToTs(doc, { type: ["string", "null"] }), "string | null");
  assert.equal(schemaToTs(doc, { oneOf: [{ type: "integer" }, { type: "boolean" }] }), "number | boolean");
  assert.equal(schemaToTs(doc, { type: "object", additionalProperties: false }), "Record<string, never>");
  assert.throws(() => schemaToTs(doc, { $ref: "#/missing" }), /Unresolved/);
  assert.throws(() => schemaToTs(doc, { not: { type: "string" } }), /Unsupported/);
  assert.throws(() => schemaToTs(doc, { type: "date" }), /Unsupported/);
  assert.throws(() => schemaToTs(doc, { enum: [{ bad: true }] }), /Unsupported SDK literal/);
  assert.throws(() => schemaToTs(doc, { anyOf: [] }), /Empty/);
  assert.equal(schemaToTs(doc, { type: "string", format: "binary" }), "Uint8Array");
  const recursive = { components: { schemas: { Loop: { type: "array", items: { $ref: "#/components/schemas/Loop" } } } } };
  assert.throws(() => schemaToTs(recursive, { $ref: "#/components/schemas/Loop" }), /Recursive/);
});

test("installed SDK generator executes via an npm-style executable symlink", async () => {
 const root = await mkdtemp(join(tmpdir(), "trinacria-sdk-bin-"));
 try {
   const cli = join(root, "trinacria-sdk");
   await symlink(resolve(import.meta.dirname, "../scripts/generate-sdk.mjs"), cli);
   const source = join(root, "openapi.json"), output = join(root, "overlay");
   await writeFile(source, JSON.stringify(document()));
   execFileSync(process.execPath, [cli, source, output, "--mode", "overlay", "--owner", "catalog-plugin"], { cwd: root });
   assert.match(await readFile(join(output, "index.ts"), "utf8"), /createPluginSdk/);
 } finally { await rm(root, { recursive: true, force: true }); }
});

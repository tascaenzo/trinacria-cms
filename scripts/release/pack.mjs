import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export const packageOrder = [
  "kernel",
  "core-pack",
  "sdk",
  "trinacria-ui",
  "admin-kernel",
  "media-pack",
  "email-pack",
  "editorial-pack"
];
export const repository = resolve(import.meta.dirname, "../..");
export async function packRelease(output) {
  output = resolve(output);
  assert.ok(
    output !== repository && !output.split(/[\\/]/).includes("node_modules"),
    "Dedicated artifact directory required"
  );
  await mkdir(output, { recursive: true });
  output = await realpath(output);
  const artifacts = [];
  const manifests = await Promise.all(
    packageOrder.map(async (name) =>
      JSON.parse(await readFile(join(repository, "packages", name, "package.json"), "utf8"))
    )
  );
  const version = manifests[0].version;
  const official = new Set(manifests.map((manifest) => manifest.name));
  for (const [index, manifest] of manifests.entries()) {
    assert.equal(manifest.version, version, "Official versions must be coordinated");
    assert.equal(manifest.private, false);
    assert.equal(manifest.license, "MIT");
    for (const kind of ["dependencies", "peerDependencies"])
      for (const [dependency, range] of Object.entries(manifest[kind] ?? {}))
        if (official.has(dependency))
          assert.equal(range, version, `Exact official dependency required: ${dependency}`);
    const directory = join(repository, "packages", packageOrder[index]);
    const [result] = JSON.parse(
      execFileSync("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", output], {
        cwd: directory,
        encoding: "utf8"
      })
    );
    const files = result.files.map((file) => file.path);
    for (const file of files) {
      assert.ok(
        /^(dist\/|README\.md$|LICENSE$|package\.json$|theme\.css$|scripts\/(?:generate-sdk|cms|create-trinacria-plugin|plugin-conformance)\.mjs$|templates\/catalog-v1\.json$)/.test(
          file
        ),
        `Unexpected package file: ${file}`
      );
      assert.ok(
        !/(^|\/)(?:node_modules|test|tests|\.env[^/]*|\.cache|storybook-static)(\/|$)/.test(file),
        `Unsafe package file: ${file}`
      );
      assert.ok(
        !/\.(?:stories|test)\.[cm]?[jt]sx?(?:\.map)?$/.test(file),
        `Development artifact: ${file}`
      );
      assert.ok(
        !/(^|\/)(?:isolation\/|experimental\/isolation\.|isolated-frame-bridge\.|plugin-access-policy\.service\.|plugin-permission-center\.|plugin-permission-grants\.)/.test(
          file
        ),
        `Removed plugin runtime artifact: ${manifest.name}:${file}`
      );
    }
    for (const required of ["LICENSE", "README.md", "dist/index.js", "dist/index.d.ts"])
      assert.ok(files.includes(required), `Missing ${manifest.name}:${required}`);
    for (const entry of Object.values(manifest.exports))
      for (const target of typeof entry === "string" ? [entry] : Object.values(entry))
        assert.ok(files.includes(target.replace(/^\.\//, "")), `Missing exported file: ${target}`);
    for (const bin of Object.values(manifest.bin ?? {}))
      assert.ok(files.includes(bin.replace(/^\.\//, "")), `Missing CLI: ${bin}`);
    const bytes = await readFile(join(output, result.filename));
    artifacts.push({
      name: manifest.name,
      version,
      filename: result.filename,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      integrity: result.integrity,
      files,
      manifest
    });
  }
  const inventory = { version, publication: "not-published", artifacts };
  await writeFile(join(output, "release.json"), JSON.stringify(inventory, null, 2) + "\n");
  return inventory;
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const inventory = await packRelease(process.argv[2] ?? join(repository, ".tmp/release"));
  console.log(
    `Packed ${inventory.artifacts.length} coordinated packages ${inventory.version}; no publication performed`
  );
}

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ConfiguredPluginDiscoveryService } from "../src/runtime/index.js";

test("discovery rejects URL protocols, root escapes and symlinks before import", async (t) => {
  const base = await mkdtemp(join(tmpdir(), "trinacria-discovery-")); t.after(() => rm(base, { recursive: true, force: true }));
  const root = join(base, "allowed"); await mkdir(root);
  const allowed = join(root, "plugin.mjs"); const outside = join(base, "outside.mjs");
  const code = 'export default { manifest: { id: "sample", version: "1.0.0", requiresCore: "^0.1.0" } };';
  await writeFile(allowed, code); await writeFile(outside, code); await symlink(outside, join(root, "escape.mjs"));
  const service = new ConfiguredPluginDiscoveryService({ allowedRoots: [root] });
  const source = (entrypoint: string) => ({ type: "local-path" as const, name: "sample", entrypoint });
  assert.equal((await service.discover([source(allowed)])).plugins[0]?.manifest.id, "sample");
  for (const path of [outside, join(root, "escape.mjs"), "https://example.com/plugin.mjs", "data:text/javascript,evil", "node:fs", pathToFileURL(allowed).href + "?bypass=1"]) {
    await assert.rejects(service.discover([source(path)]));
  }
  let imports = 0;
  const mock = new ConfiguredPluginDiscoveryService({ allowedRoots: [root], importer: async () => { imports++; return {}; } });
  await assert.rejects(mock.discover([source(outside)])); assert.equal(imports, 0);
  const unsupportedSource = { ...source(allowed), unsupportedConfiguration: true };
  await assert.rejects(mock.discover([unsupportedSource]), /discovery failed/);
  assert.equal(imports, 0, "unsupported configuration must fail before import");
});

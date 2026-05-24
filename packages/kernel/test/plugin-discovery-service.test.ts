import assert from "node:assert/strict";
import test from "node:test";
import { PluginManifestError } from "../src/errors/index.js";
import { ConfiguredPluginDiscoveryService } from "../src/runtime/plugin-discovery/plugin-discovery-service.js";
import type { PluginDiscoverySource } from "../src/contracts/plugin-discovery.js";

test("ConfiguredPluginDiscoveryService discovers configured plugin definitions", async () => {
  const service = new ConfiguredPluginDiscoveryService({
    importer: async () => ({
      plugin: {
        manifest: {
          id: "blog-pack",
          version: "1.0.0",
          requiresCore: "^0.1.0"
        }
      }
    })
  });

  const result = await service.discover([createSource("blog-pack")]);

  assert.equal(result.plugins.length, 1);
  assert.equal(result.plugins[0]?.manifest.id, "blog-pack");
  assert.deepEqual(result.sources, [
    {
      type: "package",
      name: "blog-pack",
      entrypoint: "@acme/blog-pack",
      status: "discovered",
      pluginId: "blog-pack"
    }
  ]);
});

test("ConfiguredPluginDiscoveryService skips disabled sources without importing", async () => {
  let imported = false;
  const service = new ConfiguredPluginDiscoveryService({
    importer: async () => {
      imported = true;
      return {};
    }
  });

  const result = await service.discover([
    {
      ...createSource("blog-pack"),
      enabledByDefault: false
    }
  ]);

  assert.equal(imported, false);
  assert.equal(result.plugins.length, 0);
  assert.equal(result.sources[0]?.status, "disabled");
});

test("ConfiguredPluginDiscoveryService records failed sources when configured to continue", async () => {
  const service = new ConfiguredPluginDiscoveryService({
    continueOnError: true,
    importer: async () => {
      throw new Error("module not found");
    }
  });

  const result = await service.discover([createSource("broken-pack")]);

  assert.equal(result.plugins.length, 0);
  assert.equal(result.sources[0]?.status, "failed");
  assert.equal(result.sources[0]?.error, "module not found");
});

test("ConfiguredPluginDiscoveryService fails fast by default", async () => {
  const service = new ConfiguredPluginDiscoveryService({
    importer: async () => ({})
  });

  await assert.rejects(
    async () => service.discover([createSource("broken-pack")]),
    PluginManifestError
  );
});

test("ConfiguredPluginDiscoveryService resolves local-path sources to file URLs", async () => {
  let importedEntrypoint = "";
  const service = new ConfiguredPluginDiscoveryService({
    importer: async (entrypoint) => {
      importedEntrypoint = entrypoint;
      return {
        default: {
          manifest: {
            id: "local-pack",
            version: "1.0.0",
            requiresCore: "^0.1.0"
          }
        }
      };
    }
  });

  await service.discover([
    {
      type: "local-path",
      name: "local-pack",
      entrypoint: "./plugins/local-pack/index.mjs"
    }
  ]);

  assert.equal(importedEntrypoint.startsWith("file://"), true);
  assert.equal(importedEntrypoint.endsWith("/plugins/local-pack/index.mjs"), true);
});

function createSource(name: string): PluginDiscoverySource {
  return {
    type: "package",
    name,
    entrypoint: `@acme/${name}`
  };
}

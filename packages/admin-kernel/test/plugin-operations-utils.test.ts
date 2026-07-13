import assert from "node:assert/strict";
import test from "node:test";
import type { PluginSnapshot } from "../src/pages/plugins/plugin-operations.types.js";
import {
  dependencyTone,
  pluginStateTone,
  reconcileSelectedPluginId
} from "../src/pages/plugins/plugin-operations-utils.js";

function plugin(id: string): PluginSnapshot {
  return {
    id,
    version: "0.1.0",
    requiresCore: "^0.1.0",
    state: "loaded",
    capabilities: [],
    dependencies: [],
    security: { permissions: 0, roles: 0, grants: 0, policyRules: 0 },
    failureCount: 0,
    operations: []
  };
}

test("reconcileSelectedPluginId preserves the current plugin when it remains installed", () => {
  assert.equal(
    reconcileSelectedPluginId([plugin("core-pack"), plugin("email-pack")], "email-pack"),
    "email-pack"
  );
});

test("reconcileSelectedPluginId falls back to the first installed plugin", () => {
  assert.equal(reconcileSelectedPluginId([plugin("core-pack")], "removed-plugin"), "core-pack");
  assert.equal(reconcileSelectedPluginId([], "core-pack"), null);
});

test("plugin presentation tones reflect operational severity", () => {
  assert.equal(pluginStateTone("loaded"), "success");
  assert.equal(pluginStateTone("failed"), "danger");
  assert.equal(dependencyTone("ok"), "success");
  assert.equal(dependencyTone("missing"), "danger");
});

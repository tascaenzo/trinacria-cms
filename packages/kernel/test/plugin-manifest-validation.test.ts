import assert from "node:assert/strict";
import test from "node:test";
import { PluginCompatibilityError, PluginManifestError } from "../src/errors/index.js";
import {
  assertPluginCompatibility,
  validatePluginManifest
} from "../src/runtime/plugin-manifest-validation.js";

test("validatePluginManifest returns normalized manifest", () => {
  const manifest = validatePluginManifest({
    id: "cms/plugin-content",
    version: "1.2.3",
    requiresCore: "^0.1.0",
    capabilities: ["content.read", "content.write"],
    dependencies: [{ pluginId: "cms/plugin-users", versionRange: "~1.0.0" }]
  });

  assert.equal(manifest.id, "cms/plugin-content");
  assert.equal(manifest.version, "1.2.3");
  assert.equal(manifest.requiresCore, "^0.1.0");
  assert.deepEqual(manifest.capabilities, ["content.read", "content.write"]);
  assert.deepEqual(manifest.dependencies, [
    {
      pluginId: "cms/plugin-users",
      versionRange: "~1.0.0",
      optional: false
    }
  ]);
});

test("validatePluginManifest throws on invalid manifest id", () => {
  assert.throws(
    () =>
      validatePluginManifest({
        id: "Invalid Plugin Id",
        version: "1.0.0",
        requiresCore: "^0.1.0"
      }),
    PluginManifestError
  );
});

test("validatePluginManifest throws on invalid requiresCore range", () => {
  assert.throws(
    () =>
      validatePluginManifest({
        id: "cms/plugin-content",
        version: "1.0.0",
        requiresCore: "latest"
      }),
    PluginManifestError
  );
});

test("validatePluginManifest throws on unknown fields (strict object)", () => {
  assert.throws(
    () =>
      validatePluginManifest({
        id: "cms/plugin-content",
        version: "1.0.0",
        requiresCore: "^0.1.0",
        unknownField: true
      }),
    PluginManifestError
  );
});

test("validatePluginManifest throws on self dependency", () => {
  assert.throws(
    () =>
      validatePluginManifest({
        id: "cms/plugin-content",
        version: "1.0.0",
        requiresCore: "^0.1.0",
        dependencies: [
          {
            pluginId: "cms/plugin-content",
            versionRange: "^1.0.0"
          }
        ]
      }),
    PluginManifestError
  );
});

test("validatePluginManifest throws on duplicate dependency plugin ids", () => {
  assert.throws(
    () =>
      validatePluginManifest({
        id: "cms/plugin-content",
        version: "1.0.0",
        requiresCore: "^0.1.0",
        dependencies: [
          { pluginId: "cms/plugin-users", versionRange: "^1.0.0" },
          { pluginId: "cms/plugin-users", versionRange: "^1.1.0" }
        ]
      }),
    PluginManifestError
  );
});

test("validatePluginManifest throws on duplicate capabilities", () => {
  assert.throws(
    () =>
      validatePluginManifest({
        id: "cms/plugin-content",
        version: "1.0.0",
        requiresCore: "^0.1.0",
        capabilities: ["content.read", "content.read"]
      }),
    PluginManifestError
  );
});

test("validatePluginManifest throws on invalid dependency versionRange", () => {
  assert.throws(
    () =>
      validatePluginManifest({
        id: "cms/plugin-content",
        version: "1.0.0",
        requiresCore: "^0.1.0",
        dependencies: [{ pluginId: "cms/plugin-users", versionRange: "latest" }]
      }),
    PluginManifestError
  );
});

test("assertPluginCompatibility throws on incompatible core version", () => {
  const manifest = validatePluginManifest({
    id: "cms/plugin-content",
    version: "1.2.3",
    requiresCore: "^1.0.0"
  });

  assert.throws(() => assertPluginCompatibility(manifest, "0.1.0"), PluginCompatibilityError);
});

test("validatePluginManifest accepts security declarations", () => {
  const manifest = validatePluginManifest({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    security: {
      permissions: [
        {
          key: "blog-pack:posts:read",
          displayName: "Read posts"
        }
      ],
      roles: [
        {
          code: "editor",
          name: "Editor"
        }
      ],
      grants: [
        {
          roleCode: "editor",
          permissionKeys: ["blog-pack:posts:read"]
        }
      ]
    }
  });

  assert.equal(manifest.security?.permissions?.length, 1);
  assert.equal(manifest.security?.roles?.length, 1);
  assert.equal(manifest.security?.grants?.length, 1);
});

test("validatePluginManifest rejects security permissions owned by another plugin", () => {
  assert.throws(
    () =>
      validatePluginManifest({
        id: "blog-pack",
        version: "1.0.0",
        requiresCore: "^0.1.0",
        security: {
          permissions: [
            {
              key: "core-pack:users:read",
              displayName: "Invalid ownership"
            }
          ]
        }
      }),
    PluginManifestError
  );
});

test("validatePluginManifest accepts security policy rules", () => {
  const manifest = validatePluginManifest({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    security: {
      policyRules: [
        {
          roleCode: "editor",
          effect: "allow",
          permissionPattern: "blog-pack:posts:*",
          conditions: ["resource_id_required"]
        }
      ]
    }
  });

  assert.equal(manifest.security?.policyRules?.length, 1);
  assert.equal(manifest.security?.policyRules?.[0]?.permissionPattern, "blog-pack:posts:*");
});

test("validatePluginManifest rejects policy rules for foreign plugin namespace", () => {
  assert.throws(
    () =>
      validatePluginManifest({
        id: "blog-pack",
        version: "1.0.0",
        requiresCore: "^0.1.0",
        security: {
          policyRules: [
            {
              roleCode: "editor",
              effect: "deny",
              permissionPattern: "core-pack:users:*"
            }
          ]
        }
      }),
    PluginManifestError
  );
});

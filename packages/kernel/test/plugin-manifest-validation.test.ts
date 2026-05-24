import assert from "node:assert/strict";
import test from "node:test";
import { PluginCompatibilityError, PluginManifestError } from "../src/errors/index.js";
import {
  assertPluginCompatibility,
  validatePluginManifest
} from "../src/runtime/plugin-manifest/plugin-manifest-validation.js";

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

test("validatePluginManifest accepts M4 declarative contribution blocks", () => {
  const manifest = validatePluginManifest({
    id: "blog-pack",
    displayName: "Blog Pack",
    description: "Posts and editorial workflows",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [
      {
        name: "posts",
        displayName: "Posts",
        schemaVersion: 1,
        documentSchema: {
          type: "object"
        },
        indexes: [
          {
            name: "slug_unique",
            fields: { slug: 1 },
            unique: true
          }
        ],
        repository: {
          mode: "standard"
        }
      }
    ],
    settings: [
      {
        namespace: "editorial",
        key: "default-status",
        type: "string",
        visibility: "protected",
        required: true,
        defaultValueJson: '"draft"'
      }
    ],
    events: {
      emits: [
        {
          name: "post-published",
          visibility: "public",
          version: 1,
          payloadSchema: {
            type: "object"
          }
        }
      ],
      subscribes: [
        {
          eventName: "media-pack:asset-updated",
          handler: "syncPostMedia"
        }
      ]
    },
    admin: {
      routes: [
        {
          id: "posts",
          path: "/blog/posts",
          label: "Posts",
          requiredPermission: "blog-pack:posts:read"
        }
      ],
      resources: [
        {
          id: "posts",
          label: "Posts",
          routeBase: "/blog/posts",
          apiBase: "/api/blog/posts",
          requiredPermission: "blog-pack:posts:read"
        }
      ],
      settingsSections: [
        {
          id: "editorial",
          label: "Editorial",
          namespace: "editorial"
        }
      ]
    },
    security: {
      permissions: [
        {
          key: "blog-pack:posts:read",
          displayName: "Read posts"
        }
      ]
    }
  });

  assert.equal(manifest.displayName, "Blog Pack");
  assert.equal(manifest.entities?.[0]?.name, "posts");
  assert.equal(manifest.settings?.[0]?.key, "default-status");
  assert.equal(manifest.events?.emits?.[0]?.delivery, "async");
  assert.equal(manifest.admin?.routes?.[0]?.path, "/blog/posts");
});

test("validatePluginManifest rejects reserved plugin ids and namespaces", () => {
  assert.throws(
    () =>
      validatePluginManifest({
        id: "kernel",
        version: "1.0.0",
        requiresCore: "^0.1.0"
      }),
    PluginManifestError
  );

  assert.throws(
    () =>
      validatePluginManifest({
        id: "blog-pack",
        version: "1.0.0",
        requiresCore: "^0.1.0",
        settings: [
          {
            namespace: "system",
            key: "enabled",
            type: "boolean",
            visibility: "protected"
          }
        ]
      }),
    PluginManifestError
  );
});

test("validatePluginManifest rejects duplicate M4 contribution keys", () => {
  assert.throws(
    () =>
      validatePluginManifest({
        id: "blog-pack",
        version: "1.0.0",
        requiresCore: "^0.1.0",
        settings: [
          {
            namespace: "editorial",
            key: "default-status",
            type: "string",
            visibility: "protected"
          },
          {
            namespace: "editorial",
            key: "default-status",
            type: "string",
            visibility: "protected"
          }
        ]
      }),
    PluginManifestError
  );
});

test("validatePluginManifest rejects admin permission references owned by another plugin", () => {
  assert.throws(
    () =>
      validatePluginManifest({
        id: "blog-pack",
        version: "1.0.0",
        requiresCore: "^0.1.0",
        admin: {
          routes: [
            {
              id: "posts",
              path: "/blog/posts",
              label: "Posts",
              requiredPermission: "core-pack:users:read"
            }
          ]
        }
      }),
    PluginManifestError
  );
});

test("validatePluginManifest accepts v2 settings format", () => {
  const manifest = validatePluginManifest({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    settings: [
      {
        key: "blog-pack:editorial:default_status",
        category: "editorial",
        description: "Default post status",
        defaultValue: "draft",
        status: "active",
        secret: false,
        mutable: true,
        visibility: "public"
      },
      {
        key: "blog-pack:editorial:max_authors",
        category: "editorial",
        description: "Max authors per post",
        defaultValue: 5,
        schema: { type: "number", minimum: 1, maximum: 100 }
      }
    ]
  });

  assert.equal(manifest.settings?.length, 2);
  // V2 settings should be normalized to v1 shape
  const first = manifest.settings?.[0]!;
  assert.equal(first.namespace, "editorial");
  assert.equal(first.key, "default_status");
  assert.equal(first.type, "string");
  assert.equal(first.visibility, "public");
  assert.equal(first.required, false);
  assert.equal(first.defaultValueJson, '"draft"');

  const second = manifest.settings?.[1]!;
  assert.equal(second.namespace, "editorial");
  assert.equal(second.key, "max_authors");
  assert.equal(second.type, "number");
  assert.equal(second.defaultValueJson, "5");
});

test("validatePluginManifest accepts v2 secret setting", () => {
  const manifest = validatePluginManifest({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    settings: [
      {
        key: "blog-pack:integrations:api_key",
        category: "integrations",
        description: "External API key",
        secret: true,
        visibility: "admin"
      }
    ]
  });

  assert.equal(manifest.settings?.length, 1);
  const setting = manifest.settings?.[0]!;
  assert.equal(setting.type, "secret");
  assert.equal(setting.visibility, "protected"); // admin -> protected mapping
  assert.equal(setting.required, true); // no defaultValue
});

test("validatePluginManifest rejects invalid v2 setting key format", () => {
  assert.throws(
    () =>
      validatePluginManifest({
        id: "blog-pack",
        version: "1.0.0",
        requiresCore: "^0.1.0",
        settings: [
          {
            key: "invalid-key-format",
            category: "test",
            description: "Bad key"
          }
        ]
      }),
    PluginManifestError
  );
});

test("validatePluginManifest rejects duplicate v2 setting keys", () => {
  assert.throws(
    () =>
      validatePluginManifest({
        id: "blog-pack",
        version: "1.0.0",
        requiresCore: "^0.1.0",
        settings: [
          {
            key: "blog-pack:editorial:default_status",
            category: "editorial",
            defaultValue: "draft"
          },
          {
            key: "blog-pack:editorial:default_status",
            category: "editorial",
            defaultValue: "published"
          }
        ]
      }),
    PluginManifestError
  );
});



import assert from "node:assert/strict";
import test from "node:test";
import {
  defineAdmin,
  defineAdminResource,
  defineAdminRoute,
  defineBooleanSetting,
  defineEvents,
  defineGrant,
  definePermission,
  definePermissionKey,
  definePermissionSet,
  definePluginManifest,
  definePolicyRule,
  defineSettingKey,
  defineStringSetting,
  errorEnvelope,
  parseWithSchema,
  successEnvelope
} from "../src/plugin-api/index.js";

test("plugin API defines normalized permission keys and permission sets", () => {
  assert.equal(definePermissionKey("Blog-Pack", "Posts", "Read"), "blog-pack:posts:read");

  const permission = definePermission({
    pluginId: "Blog-Pack",
    resource: "Posts",
    action: "Write",
    displayName: "Write posts"
  });

  assert.deepEqual(permission, {
    key: "blog-pack:posts:write",
    displayName: "Write posts"
  });

  const catalog = definePermissionSet("Blog-Pack", {
    POSTS_READ: {
      resource: "posts",
      action: "read",
      displayName: "Read posts"
    },
    POSTS_WRITE: {
      resource: "posts",
      action: "write",
      displayName: "Write posts"
    }
  });

  assert.deepEqual(catalog.keys, {
    POSTS_READ: "blog-pack:posts:read",
    POSTS_WRITE: "blog-pack:posts:write"
  });
  assert.deepEqual(
    catalog.permissions.map((item) => item.key),
    ["blog-pack:posts:read", "blog-pack:posts:write"]
  );
});

test("plugin API defines settings with stable defaults", () => {
  assert.equal(
    defineSettingKey("Blog-Pack", "Editorial", "Featured"),
    "blog-pack:editorial:featured"
  );

  assert.deepEqual(
    defineStringSetting({
      pluginId: "Blog-Pack",
      domain: "Editorial",
      name: "Default Status",
      description: "Default post status",
      defaultValue: "draft",
      minLength: 1
    }),
    {
      key: "blog-pack:editorial:default.status",
      category: "editorial",
      description: "Default post status",
      schema: { type: "string", minLength: 1 },
      defaultValue: "draft",
      status: "active",
      secret: false,
      mutable: true,
      visibility: "admin"
    }
  );

  assert.deepEqual(
    defineBooleanSetting({
      pluginId: "blog-pack",
      domain: "publishing",
      name: "auto publish",
      defaultValue: false,
      visibility: "internal"
    }),
    {
      key: "blog-pack:publishing:auto.publish",
      category: "publishing",
      schema: { type: "boolean" },
      defaultValue: false,
      status: "active",
      secret: false,
      mutable: true,
      visibility: "internal"
    }
  );
});

test("plugin API composes admin, security and event manifest sections", () => {
  const permissions = definePermissionSet("blog-pack", {
    POSTS_READ: { resource: "posts", action: "read", displayName: "Read posts" }
  });

  const admin = defineAdmin({
    routes: [
      defineAdminRoute({
        id: "posts",
        path: "/posts",
        label: "Posts",
        requiredPermission: permissions.keys.POSTS_READ,
        componentRef: "blog-pack.posts"
      })
    ],
    resources: [
      defineAdminResource({
        id: "posts",
        label: "Posts",
        routeBase: "/posts",
        apiBase: "/v1/blog/posts",
        requiredPermission: permissions.keys.POSTS_READ
      })
    ],
    widgets: []
  });

  const manifest = definePluginManifest({
    id: "Blog-Pack",
    displayName: "Blog Pack",
    version: "1.2.3",
    requiresCore: "^0.1.0",
    capabilities: ["Posts.Read"],
    settings: [],
    admin,
    events: defineEvents({
      emits: [],
      subscribes: [{ eventName: "core-pack.users.created", handler: "users.onCreated" }]
    }),
    security: {
      permissions: permissions.permissions,
      grants: [defineGrant({ roleCode: "Editor", permissionKeys: [permissions.keys.POSTS_READ] })],
      policyRules: [
        definePolicyRule({
          roleCode: "Editor",
          permissionPattern: "blog-pack:posts:*"
        })
      ]
    }
  });

  assert.equal(manifest.id, "blog-pack");
  assert.deepEqual(manifest.capabilities, ["posts.read"]);
  assert.equal(manifest.settings, undefined);
  assert.equal(manifest.admin?.routes?.[0]?.componentRef, "blog-pack.posts");
  assert.equal(manifest.events?.subscribes?.[0]?.handler, "users.onCreated");
  assert.equal(manifest.security?.grants?.[0]?.roleCode, "editor");
  assert.equal(manifest.security?.policyRules?.[0]?.effect, "allow");
});

test("plugin API creates reusable response envelopes", () => {
  assert.deepEqual(successEnvelope({ ok: true }, { requestId: "req-1" }), {
    data: { ok: true },
    meta: { requestId: "req-1" }
  });
  assert.deepEqual(errorEnvelope("invalid_input", "Invalid input", { field: "title" }), {
    error: {
      code: "invalid_input",
      message: "Invalid input",
      details: { field: "title" }
    }
  });
});

test("plugin API parses schema-like objects without depending on a specific schema package", () => {
  const value = parseWithSchema(
    {
      parse(input: unknown) {
        assert.equal(typeof input, "object");
        return { parsed: true };
      }
    },
    { raw: true }
  );

  assert.deepEqual(value, { parsed: true });
});

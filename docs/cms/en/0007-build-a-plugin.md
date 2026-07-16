# 0007 - Build a new plugin professionally

This chapter defines the practical standard for building plugins compatible with kernel runtime and core-pack manifest provisioning.

## 1. Initial decision

A domain should become a dedicated plugin when it:

- has an independent lifecycle
- can be loaded/unloaded without shutting down the whole CMS
- exposes capabilities useful to other plugins

## 2. Recommended scaffold

Example: `packages/blog-pack`

Minimal structure:

- `src/plugin/`
- `src/modules/`
- `src/index.ts`
- `test/`

Module pattern:

- `schemas.ts`
- `dto/`
- `repository.ts`
- `service.ts`
- `controller.ts`
- `module.ts`

## 3. Identity and manifest

### 3.1 Single plugin constant

Define one constant:

- `BLOG_PACK_PLUGIN_ID = "blog-pack"`

### 3.2 Base manifest fields

- `id`
- `version`
- `requiresCore`
- `capabilities`
- `dependencies`

### 3.3 Security catalogs exported by core-pack

`core-pack` exports typed catalogs to avoid duplicated string literals:

- `CORE_PACK_CAPABILITY_LIST`
- `CORE_PACK_PERMISSION_KEYS`
- `CORE_PACK_PERMISSION_DEFINITIONS`

Example:

```ts
import { CORE_PACK_CAPABILITY_LIST, CORE_PACK_PERMISSION_KEYS } from "@trinacria-cms/core-pack";
```

## 4. Security manifest (new standard)

If your plugin contributes permissions or role grants, use `manifest.security`:

- `permissions[]`
- `roles[]`
- `grants[]`
- `policyRules[]` (optional, for wildcard/conditional `allow`/`deny`)

Rules:

- permission keys must be `<pluginId>:<resource>:<action>`
- grant keys must be owned by the same plugin
- `permissionPattern` in policy rules: `<pluginId>:<resource|*>:<action|*>`
- when using `security`, declare dependency on `core-pack`

Minimal example:

```ts
security: {
  permissions: [
    { key: "blog-pack:posts:read", displayName: "Read posts" },
    { key: "blog-pack:posts:publish", displayName: "Publish posts" }
  ],
  grants: [
    {
      roleCode: "editor",
      permissionKeys: [
        "blog-pack:posts:read",
        "blog-pack:posts:publish"
      ]
    }
  ],
  policyRules: [
    {
      roleCode: "editor",
      effect: "deny",
      permissionPattern: "blog-pack:posts:delete"
    },
    {
      roleCode: "editor",
      effect: "allow",
      permissionPattern: "blog-pack:posts:read",
      conditions: ["resource_id_required"]
    }
  ]
}
```

## 5. Translations and namespaces

Plugins declare lightweight translation metadata in `manifest.i18n`. A
namespace is plugin-local and identifies the consuming surface (`admin`,
`public`, or `mobile`). Keep the actual dictionaries in package assets such as
`src/i18n/public/en.json` and `src/i18n/public/it.json`.

Every namespace must list the English fallback. The manifest contains no
message payload:

```ts
i18n: {
  fallbackLocale: "en",
  namespaces: [
    { id: "public", surface: "public", locales: ["en", "it"], source: "public" }
  ]
}
```

Expose the package assets on the plugin definition; provisioning imports one
small DB record for each locale/key pair:

```ts
const plugin: KernelPluginDefinition = {
  manifest,
  i18nSources: [
    { source: "public", locale: "en", messages: en },
    { source: "public", locale: "it", messages: it }
  ]
};
```

External clients resolve one surface with
`GET /v1/i18n/:locale?namespace=blog-pack:public`.
The Backoffice loads every installed admin namespace with
`GET /v1/i18n/:locale?surface=admin`.

## 6. Root module

`BlogPackRootModule` should only compose internal modules.

## 7. Internal domain implementation

Repository:

- use `DbAdapter` and `createPluginDbScope`

Service:

- keep business policy here

Controller:

- parse DTO inputs
- return envelopes with `createPluginApiResponder(pluginId)`
- include OpenAPI route metadata

## 8. Runtime lifecycle and provisioning

With `startCmsApp(...)`:

- plugin loads through runtime orchestration
- runtime `onAfterLoad` hook calls `PluginManifestProvisioner.provision(...)`
- manifest-owned resources are synced into Core: security (`permissions/roles`
  + embedded grants), settings, and package-local i18n assets
- including optional policy rules (`allow`/`deny`, wildcard, conditions)

On unregister:

- runtime `onBeforeUnregister` calls `deprovision(...)`; owned translation
  message records are removed too

## 9. Release checklist

1. manifest passes validation
2. namespaced permission keys are correct
3. `core-pack` dependency is declared when using `security`
4. typecheck/tests pass
5. playground API smoke checks pass
6. endpoints appear in OpenAPI

## 10. Anti-patterns

- non-namespaced permission keys
- direct mutation of foreign role definitions instead of grants
- relying on manual plugin load order without dependencies
- business logic in controllers

## 11. Conclusion

A modern Trinacria CMS plugin is contract-first: it declares capabilities and security contributions in the manifest, while runtime orchestration handles consistent provisioning behavior.

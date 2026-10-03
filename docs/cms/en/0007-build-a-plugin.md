# 0007 - Build a new plugin professionally

Updated October 3, 2026: trusted in-process plugins, no database approvals for local
integrations, single-instance lifecycle and an optional cluster.
See the [current operating contract](../architecture/plugin-platform/trusted-plugin-model.md).

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

## Event authorization

Protected/audit subscriptions need a producer-owned declared permission and a positive
policy decision. Missing authorizer fails load; Core supplies the DI policy. Minimal
hosts must supply an explicit restricted authorizer. Every delivery rechecks policy;
revoked consumers are skipped. Approval after failed load requires a new load, and
already-running handlers may finish. Unload/reload rejects stale binding generations;
partial load rolls back subscriptions and modules, including recursive dependencies.
Use runtime `onDeliveryDiagnostic` or starter `onPluginEventDeliveryDiagnostic` for
redacted diagnostics. In-process plugins remain trusted; A1 is not a sandbox.

## Plugin host services (A0 implemented)

Lifecycle hooks and event handlers receive `context.services`; `context.app` and the
unrestricted container/event bus are no longer part of the plugin contract. Use public
`@trinacria-cms/kernel/plugin-api` types (`PluginHostServices`, `PluginStorage`,
`PluginRepository`, `PluginQuery`) and the existing manifest helpers.

```ts
async function onLoad(context: { services: PluginHostServices }) {
  const items = await context.services.storage.repository("items").findMany({ limit: 20 });
  await context.services.logger.info("Plugin initialized", { action: "initialize" });
}
```

Declare `items` in the manifest and register its schema in the module using
`defineEntity({ ownerPluginId: "your-plugin", entityName: "items", schema })` from
`@trinacria-cms/kernel/runtime`. Storage fixes the owner; findMany defaults to at most
100 rows and rejects adapter metadata. `storage.transaction(work)` keeps the same owner
and session, rejects nesting, and expires transaction repositories when the attempt ends.
All retained services expire after unload/reload. Settings get/set only accepts declared
owner keys; secrets and foreign settings are denied. Events use `services.events.emit`.
Logger metadata is restricted and owner-labelled; use fixed messages without secrets.

For host-composed application services use `pluginOperationsProvider` from `@trinacria-cms/kernel/runtime`.
The host resolves explicit DI dependencies during module composition; export the provider
token from the module. Call `services.operations.call(ownerPluginId, name, jsonInput)`;
input is schema-validated and input/output are copied JSON (1 MiB, depth 32). Private
operations are owner-only. Cross-plugin calls require a declared owner permission and
a manifest dependency. The standard Core policy validates installed trusted integrations
in memory, without database approval records or grant transaction fences. Missing policy denies access.
Cancellation via `{ signal }` is cooperative. Official packs use private named operations
for initialization, cleanup and secure email delivery; callers never receive domain
service instances or raw secrets from those operations.

Discovery accepts configured local files within realpath roots. The default root is
`process.cwd()`; hosts set `pluginAllowedRoots` in `startCmsApp` options for extra local
workspace/package roots. HTTP/data/node entrypoints, query/fragment URLs and symlink
escapes are rejected before import. Pin trusted packages in the host lockfile and review
them: these API boundaries do not isolate in-process code.

Mongo storage uses `v2_` plus SHA-256 of `[pluginId, workspaceId ?? null, entityName]`,
with a persistent ownership registry and unique tuple/physical-name indexes. Existing
`plugin_`/`kernel__` collections block initialization; choose an empty development DB
or plan an explicit migration. No automatic data reset or legacy fallback is performed.
`HostUnitOfWork` is advanced host infrastructure and is absent from plugin services/API.

## Secure payloads (A2 implemented)

Use `context.services.securePayloads`, typed as public `SecureEventPayloadClient`,
for create/claim/revoke. Producer and consumer identities are fixed by the runtime;
do not send them in the body. Claim requires matching eventName, payloadType,
schemaVersion and requiredPermission. Returned records and policy requests omit ciphertext;
only a successful CAS claim returns plaintext. Structural expiry/status/count/recipient
checks precede policy. Missing, invalid or negative policy denies access; an empty
recipient list denies everyone. Three attempts maximum, with policy rechecked each time.

```ts
const result = await context.services.securePayloads.claim<{ message: string }>({
  payloadId: notification.securePayloadId,
  eventName: context.eventName,
  payloadType: "producer:message",
  schemaVersion: 1,
  requiredPermission: "producer:payload:read"
});
```

The starter requires an explicit keyring in development too: `CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID`
and `CMS_SECURE_PAYLOAD_KEYS_JSON` (canonical base64 of random 32-byte keys), with no fallback.
Terminal retention defaults to 24 hours using TTL; expiry authorization remains independent.
See the [A2 configuration and resumable rotation runbook](../architecture/plugin-platform/secure-payload-keyring-runbook.md) for errors and maintenance.

## Application operations (A3)

Use `context.services.operations.call(owner, name, input)` for a registered business
operation. The runtime creates its certified plugin context: do not send actor,
userId or an OperationContext in the input. Installed dependencies authorize local integrations,
and an entry publication additionally checks the workflow's action and publish.
Own declared, nonsecret settings use the scoped settings capability without a self API
grant. Cross-plugin Settings operations use the declared dependency and owner permission.
Signed external HTTP settings clients still require explicit persisted grants.
Host integrations use context-first domain facades; delegation requires a previously
authenticated user context and checks both principals. In-process code remains trusted.
See the [standard trust model](../architecture/plugin-platform/trusted-plugin-model.md).

## Public exports after B0

Import authoring helpers from kernel/plugin-api, types from kernel/contracts and
Settings signing helpers from core-pack/plugin-api. Host composition uses the
experimental `/runtime` subpath of kernel and packs; repositories and raw services
are absent from pack roots. See the [eight-package baseline](../specs/core-platform/public-api/README.md).
Semver follows strict npm ranges: ^0.1.0 excludes 0.2.0 and prereleases need explicit admission.

## SDK overlay (B1)

```sh
trinacria-sdk ./openapi.json ./generated/catalog --mode overlay --owner catalog-plugin
```

Import `createPluginSdk` from the generated index and call it with the existing CMS
client. The overlay uses `@trinacria-cms/sdk/runtime` and leaves official groups intact.
The output directory must be dedicated; generated files are tracked by its ownership
marker. Unsupported schemas and sanitized operation/tag collisions stop generation.
See `packages/sdk/README.md` for HTTP authentication and binary transports.

## External catalog starter (D0)

```sh
create-trinacria-plugin ./catalog-plugin catalog-plugin
cd catalog-plugin
npm install
npm run build
npm test
trinacria-sdk ./openapi.json ./generated/catalog --mode overlay --owner catalog-plugin
```

Register the backend explicitly after Core. Import `/admin-manifest` for pure metadata
and `/admin` for React renderers; rebuild the trusted admin host. The page supports
CRUD, bounded pagination, stale-version conflicts and API failure recovery. Backend
installation does not require React. Review the generated README and the
[external developer runbook](../architecture/plugin-platform/external-plugin-runbook.md)
for installed integration contracts, durable events, lifecycle and the independent human acceptance trial.

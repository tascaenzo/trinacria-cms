# @trinacria-cms/kernel

Kernel runtime package of Trinacria CMS.

This package is the CMS-specific layer built on top of the Trinacria framework
libraries (`@trinacria/core`, `@trinacria/http`, `@trinacria/schema`). It should
specialize Trinacria for CMS plugin orchestration without duplicating the base
framework.

## Responsibilities

- plugin contracts
- runtime lifecycle primitives and strict state machine
- dependency injection contracts
- kernel provider tokens
- Mongo storage core contracts and namespace scoping helpers
- typed runtime/plugin errors
- manifest validation and compatibility checks
- MongoDB adapter with Mongoose-compatible bridge
- runtime observability events, retry policy, dependency graph snapshot
- runtime state persistence (`PluginRuntimeStore`)
- starter bootstrap with optional automatic plugin manifest provisioning
- system API DTOs for plugin source, lifecycle operations, dependency status,
  recent events, and contribution diagnostics

## Key exports

- contracts: `plugin-manifest`, `plugin-manifest-provisioner`, `plugin-runtime`, `plugin-runtime-store`, `db-adapter`, `authz-service`
- plugin API helpers: `definePluginManifest`, `defineSetting`, `defineAdmin`, `defineAdminRoute`, `defineAdminResource`, `defineAdminSettingsSection`, `successEnvelope`, `errorEnvelope`
- runtime: `validatePluginManifest`, `assertPluginCompatibility`, `InMemoryPluginRuntime`, `PluginContributionRegistry`
- runtime helpers: `isValidPermissionKey`, `parsePermissionKey`, `buildContributionKey`, `buildSettingKey`, `isValidPluginId`, `isValidNamespaceSegment`
- pattern helpers: `isValidPermissionPattern`, `matchesPermissionPattern`
- runtime health: `KernelHealthService`
- persistence: `EntityRegistry`, `MongoDbAdapter`, `createMongoDbAdapter`
- runtime persistence: `DbPluginRuntimeStore`, `InMemoryPluginRuntimeStore`
- tokens: `CORE_TOKENS`

## Runtime highlights

- strict plugin transitions
- dependency graph checks (missing deps, cycles)
- lifecycle rollback on failure
- contribution catalog visibility is tied to `loaded` state only
- `GET /v1/system/plugins/:pluginId/events` supports `limit` for recent event
  diagnostics
- runtime hooks for cross-cutting orchestration:
  - `onAfterLoad`
  - `onBeforeUnregister`
- `unregister(...)` support for plugin uninstall-like flows
- `PluginManifestProvisioner` materializes manifest-owned Core resources on
  load, deferred installation completion, and unregister
- manifest security validation supports policy rules (`allow`/`deny`, wildcard, conditions)
- starter auto-selects runtime store:
  - `DbPluginRuntimeStore` when Mongo storage is available
  - `InMemoryPluginRuntimeStore` fallback otherwise

## Stability policy

The project has not been released. Contracts can change directly while all repository
consumers are updated together; no legacy aliases or deprecation window are required.

Developer-facing plugin API reference:
[`docs/cms/specs/core-platform/public-plugin-api.md`](../../docs/cms/specs/core-platform/public-plugin-api.md).

New plugin code should import generic manifest/admin/security/settings helpers
from `@trinacria-cms/kernel/plugin-api`. `@trinacria-cms/core-pack/plugin-api`
re-exports those helpers and additionally exposes the core-pack-specific signed
settings request utilities.

M5 runtime implementation guide:
[`docs/cms/specs/core-platform/m5-plugin-runtime-implementation.md`](../../docs/cms/specs/core-platform/m5-plugin-runtime-implementation.md).

## Scripts

```bash
npm run dev -w @trinacria-cms/kernel
npm run build -w @trinacria-cms/kernel
npm run typecheck -w @trinacria-cms/kernel
npm run test -w @trinacria-cms/kernel
```

## Plugin event authorization

Manifest subscriptions to `protected` and `audit` events require a permission declared
by the event owner and a policy decision. Core checks declared dependencies/subscriptions
in memory; installed trusted plugins do not need database approvals. Missing
policy fails load with `PluginRuntimeError` and
`details.reason = "event_subscription_authorizer_missing"`. Supply a narrowly scoped
`eventSubscriptionAuthorizer` or the Core DI policy; there is no global bypass.
Explicit authorizers take precedence over `CORE_TOKENS.PLUGIN_EVENT_SUBSCRIPTION_AUTHORIZER`.
Public events need no policy; private events remain owner-only.

The runtime checks the configured policy before every protected/audit delivery.
The standard policy reads local manifest contracts, not persisted grants.
Denial, exceptions and invalid decisions skip that consumer, while other consumers
continue even with `stopOnError`. Handler errors retain normal bus behavior. Disabling
a plugin blocks new work and drains accepted work. The optional persisted policy retains
its separate grant revocation semantics for experimental hosts.

`onDeliveryDiagnostic` receives `PluginEventDeliveryDiagnostic` with timestamp, consumer,
owner, event name/ID, stable reason and `denied`/`policy-error`/`inactive` outcome. It never
receives payloads, envelopes or policy error text. Callback errors are contained and
reported with a fixed message. The CMS starter exposes `onPluginEventDeliveryDiagnostic`
and defaults to structured console warnings.

The same preflight/binding/rollback path covers recursive dependency loads. Partial
binding is torn down and modules/contributions rolled back before retry. Unload/reload
invalidates the binding generation, including listeners already snapshotted by the bus
or awaiting policy. These checks govern cooperative plugin APIs; trusted in-process
code can still access the process directly. They are not a sandbox.

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
See the [A2 configuration and resumable rotation runbook](../../docs/cms/architecture/plugin-platform/secure-payload-keyring-runbook.md) for errors and maintenance.

## Public API baseline (B0)

Host bootstrap, persistence, runtime implementations and identity factories are
exported from `@trinacria-cms/kernel/runtime`, not the root. `/runtime` is an
experimental advanced host surface. Plugin authoring uses `/plugin-api` and
`/contracts`; do not deep import source files. The eight-package export inventory,
reachable declaration snapshots and positive/negative consumer fixture are in
[the baseline](../../docs/cms/specs/core-platform/public-api/README.md). Run
`npm run public-api:check` after building; review changes before `public-api:update`.
Semver wrappers use the direct npm semver dependency, strict parsing and opt-in prereleases.

## Standard deployment

Trusted in-process plugins are the standard model. `startCmsApp` without `cluster`
supports local lifecycle operations; multiple CMS instances explicitly configure cluster
coordination. The playground defaults to local mode (`PLAYGROUND_CLUSTER_ENABLED=true`
opts into cluster). A Mongo replica set is still required for domain transactions.
See the [current trust model](../../docs/cms/architecture/plugin-platform/trusted-plugin-model.md).

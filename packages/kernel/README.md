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
- starter bootstrap with optional automatic plugin security provisioning
- system API DTOs for plugin source, lifecycle operations, dependency status,
  recent events, and contribution diagnostics

## Key exports

- contracts: `plugin-manifest`, `plugin-runtime`, `plugin-runtime-store`, `plugin-security-provisioner`, `db-adapter`, `authz-service`
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
- manifest security validation supports policy rules (`allow`/`deny`, wildcard, conditions)
- starter auto-selects runtime store:
  - `DbPluginRuntimeStore` when Mongo storage is available
  - `InMemoryPluginRuntimeStore` fallback otherwise

## Stability policy

Kernel contracts are compatibility-critical. Breaking changes should be explicit and versioned.

Developer-facing plugin API reference:
[`docs/cms/specs/core-platform/public-plugin-api.md`](../../docs/cms/specs/core-platform/public-plugin-api.md).

M5 runtime implementation guide:
[`docs/cms/specs/core-platform/m5-plugin-runtime-implementation.md`](../../docs/cms/specs/core-platform/m5-plugin-runtime-implementation.md).

## Scripts

```bash
npm run dev -w @trinacria-cms/kernel
npm run build -w @trinacria-cms/kernel
npm run typecheck -w @trinacria-cms/kernel
npm run test -w @trinacria-cms/kernel
```

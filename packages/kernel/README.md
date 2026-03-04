# @trinacria-cms/kernel

Kernel runtime package of Trinacria CMS.

## Responsibilities

- plugin contracts
- runtime lifecycle primitives and strict state machine
- dependency injection contracts
- kernel provider tokens
- DB abstraction contracts and namespace scoping helpers
- typed runtime/plugin errors
- manifest validation and compatibility checks
- MongoDB adapter with Mongoose-compatible bridge
- runtime observability events, retry policy, dependency graph snapshot
- runtime state persistence (`PluginRuntimeStore`)
- starter bootstrap with optional automatic plugin security provisioning

## Key exports

- contracts: `plugin-manifest`, `plugin-runtime`, `plugin-runtime-store`, `plugin-security-provisioner`, `db-adapter`, `authz-service`
- runtime: `validatePluginManifest`, `assertPluginCompatibility`, `InMemoryPluginRuntime`
- runtime helpers: `isValidPermissionKey`, `parsePermissionKey`
- pattern helpers: `isValidPermissionPattern`, `matchesPermissionPattern`
- runtime health: `KernelHealthService`
- persistence: `EntityRegistry`, `MongoDbAdapter`, `createMongoDbAdapter`
- runtime persistence: `DbPluginRuntimeStore`, `InMemoryPluginRuntimeStore`
- tokens: `CORE_TOKENS`

## Runtime highlights

- strict plugin transitions
- dependency graph checks (missing deps, cycles)
- lifecycle rollback on failure
- runtime hooks for cross-cutting orchestration:
  - `onAfterLoad`
  - `onBeforeUnregister`
- `unregister(...)` support for plugin uninstall-like flows
- manifest security validation supports policy rules (`allow`/`deny`, wildcard, conditions)
- starter auto-selects runtime store:
  - `DbPluginRuntimeStore` when DB adapter is available
  - `InMemoryPluginRuntimeStore` fallback otherwise

## Stability policy

Kernel contracts are compatibility-critical. Breaking changes should be explicit and versioned.

## Scripts

```bash
npm run dev -w @trinacria-cms/kernel
npm run build -w @trinacria-cms/kernel
npm run typecheck -w @trinacria-cms/kernel
npm run test -w @trinacria-cms/kernel
```

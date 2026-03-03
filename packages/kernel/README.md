# @trinacria-cms/kernel

Kernel runtime package of Trinacria CMS.

## Responsibilities

- plugin contracts
- runtime lifecycle primitives
- dependency injection contracts
- kernel provider tokens
- workspace/settings/auth/rbac contracts
- DB abstraction contracts and namespace scoping helpers
- typed runtime/plugin errors
- manifest validation and compatibility checks
- MongoDB adapter with Mongoose-compatible bridge
- plugin runtime observability events, retry policy, and dependency graph snapshot

## Non-goals

`kernel` should not contain HTTP app bootstrapping or domain plugins (for example content/media).

## Key exports

- contracts: `namespace-context`, `plugin-manifest`, `plugin-runtime`, `db-adapter`, `authz-service`
- runtime: `validatePluginManifest`, `assertPluginCompatibility`, `InMemoryPluginRuntime`
- runtime health: `KernelHealthService`
- http module: `KernelHealthHttpModule` (`/health`, `/health/dependencies`)
- persistence: `EntityRegistry`, `MongoDbAdapter`, `createMongoDbAdapter`
- errors: `CoreError`, `PluginManifestError`, `PluginCompatibilityError`, `PluginRuntimeError`
- tokens: `CORE_TOKENS`

Runtime highlights:

- strict plugin state machine
- lifecycle rollback on load/init/unload failures
- `loadMany(...)` with dependency-aware ordering
- `describeDependencies()` snapshot with optional-dependency warnings
- `KernelHealthService.snapshot()` for runtime + dependency + db aggregated health

Data model policy:

- plugins declare entity schema once via `@trinacria/schema`
- plugins declare logical indexes in entity definition
- storage adapter translates index declarations to backend-specific commands
- plugin repositories stay storage-agnostic

HTTP integration:

- register `KernelHealthHttpModule` in your Trinacria app
- ensure `createHttpPlugin(...)` is configured in the app
- expose:
  - `GET /health`
  - `GET /health/dependencies`

## Stability policy

`kernel` contracts are compatibility-critical. Breaking changes should be rare and explicitly versioned.

## Scripts

```bash
npm run dev -w @trinacria-cms/kernel
npm run build -w @trinacria-cms/kernel
npm run typecheck -w @trinacria-cms/kernel
```

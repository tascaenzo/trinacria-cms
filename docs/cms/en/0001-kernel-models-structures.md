# 0001 - Kernel: fundamentals, contracts, and public API

## Goal

Understand what the kernel exposes, why it exposes it, and how plugin developers should use those public boundaries.

## Package map

Path: `packages/kernel/src`

Main areas:

- `contracts`: public interfaces (`PluginRuntime`, `DbAdapter`, `CmsStarterOptions`, ...)
- `runtime`: concrete implementations (`InMemoryPluginRuntime`, `MongoDbAdapter`, starter, health)
- `errors`: typed error model
- `tokens`: stable DI integration points
- `http`: cross-cutting HTTP helpers/controllers
- `index.ts`: public entrypoint and re-exports

## Public entrypoint strategy

`packages/kernel/src/index.ts` exports:

- kernel APIs (`contracts`, `runtime`, `errors`, `tokens`, `http`)
- re-exports from `@trinacria/core`, `@trinacria/http`, `@trinacria/schema`

Reason:

- plugin developers import from one package (`@trinacria-cms/kernel`)
- lower friction and fewer scattered imports

## Core contracts

### 1. Namespace context

File: `contracts/namespace-context.ts`

- `NamespaceContext` includes `pluginId` (optional `workspaceId`)
- `buildNamespaceKey(context)` builds canonical isolation keys

Why it matters:

- prevents cross-plugin collisions
- provides a foundation for multi-namespace extensions

### 2. Plugin manifest

File: `contracts/plugin-manifest.ts`

Main fields:

- `id`
- `version`
- `requiresCore`
- `capabilities[]`
- `dependencies[]` (with `optional` + `versionRange`)
- `security` (declarative `permissions`, `roles`, `grants`)

Why it matters:

- compatibility becomes machine-verifiable
- dependency graph and load order become deterministic

### 3. Plugin runtime

File: `contracts/plugin-runtime.ts`

Main operations:

- `register`, `load`, `unload`, `reload`, `loadMany`, `disable`, `unregister`, `list`, `describeDependencies`

States:

- `registered`, `loading`, `initializing`, `loaded`, `unloading`, `failed`, `disabled`, `unloaded`

Why it matters:

- explicit lifecycle contract
- predictable behavior for operations and troubleshooting

### 4. Persistence abstraction

File: `contracts/db-adapter.ts`

Core abstractions:

- `DbAdapter`
- `DbRepository`
- `DbQuery`
- `DbTransaction`

Why it matters:

- domain modules remain storage-agnostic
- adapters can evolve without rewriting business logic

### 5. API contract

File: `contracts/api-contract.ts`

Envelope shape:

- success: `{ data, meta? }`
- error: `{ error, meta? }`

Common metadata:

- `pluginId`, `count`, `limit`, `offset`, `nextCursor`

Why it matters:

- client and SDK behavior stays consistent
- plugin origin is always discoverable in responses

### 6. CMS starter contract

File: `contracts/cms-starter.ts`

Defines minimal app bootstrap:

- HTTP/OpenAPI config
- Swagger UI config
- extra modules
- global providers
- plugins and autoload
- automatic manifest provisioning on load/unregister when a `PluginManifestProvisioner` is available

Why it matters:

- one consistent bootstrap path for all environments

## Integration tokens

File: `tokens/core-tokens.ts`

Important tokens:

- `CORE_TOKENS.PLUGIN_RUNTIME`
- `CORE_TOKENS.DB_ADAPTER`
- `CORE_TOKENS.ENTITY_REGISTRY`
- `CORE_TOKENS.AUTHZ_SERVICE`
- `CORE_TOKENS.PLUGIN_MANIFEST_PROVISIONER`
- `CORE_TOKENS.KERNEL_HEALTH_SERVICE`
- `CORE_TOKENS.LOGGER`

Best practice:

- bind to tokens, not concrete classes, to preserve decoupling.

## Typed error model

Kernel uses semantic errors:

- `PluginManifestError`
- `PluginCompatibilityError`
- `PluginDependencyError`
- `PluginLifecycleError`
- `PluginStateTransitionError`
- `DbAdapterError`

Benefit:

- clearer failure handling and better operations visibility.

## Entity declaration and registry

`runtime/entity-registry.ts` provides:

- `defineEntity({ entityName, schema, indexes })`
- `EntityRegistry.register/get`

Benefit:

- canonical schema + index metadata in one declaration
- avoids schema/entity duplication

## Kernel HTTP helpers

File: `http/api-http-utils.ts`

Key utilities:

- `createPluginApiResponder(pluginId)`
- `parseQueryNumber(...)`
- `toApiErrorResponse(...)`
- `toOpenApiSchema(...)`

Architectural effect:

- thinner controllers
- consistent API envelopes across plugins

## Conclusion

The kernel enforces platform rules and provides shared infrastructure. Plugins should keep their focus on domain behavior while relying on kernel contracts for runtime, API consistency, and persistence integration.

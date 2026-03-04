# 0003 - Runtime deep dive: state machine, dependency graph, rollback

This chapter analyzes how plugin lifecycle orchestration works in practice.

## Core runtime files

- `in-memory-plugin-runtime.ts`
- `plugin-manifest-validation.ts`
- `semver.ts`
- `trinacria-module-bridge.ts`
- `kernel-health-service.ts`
- `cms-starter.ts`

## Internal runtime state

From code:

```ts
private readonly records = new Map<string, PluginRuntimeRecord>();
private readonly definitions = new Map<string, KernelPluginDefinition>();
private readonly pluginModules = new Map<string, readonly ModuleDefinition[]>();
private readonly activeLoads = new Set<string>();
```

Interpretation:

- `records`: runtime state store.
- `definitions`: catalog of registered plugin definitions.
- `pluginModules`: loaded module trace (for unload/rollback).
- `activeLoads`: per-plugin load lock.

## State machine

`ALLOWED_TRANSITIONS` defines valid state transitions.

Why it matters:

- invalid lifecycle actions fail deterministically (`PluginStateTransitionError`).

## Register pipeline

`register` performs:

1. normalize definition
2. validate manifest
3. check core compatibility
4. check dependency cycles
5. store as `registered`

## Load pipeline

`load` performs:

1. state pre-checks
2. required dependency checks
3. recursive dependency load
4. transition to `loading`
5. runtime module registration via bridge
6. `onLoad`
7. transition to `initializing`
8. `onInit`
9. final state `loaded`

## Rollback model

On load failure:

- run compensating `onUnload` (if needed)
- unregister loaded modules
- mark plugin as `failed`
- throw `PluginLifecycleError`

## Dependency graph logic

- cycle detection during registration
- topological sorting in `loadMany`
- explicit graph snapshot via `describeDependencies`

Status values include `ok`, `missing`, `disabled`, `version-mismatch`.

## Bridge to Trinacria modules

`TrinacriaModuleBridge` handles:

- ordered module registration
- reverse-order unregistration
- rollback on registration failures

## Health aggregation

`KernelHealthService` combines:

- plugin runtime states
- dependency graph status
- DB health

Final status classification: `ok`, `degraded`, `down`.

## Starter boundary

`startCmsApp` is the host-app boundary:

- bootstraps Trinacria app
- wires runtime tokens
- registers and optionally autoloads plugins

## Runtime state persistence (`PluginRuntimeStore`)

The runtime now uses an abstract `PluginRuntimeStore` to persist installed plugin state.

Operational flow:

1. `register` -> upsert state `registered`
2. `load` -> upsert state `loaded` (or `failed` on errors)
3. `disable` -> upsert state `disabled` (passing through `unloaded` when previously loaded)
4. `unregister` -> remove persisted record

Available implementations:

- `InMemoryPluginRuntimeStore` (fallback when no DB is available)
- `DbPluginRuntimeStore` (uses `DbAdapter`, collection `installed_plugins`)
- `DeferredPluginRuntimeStore` (lazy store resolution in starter bootstrap)

Result:

- runtime state is operationally durable and queryable, not only process-local memory.

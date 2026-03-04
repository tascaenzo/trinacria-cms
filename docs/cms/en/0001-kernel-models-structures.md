# 0001 - Kernel: Models and Structures (v0.1)

## Goal

Describe the baseline models and structures introduced in the `@trinacria-cms/kernel` kernel during the initial project phase.

This version covers only **contracts** (interfaces and types), not full runtime implementations.

## Reference architecture decision

The baseline is defined by:

- [ADR-001: Boundaries between kernel and core-pack](../../adr/ADR-001-core-boundaries.md)

Summary:

- `kernel` contains runtime and platform contracts.
- `core-pack` contains default implementations (users/roles/permissions/settings).

## Structures introduced in the kernel package

Source path:

- `packages/kernel/src/contracts`

### 1) Namespace context

File:

- `packages/kernel/src/contracts/namespace-context.ts`

Models:

- `NamespaceContext`
  - `pluginId`: identifies the plugin owning resources.
  - `workspaceId?`: enables multi-tenant/workspace scoping.
- `buildNamespaceKey(context)`
  - builds a canonical namespace key for storage/cache/metrics.

Why it exists:

- prevents cross-plugin collisions;
- prepares the kernel for tenant/workspace data isolation.

### 2) Plugin manifest

File:

- `packages/kernel/src/contracts/plugin-manifest.ts`

Models:

- `PluginManifest`
  - `id`, `version`, `requiresCore`
  - `capabilities?`
  - `dependencies?`
- `PluginManifestDependency`
  - `pluginId`, `versionRange`, `optional?`

Why it exists:

- defines the minimum contract of an installable plugin;
- enables compatibility and dependency validation.

### 3) Plugin runtime contract

File:

- `packages/kernel/src/contracts/plugin-runtime.ts`

Models:

- `PluginState`
  - `registered | loaded | failed | disabled | unloaded`
- `PluginRuntimeRecord`
  - runtime plugin state snapshot (`manifest`, `state`, `loadedAt`, `lastError`)
- `PluginRuntime`
  - minimal API: `register`, `load`, `unload`, `disable`, `list`

Why it exists:

- formalizes runtime plugin lifecycle;
- defines the public surface for registry/orchestrator implementation.

### 4) DB abstraction

File:

- `packages/kernel/src/contracts/db-adapter.ts`

Models:

- `DbQuery<TData>`
- `DbRepository<TData>`
- `DbTransaction`
- `DbAdapter`

Why it exists:

- decouples the kernel from concrete databases;
- enables MongoDB persistence via Mongoose while keeping core services decoupled.

### 5) Authorization contract

File:

- `packages/kernel/src/contracts/authz-service.ts`

Models:

- `AuthorizationRequest`
- `AuthorizationResult`
- `AuthzService`

Why it exists:

- provides a single authorization contract for kernel and plugins;
- ties permission checks to explicit namespace/workspace context.

### 6) Public contract exports

Files:

- `packages/kernel/src/contracts/index.ts`
- `packages/kernel/src/index.ts`

Why it exists:

- exposes stable kernel contracts v0.1;
- avoids direct imports from non-versioned internal paths.

## Implementation status

Completed:

- architecture boundary definition (`kernel` vs `core-pack`);
- minimum contracts v0.1 in `packages/kernel/src/contracts`;
- TSDoc comments on key models.

Not completed yet:

- concrete runtime plugin registry implementation;
- lifecycle orchestration with rollback;
- concrete DB adapter implementations;
- concrete authz/rbac implementation.

## Next step

Proceed with the kernel runtime skeleton (next step in the plan):

- `runtime`, `errors`, `tokens` folders;
- first placeholder implementations aligned with the contracts defined here.

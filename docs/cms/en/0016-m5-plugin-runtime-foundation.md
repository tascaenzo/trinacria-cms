# 0016 - M5 Plugin runtime foundation

This page is the developer entry point for the M5 runtime. It explains how to
read the runtime specifications, which contracts are already available, and how
to extend them without breaking runtime semantics.

## Milestone goal

M5 must make the plugin runtime operational:

- configured discovery
- manifest and compatibility validation
- dependency ordering
- load/unload/reload
- enable/disable
- persisted runtime state
- readable diagnostics
- aligned API, SDK, and backoffice

Current state: these blocks are available and covered by M5 checks; any
extension must keep runtime, OpenAPI, SDK, and backoffice aligned.

M5 does not implement editorial domains, content types, or publishing workflows.

## Read before coding

1. [`../specs/core-platform/m5-plugin-runtime-implementation.md`](../specs/core-platform/m5-plugin-runtime-implementation.md)
2. [`../specs/core-platform/plugin-runtime.md`](../specs/core-platform/plugin-runtime.md)
3. [`../specs/core-platform/plugin-packaging-discovery.md`](../specs/core-platform/plugin-packaging-discovery.md)
4. [`../specs/core-platform/plugin-contract.md`](../specs/core-platform/plugin-contract.md)
5. [`../specs/core-platform/namespace-governance.md`](../specs/core-platform/namespace-governance.md)
6. [`0015-plugin-operations-and-troubleshooting.md`](./0015-plugin-operations-and-troubleshooting.md)

## Main files

Kernel contracts:

- `packages/kernel/src/contracts/plugin-runtime.ts`
- `packages/kernel/src/contracts/plugin-runtime-store.ts`
- `packages/kernel/src/contracts/plugin-discovery.ts`
- `packages/kernel/src/contracts/plugin-manifest.ts`

Kernel runtime:

- `packages/kernel/src/runtime/in-memory-plugin-runtime.ts`
- `packages/kernel/src/runtime/plugin-runtime-store.ts`
- `packages/kernel/src/runtime/plugin-discovery-service.ts`
- `packages/kernel/src/runtime/plugin-contribution-registry.ts`
- `packages/kernel/src/runtime/plugin-manifest-validation.ts`
- `packages/kernel/src/runtime/plugin-namespace.ts`
- `packages/kernel/src/runtime/cms-starter.ts`

API and admin:

- `packages/kernel/src/runtime/kernel-system-service.ts`
- `packages/kernel/src/http/kernel-system.controller.ts`
- `packages/sdk/src/runtime/**`
- `packages/admin-kernel/src/pages/plugins-page.tsx`
- `packages/admin-kernel/src/pages/plugin-contributions-page.tsx`

## Recommended sequence

1. Runtime state machine and available operations.
2. Dependency graph and stable ordering.
3. Discovery, registration, and autoload.
4. Runtime store rehydration.
5. Failure handling and contribution rollback.
6. API, OpenAPI, and SDK alignment.
7. Backoffice plugin operations.
8. Troubleshooting and changelog updates.

This is the order used to close M5. For new extensions, keep the same sequence:
runtime/API first, then SDK, then admin, then docs.

## Developer rules

- The backend decides operation availability; the UI only renders that decision.
- `loaded` is the only state where contributions are visible.
- `disabled` is a persisted operator choice, not a runtime error.
- `failed` must be diagnosable and recoverable.
- Optional dependencies do not block load, but they must produce warnings.
- Required dependencies that are missing, disabled, or version-mismatched block
  load.
- Bootstrap must not fail because a single plugin fails.
- Partial contributions must be removed after a failed load.
- Plugin events should be read through `GET /v1/system/plugins/:pluginId/events?limit=20`
  or through the SDK with `query.limit`.

## Minimum checks

Kernel:

```bash
npm run typecheck -w @trinacria-cms/kernel
npm run test -w @trinacria-cms/kernel
npm run build -w @trinacria-cms/kernel
```

SDK:

```bash
npm run build -w @trinacria-cms/sdk
npm run test -w @trinacria-cms/sdk
```

Backoffice:

```bash
npm run build -w @trinacria-cms/admin-kernel
npm run build -w @trinacria-cms/backoffice
```

Mongo integration:

```bash
TRINACRIA_RUN_MONGO_INTEGRATION=1 npm run test:integration -w @trinacria-cms/kernel
```

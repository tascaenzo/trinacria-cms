# 0002 - Kernel file-by-file (contracts, errors, tokens, http)

This chapter breaks down the main kernel files and explains why each one exists.

## Contracts (`packages/kernel/src/contracts`)

- `api-contract.ts`: standard API envelopes (`success`, `error`).
- `authz-service.ts`: authorization contract (`can`, `assert`) with namespace-aware context.
- `cms-starter.ts`: startup contract for bootstrapping CMS apps.
- `db-adapter.ts`: storage-agnostic persistence port.
- `namespace-context.ts`: canonical isolation context and namespace key.
- `plugin-manifest.ts`: plugin metadata contract.
- `plugin-runtime.ts`: runtime lifecycle interface and state model.

Example from code:

```ts
export interface DbAdapter {
  repository<TData = unknown>(
    entityName: string,
    context: NamespaceContext,
  ): DbRepository<TData>;
  beginTransaction(context: NamespaceContext): Promise<DbTransaction>;
  healthCheck(): Promise<{ ok: true } | { ok: false; reason: string }>;
}
```

## Errors (`packages/kernel/src/errors`)

- `core-error.ts`: typed base error with stable `code` and optional `details`.
- `plugin-errors.ts`: semantic plugin errors (manifest, compatibility, lifecycle, dependencies, transitions).
- `db-errors.ts`: storage/adapter-specific typed errors.

Why it matters:

- operational tooling can reason on error codes instead of free-form strings.

## Tokens (`packages/kernel/src/tokens`)

- `core-tokens.ts`: official DI integration points (`PLUGIN_RUNTIME`, `DB_ADAPTER`, `ENTITY_REGISTRY`, ...).
- `capability-tokens.ts`: validated token factory for capability exports.

Example from code:

```ts
export const CORE_TOKENS = {
  PLUGIN_RUNTIME: createToken<PluginRuntime>("CMS_CORE_PLUGIN_RUNTIME"),
  DB_ADAPTER: createToken<DbAdapter>("CMS_CORE_DB_ADAPTER"),
  ENTITY_REGISTRY: createToken<EntityRegistry>("CMS_CORE_ENTITY_REGISTRY"),
} as const;
```

## HTTP helpers (`packages/kernel/src/http`)

- `api-http-utils.ts`: responder helpers, query parsing, error mapping.
- `kernel-health.controller.ts`: `/health` and `/health/dependencies`.
- `cms-swagger.controller.ts`: `/docs` UI with `excludeFromOpenApi`.
- `kernel-health.module.ts`: DI wiring for health service and controller.

## Type augmentation (`packages/kernel/src/types`)

- `trinacria-http.d.ts`: local augmentation for route docs typing and context typing.

## Public entrypoint

- `packages/kernel/src/index.ts`: exports contracts/runtime/errors/tokens/http and re-exports Trinacria packages.

Design impact:

- plugin developers import from a single package (`@trinacria-cms/kernel`).

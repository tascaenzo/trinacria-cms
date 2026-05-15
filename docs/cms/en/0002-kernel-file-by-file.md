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
  repository<TData = unknown>(entityName: string, context: NamespaceContext): DbRepository<TData>;
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
  AUTHZ_SERVICE: createToken<AuthzService>("CMS_CORE_AUTHZ_SERVICE"),
  KERNEL_HEALTH_SERVICE: createToken<KernelHealthService>("CMS_KERNEL_HEALTH_SERVICE"),
  KERNEL_SYSTEM_SERVICE: createToken<KernelSystemService>("CMS_KERNEL_SYSTEM_SERVICE")
} as const;
```

## HTTP helpers (`packages/kernel/src/http`)

- `api-http-utils.ts`: responder helpers, query parsing, error mapping.
- `kernel-health.controller.ts`: `/health` and `/health/dependencies`.
- `cms-swagger.controller.ts`: `/docs` UI with `excludeFromOpenApi`.
- `kernel-health.module.ts`: DI wiring for health service and controller.

Response envelope model:

```ts
const responder = createPluginApiResponder("core-pack");

return responder.success({ id: "core-pack:users:123" });
// {
//   data: { id: "core-pack:users:123" },
//   meta: { pluginId: "core-pack" }
// }

return responder.list([{ id: "1" }, { id: "2" }], {
  limit: 20,
  offset: 0
});
// {
//   data: [{ id: "1" }, { id: "2" }],
//   meta: { pluginId: "core-pack", count: 2, limit: 20, offset: 0 }
// }

return responder.notFound('User "x" not found');
// {
//   error: { code: "not_found", message: "User \"x\" not found" },
//   meta: { pluginId: "core-pack" }
// }
```

Field meaning:

- `data`: business payload on success
- `error.code`: stable machine-facing error code
- `error.message`: human-readable message
- `error.details`: optional structured diagnostics
- `meta.pluginId`: plugin that produced the response
- `meta.count`: number of items in list responses
- `meta.limit` / `meta.offset`: pagination echo when relevant
- `requestId`: part of the contract, but not auto-populated by the kernel yet

How a response is generated:

1. controller validates path/query/body;
2. it invokes the domain service;
3. it uses `createPluginApiResponder(pluginId)`;
4. the responder injects the standard envelope and `meta.pluginId`;
5. `fromError(...)` maps typed or generic exceptions to `ApiErrorResponse`.

Operational exception:

- `/health` and `/health/dependencies` are operational endpoints;
- they intentionally return raw operational payloads instead of the business `data/meta/error` envelope.

- `kernel-system.controller.ts` + `kernel-system-service.ts`: built-in runtime discovery endpoints.

Exposed endpoints:

- `GET /v1/system/plugins`
- `GET /v1/system/capabilities`

Exported service:

- `CORE_TOKENS.KERNEL_SYSTEM_SERVICE`

Why they matter:

- the published SDK includes official API groups, but a real CMS instance may not have every official plugin installed;
- discovery allows SDKs, admin UIs, and CLIs to inspect the actual runtime surface before enabling features.

## Type augmentation (`packages/kernel/src/types`)

- `trinacria-http.d.ts`: local augmentation for route docs typing and context typing.

## Public entrypoint

- `packages/kernel/src/index.ts`: exports contracts/runtime/errors/tokens/http and re-exports Trinacria packages.

Design impact:

- plugin developers import from a single package (`@trinacria-cms/kernel`).

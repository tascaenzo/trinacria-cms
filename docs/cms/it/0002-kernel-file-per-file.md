# 0002 - Kernel file per file (contracts, errors, tokens, http)

Questo capitolo entra nel dettaglio dei file principali del kernel e include esempi presi dal codice reale.

## 1. Cartella `contracts/`

### `contracts/api-contract.ts`

Ruolo:

- definisce envelope API standard (`success` e `error`).

Esempio dal codice reale:

```ts
export function apiSuccess<TData>(
  data: TData,
  meta?: ApiResponseMeta,
): ApiSuccessResponse<TData> {
  return meta ? { data, meta } : { data };
}

export function apiError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  meta?: ApiResponseMeta,
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    ...(meta ? { meta } : {}),
  };
}
```

Perche esiste:

- garantisce formato uniforme tra tutti i controller plugin.

### `contracts/db-adapter.ts`

Ruolo:

- astrazione persistence storage-agnostic.

Esempio dal codice reale:

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

Perche esiste:

- il modulo dominio non deve dipendere da Mongo/Mongoose.

### `contracts/plugin-runtime.ts`

Ruolo:

- contratto pubblico lifecycle plugin.

Esempio dal codice reale:

```ts
export interface PluginRuntime {
  register(plugin: PluginManifest | KernelPluginDefinition): Promise<void>;
  load(pluginId: string): Promise<void>;
  unload(pluginId: string): Promise<void>;
  reload(pluginId: string): Promise<void>;
  loadMany(pluginIds?: readonly string[]): Promise<void>;
  disable(pluginId: string, reason?: string): Promise<void>;
  list(): readonly PluginRuntimeRecord[];
  describeDependencies(): PluginDependencyGraphSnapshot;
}
```

Perche esiste:

- separa API runtime da implementazione concreta.

## 2. Cartella `errors/`

### `errors/core-error.ts`

Esempio dal codice reale:

```ts
export class CoreError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    options?: {
      cause?: unknown;
      details?: Record<string, unknown>;
    },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = code;
    this.details = options?.details;
  }
}
```

Logica teorica:

- modello errore semantico: ogni errore e classificato per codice stabile.

### `errors/plugin-errors.ts`

Ruolo:

- specializza errori per manifest, compatibilita, dipendenze, lifecycle.

Conseguenza pratica:

- API e observability possono distinguere root cause senza parsing stringhe.

## 3. Cartella `tokens/`

### `tokens/core-tokens.ts`

Esempio dal codice reale:

```ts
export const CORE_TOKENS = {
  PLUGIN_RUNTIME: createToken<PluginRuntime>("CMS_CORE_PLUGIN_RUNTIME"),
  DB_ADAPTER: createToken<DbAdapter>("CMS_CORE_DB_ADAPTER"),
  ENTITY_REGISTRY: createToken<EntityRegistry>("CMS_CORE_ENTITY_REGISTRY"),
  AUTHZ_SERVICE: createToken<AuthzService>("CMS_CORE_AUTHZ_SERVICE"),
  KERNEL_HEALTH_SERVICE: createToken<KernelHealthService>(
    "CMS_KERNEL_HEALTH_SERVICE",
  ),
} as const;
```

Logica teorica:

- il token e il nodo di un grafo DI; i provider sono archi che risolvono dipendenze.

### `tokens/capability-tokens.ts`

Esempio dal codice reale:

```ts
const CAPABILITY_REGEX = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

export function createCapabilityToken<T>(capabilityName: string): Token<T> {
  const normalized = capabilityName.trim();
  if (!normalized || !CAPABILITY_REGEX.test(normalized)) {
    throw new Error(
      `Invalid capability name "${capabilityName}". Expected lowercase dot/underscore/dash segments.`,
    );
  }
  return createToken<T>(`CMS_CAPABILITY_${normalized}`);
}
```

Perche serve:

- governance naming capability in ecosistemi plugin grandi.

## 4. Cartella `http/`

### `http/api-http-utils.ts`

Esempio dal codice reale:

```ts
export function createPluginApiResponder(pluginId: string): PluginApiResponder {
  const pluginMeta: ApiResponseMeta = { pluginId };

  return {
    success<TData>(data: TData, meta?: ApiResponseMeta) {
      return apiSuccess(data, {
        ...pluginMeta,
        ...(meta ?? {}),
      });
    },
    fromError(error: unknown) {
      const mapped = toApiErrorResponse(error);
      return {
        ...mapped,
        meta: {
          ...pluginMeta,
          ...(mapped.meta ?? {}),
        },
      };
    },
  };
}
```

Perche serve:

- uniforma meta/pluginId e mapping errori in tutti i controller plugin.

### `http/kernel-health.controller.ts`

Esempio dal codice reale:

```ts
routes() {
  return this.router()
    .get("/health", this.getHealth)
    .get("/health/dependencies", this.getDependencies)
    .build();
}
```

Perche serve:

- espone stato runtime e grafo dipendenze come primitive operative.

### `http/cms-swagger.controller.ts`

Esempio dal codice reale:

```ts
.get(this.config.path ?? "/docs", this.renderDocs, {
  docs: {
    excludeFromOpenApi: true,
  },
})
```

Perche serve:

- endpoint docs non appare nel contratto business OpenAPI.

## 5. Cartella `types/`

### `types/trinacria-http.d.ts`

Ruolo:

- type augmentation di `@trinacria/http` (RouteBuilder, docs metadata, HttpContext).

Perche importante:

- migliora type safety senza dover forkare la libreria HTTP.

## 6. `index.ts` root

Esempio dal codice reale:

```ts
export * from "./contracts/index.js";
export * from "./errors/index.js";
export * from "./http/index.js";
export * from "./runtime/index.js";
export * from "./tokens/index.js";

export * from "@trinacria/http";
export * from "@trinacria/schema";
```

Perche importante:

- API surface unico per plugin developer.

## 7. Collegamento teorico rapido

- `contracts/*` = algebra delle interfacce.
- `tokens/*` = grafo DI.
- `errors/*` = tassonomia failure.
- `http/*` = adapter di trasporto uniforme.

Questa separazione e la base per un framework estendibile nel tempo.

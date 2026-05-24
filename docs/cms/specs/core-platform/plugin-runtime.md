# Plugin runtime core

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `low-level`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-23`

Nota M5: questa specifica e la base normativa di
`M5 - Plugin Runtime Foundation`. La sequenza implementativa e descritta in
[`m5-plugin-runtime-implementation.md`](./m5-plugin-runtime-implementation.md).

## Decisione

Il runtime plugin governa registrazione, load, init, unload, reload, disable,
enable, dependency ordering, rollback e persistenza stato.

## Responsabilita

| Area             | Owner             | Responsabilita             |
| ---------------- | ----------------- | -------------------------- |
| State machine    | `kernel`          | Stati e transizioni valide |
| Dependency graph | `kernel`          | Ordinamento e diagnostica  |
| Lifecycle hooks  | `kernel` + plugin | Esecuzione hook plugin     |
| Runtime store    | `kernel`          | Persistenza stato runtime  |
| Operations API   | `kernel`          | Endpoint operativi         |
| Admin operations | `admin-kernel`    | UI e feedback              |

## Modello dati

Stati:

```text
registered
loading
initializing
loaded
unloading
unloaded
failed
disabled
```

Operazioni:

```text
load
unload
reload
disable
enable
unregister
loadMany
```

## Contratti TypeScript target

```ts
export interface PluginRuntime {
  register(plugin: CmsPluginManifest | CmsPluginDefinition): Promise<void>;
  load(pluginId: string): Promise<void>;
  unload(pluginId: string): Promise<void>;
  reload(pluginId: string): Promise<void>;
  disable(pluginId: string, reason?: string): Promise<void>;
  enable(pluginId: string): Promise<void>;
  unregister(pluginId: string): Promise<void>;
  loadMany(pluginIds?: readonly string[]): Promise<void>;
  list(): readonly PluginRuntimeRecord[];
  describeContributions(): PluginContributionCatalogSnapshot;
  events(options?: PluginRuntimeEventsOptions): readonly PluginRuntimeEvent[];
}
```

## API HTTP target

Riusa le API definite in `plugin-contract.md`:

- `GET /v1/system/plugins`
- `GET /v1/system/plugins/{pluginId}`
- `GET /v1/system/plugin-contributions`
- `POST /v1/system/plugins/{pluginId}/operations`
- `GET /v1/system/plugins/{pluginId}/events`

## DTO request/response

```ts
export interface PluginRuntimeDto {
  id: string;
  version: string;
  state: PluginState;
  loadedAt?: string;
  failedAt?: string;
  failureCount?: number;
  lastFailurePhase?: string;
  disabledAt?: string;
  disabledReason?: string;
  statusReason?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  capabilities: string[];
  dependencies: PluginDependencyDto[];
  availableOperations: PluginOperationAvailabilityDto[];
}

export interface PluginDependencyDto {
  pluginId: string;
  versionRange: string;
  optional: boolean;
  status: "ok" | "missing" | "disabled" | "version-mismatch";
  currentVersion?: string;
}

export interface PluginOperationAvailabilityDto {
  operation: "load" | "unload" | "reload" | "disable" | "enable";
  available: boolean;
  reason?: string;
}

export interface PluginOperationRequestDto {
  operation: "load" | "unload" | "reload" | "disable" | "enable";
  reason?: string;
}

export interface PluginRuntimeEventDto {
  id: string;
  pluginId: string;
  action: string;
  phase: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}
```

Tutte le response usano `ApiSuccessResponse<T>` o `ApiErrorResponse`.

## Storage Mongo

Collections:

- `cms_kernel_plugin_runtime`
- `cms_kernel_plugin_runtime_events`

Retention consigliata runtime events:

- default 30 giorni o 1.000 eventi per plugin
- configurabile via configuration registry

### Test di persistenza runtime

Il runtime store deve essere verificato su due livelli:

- contract test veloci su `InMemoryPluginRuntimeStore` e `DbPluginRuntimeStore`
  con double DB, per coprire transizioni, idempotenza, ordinamento e cleanup dei
  campi opzionali;
- integration test Mongo reale per i casi limite di produzione: `$set`/`$unset`,
  serializzazione date/errori, unique index, restart e persistenza cross-process.

Il test Mongo reale e gated da ambiente e si lancia con:

```bash
TRINACRIA_RUN_MONGO_INTEGRATION=1 npm run test:integration -w @trinacria-cms/kernel
```

## Security e permission

### Accesso

| Operazione | Permission                  | Chi puo fare |
| ---------- | --------------------------- | ------------ |
| read/list  | `core-pack:plugins:read`    | admin bearer |
| load       | `core-pack:plugins:operate` | admin bearer |
| unload     | `core-pack:plugins:operate` | admin bearer |
| reload     | `core-pack:plugins:operate` | admin bearer |
| disable    | `core-pack:plugins:operate` | admin bearer |
| enable     | `core-pack:plugins:operate` | admin bearer |

### Regole

1. Solo operatori con `core-pack:plugins:operate` possono eseguire operazioni mutative.
2. Un plugin non puo operare su se stesso tramite API.
3. Il backoffice mostra stato e operazioni disponibili ma non ha accesso diretto al runtime store.
4. Ogni operazione mutativa produce audit event.
5. I runtime events sono leggibili da admin con `core-pack:plugins:read`.

### Audit

Ogni operazione su plugin genera:

- evento di audit con attore, operazione, plugin target, esito
- persistenza in `cms_core_audit_events`
- retention: 90 giorni default

## Eventi

### Eventi di runtime

| Nome canonico            | Owner  | Visibility  | Delivery | Quando              |
| ------------------------ | ------ | ----------- | -------- | ------------------- |
| `core.plugin.registered` | kernel | `audit`     | `sync`   | plugin registrato   |
| `core.plugin.loaded`     | kernel | `public`    | `sync`   | plugin caricato     |
| `core.plugin.failed`     | kernel | `protected` | `sync`   | plugin in failure   |
| `core.plugin.disabled`   | kernel | `audit`     | `sync`   | plugin disabilitato |
| `core.plugin.unloaded`   | kernel | `audit`     | `sync`   | plugin scaricato    |
| `core.plugin.enabled`    | kernel | `audit`     | `sync`   | plugin riabilitato  |

### Payload

```ts
export interface RuntimeEventPayload {
  pluginId: string;
  state: string;
  previousState?: string;
  phase?: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  details?: Record<string, unknown>;
  actorId?: string;
  timestamp: string;
}
```

### Delivery e retry

- Tutti gli eventi runtime sono `sync` (in-process).
- Nessun retry automatico: se un subscriber fallisce, l'errore viene loggato ma non blocca il producer.
- Idempotency: non richiesta per eventi runtime diagnostici.
- Audit policy: eventi `audit` vengono persistiti in `cms_core_audit_events`. Eventi `public`/`protected` sono disponibili solo in-memory durante il lifecycle del plugin.

## Errori

| Code                             | HTTP | Quando              |
| -------------------------------- | ---- | ------------------- |
| `plugin_not_found`               | 404  | plugin assente      |
| `plugin_operation_not_available` | 409  | stato incompatibile |
| `plugin_dependency_missing`      | 409  | dipendenza assente  |
| `plugin_dependency_cycle`        | 409  | ciclo dipendenze    |
| `plugin_lifecycle_hook_failed`   | 500  | hook fallito        |

## Lifecycle

Register:

1. validate manifest
2. validate core compatibility
3. validate dependency graph
4. materialize manifest contributions in the runtime catalog
5. persist runtime record

Load:

1. validate manifest
2. validate dependencies
3. validate namespace/collision
4. register modules
5. run `onLoad`
6. run `onInit`
7. run platform hooks
8. persist `loaded`

Unload:

1. reject if required dependents loaded
2. run `onUnload`
3. unregister modules
4. persist `unloaded`

## Compatibilita e versioning

- State names (`registered`, `loading`, `initializing`, `loaded`, `unloading`, `unloaded`, `failed`, `disabled`) sono contratto pubblico per API/SDK/admin.
- Aggiunte future di nuovi stati devono essere additive o versionate.
- Nuove operazioni possono essere aggiunte senza breaking change.
- Rimuovere o rinominare uno stato esistente e breaking.
- `PluginRuntimeDto` puo ricevere nuovi campi opzionali. Rimozione o rename di campi esistenti e breaking.
- I codici errore sono parte del contratto pubblico e non possono essere rimossi senza major version.

## Acceptance criteria

- state machine e operazioni sono complete
- permission operative sono definite
- storage ed eventi runtime sono definiti
- rollback e failure phase sono espliciti

## Out of scope

- hot reload automatico filesystem
- cluster distributed runtime
- plugin marketplace

## Gap rispetto al codice attuale

- Runtime base, event log e operations API esistono.
- Il runtime espone un catalogo contributi derivato dal manifest.
- Il catalogo contributi e disponibile tramite `GET /v1/system/plugin-contributions`.
- Mancano ancora consumer operativi per entity/settings/event/admin contribution.

## Mapping M5

Questa specifica viene implementata in M5 tramite:

- `2026-05-23-m5-runtime-state-machine.md`
- `2026-05-23-m5-dependency-graph-ordering.md`
- `2026-05-23-m5-runtime-store-rehydration.md`
- `2026-05-23-m5-failure-rollback-events.md`
- `2026-05-23-m5-api-openapi-sdk.md`

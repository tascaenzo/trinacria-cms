# Plugin runtime core

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-20`

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
  events(options?: PluginRuntimeEventsOptions): readonly PluginRuntimeEvent[];
}
```

## API HTTP target

Riusa le API definite in `plugin-contract.md`:

- `GET /v1/system/plugins`
- `GET /v1/system/plugins/{pluginId}`
- `POST /v1/system/plugins/{pluginId}/operations`
- `GET /v1/system/plugins/{pluginId}/events`

## DTO request/response

`PluginRuntimeDto`, `PluginOperationRequestDto`, `PluginRuntimeEventDto`.

## Storage Mongo

Collections:

- `cms_kernel_plugin_runtime`
- `cms_kernel_plugin_runtime_events`

Retention consigliata runtime events:

- default 30 giorni o 1.000 eventi per plugin
- configurabile via configuration registry

## Security e permission

| Operazione | Permission                  |
| ---------- | --------------------------- |
| read/list  | `core-pack:plugins:read`    |
| load       | `core-pack:plugins:operate` |
| unload     | `core-pack:plugins:operate` |
| reload     | `core-pack:plugins:operate` |
| disable    | `core-pack:plugins:operate` |
| enable     | `core-pack:plugins:operate` |

## Eventi

| Evento                   | Visibility  |
| ------------------------ | ----------- |
| `core.plugin.registered` | `audit`     |
| `core.plugin.loaded`     | `public`    |
| `core.plugin.failed`     | `protected` |
| `core.plugin.disabled`   | `audit`     |
| `core.plugin.unloaded`   | `audit`     |

## Errori

| Code                             | HTTP | Quando              |
| -------------------------------- | ---- | ------------------- |
| `plugin_not_found`               | 404  | plugin assente      |
| `plugin_operation_not_available` | 409  | stato incompatibile |
| `plugin_dependency_missing`      | 409  | dipendenza assente  |
| `plugin_dependency_cycle`        | 409  | ciclo dipendenze    |
| `plugin_lifecycle_hook_failed`   | 500  | hook fallito        |

## Lifecycle

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

State names sono contratto pubblico per API/SDK/admin. Aggiunte future devono
essere additive o versionate.

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
- Manca collegamento formale con namespace governance, event bus e manifest esteso.

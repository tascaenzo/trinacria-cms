# Plugin packaging e discovery

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `low-level`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-23`

Nota M5: questa specifica alimenta i task di discovery, registration e autoload
di `M5 - Plugin Runtime Foundation`. La sequenza implementativa e descritta in
[`m5-plugin-runtime-implementation.md`](./m5-plugin-runtime-implementation.md).

## Decisione

Un plugin e un package npm/workspace con entrypoint esplicito e manifest
validabile. La prima fase supporta discovery locale/configurata, non marketplace
remoto.

## Responsabilita

| Area           | Owner  | Responsabilita                   |
| -------------- | ------ | -------------------------------- |
| Package shape  | plugin | exports e manifest               |
| Discovery      | kernel | local/configured plugin loading  |
| Compatibility  | kernel | version range e dependency check |
| Enable/disable | kernel | stato runtime persistito         |

## Modello dati

```ts
export interface PluginDiscoverySource {
  type: "workspace" | "package" | "local-path";
  name: string;
  entrypoint: string;
  enabledByDefault?: boolean;
}
```

## Contratti TypeScript target

```ts
export interface PluginDiscoveryService {
  discover(sources: readonly PluginDiscoverySource[]): Promise<PluginDiscoveryResult>;
}

export interface PluginDiscoveryResult {
  plugins: readonly KernelPluginDefinition[];
  sources: readonly PluginSourceSnapshot[];
}

export interface PluginSourceSnapshot {
  type: "workspace" | "package" | "local-path";
  name: string;
  entrypoint: string;
  status: "discovered" | "failed" | "disabled";
  pluginId?: string;
  error?: string;
}
```

## API HTTP target

La discovery non ha API pubblica mutativa nella prima fase.

Endpoint diagnostico:

| Method | Path                         | Permission               |
| ------ | ---------------------------- | ------------------------ |
| `GET`  | `/v1/system/plugins/sources` | `core-pack:plugins:read` |

## DTO request/response

```ts
export interface PluginSourceDto {
  type: "workspace" | "package" | "local-path";
  name: string;
  entrypoint: string;
  status: "discovered" | "failed" | "disabled";
  error?: string;
}
```

## Storage Mongo

Discovery source puo essere config-only nella prima fase.

Stato persistito in:

```text
cms_kernel_plugin_runtime
```

## Security e permission

### Accesso

| Operazione                    | Permission                   | Chi puo fare |
| ----------------------------- | ---------------------------- | ------------ |
| Leggere sorgenti discovery    | `core-pack:plugins:read`     | admin bearer |
| Abilitare/disabilitare plugin | `core-pack:plugins:operate`  | admin bearer |
| Installare da path esterno    | N/A (fuori scope prima fase) | N/A          |

### Regole

1. Solo operatori con `core-pack:plugins:operate` possono abilitare/disabilitare plugin.
2. La discovery si basa su sorgenti configurate, non su filesystem scan arbitrario.
3. Un plugin non puo registrare se stesso come sorgente di discovery.
4. Installazione da path/package esterni resta fuori scope nella prima fase.
5. Ogni discovery e registrazione produce evento audit.

### Audit

- Scoperta sorgente: `{ sourceType, name, status }`
- Fallimento discovery: `{ sourceType, name, error }`
- Abilitazione/disabilitazione: `{ pluginId, operation, actorId }`

## Eventi

### Eventi di discovery

| Nome canonico                   | Owner  | Visibility | Delivery | Payload                            | Quando                |
| ------------------------------- | ------ | ---------- | -------- | ---------------------------------- | --------------------- |
| `core.plugin.source.discovered` | kernel | `audit`    | `sync`   | `{ sourceType, name, entrypoint }` | sorgente scoperta     |
| `core.plugin.source.failed`     | kernel | `audit`    | `sync`   | `{ sourceType, name, error }`      | scoperta fallita      |
| `core.plugin.source.disabled`   | kernel | `audit`    | `sync`   | `{ sourceType, name, reason }`     | sorgente disabilitata |
| `core.plugin.source.enabled`    | kernel | `audit`    | `sync`   | `{ sourceType, name }`             | sorgente riabilitata  |

### Delivery e retry

- Tutti `sync` (in-process).
- Nessun retry automatico.
- Idempotency: la discovery e eseguita una volta al bootstrap. La ri-scoperta e triggered esplicitamente.
- Audit policy: eventi `audit` persistiti in `cms_core_audit_events`.

## Errori

| Code                        | HTTP | Quando            |
| --------------------------- | ---- | ----------------- |
| `plugin_source_invalid`     | 400  | source non valida |
| `plugin_entrypoint_missing` | 500  | export mancante   |
| `plugin_manifest_missing`   | 500  | manifest assente  |

## Lifecycle

1. carica source configurate
2. importa entrypoint
3. valida plugin definition
4. registra nel runtime
5. se `autoLoadPlugins` e attivo, carica i plugin scoperti con `loadMany()`

## Stato implementativo

Implementato nel kernel:

- `PluginDiscoverySource`, `PluginDiscoveryResult`, `PluginSourceSnapshot`
- `ConfiguredPluginDiscoveryService`
- discovery da sorgenti configurate `workspace`, `package`, `local-path`
- source disabilitate senza import
- diagnostica per source `discovered`, `failed`, `disabled`
- integrazione in `startCmsApp()` tramite `pluginSources`
- endpoint diagnostico `GET /v1/system/plugins/sources`
- export pubblico da `@trinacria-cms/kernel`

Ancora aperto:

- persistenza/audit delle source discovery
- installazione da sorgenti esterne runtime, fuori scope della prima fase

## Compatibilita e versioning

- `requiresCore` e semver range obbligatorio. Versioni plugin devono essere semver.
- Nuovi tipi di `PluginDiscoverySource` possono essere aggiunti senza breaking.
- Il formato del manifest plugin e estensibile con nuovi campi opzionali.
- Cambiare il formato di `entrypoint` o il package shape richiede nuova major version del contratto.
- I sorgenti di discovery sono configurabili per ambiente e non richiedono migration.

## Acceptance criteria

- package shape chiaro
- discovery locale/configurata definita
- marketplace fuori scope
- errori diagnostici definiti

## Out of scope

- marketplace remoto
- installazione npm runtime
- firma supply-chain plugin

## Gap rispetto al codice attuale

- Playground registra plugin in modo esplicito.
- Serve discovery service formale.

## Mapping M5

Questa specifica viene implementata in M5 tramite:

- `2026-05-23-m5-discovery-registration-autoload.md`
- `2026-05-23-m5-runtime-store-rehydration.md`
- `2026-05-23-m5-api-openapi-sdk.md`

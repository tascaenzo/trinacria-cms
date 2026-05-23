# M5 Plugin Runtime Foundation - implementation guide

## Stato

- Milestone: `M5 - Plugin Runtime Foundation`
- Stato: `implementation-ready`
- Stato runtime corrente: API/OpenAPI/SDK/admin allineati ai task M5 completati
- Scope: developer handoff
- Ultimo aggiornamento: `2026-05-23`

## Obiettivo

Questa guida traduce le specifiche M4.0 in lavoro implementativo ordinato per
M5. Serve agli sviluppatori per capire cosa costruire, in quale ordine, quali
file toccare, quali contratti rispettare e quali check eseguire prima di
chiudere la milestone.

M5 non introduce domini applicativi. Il risultato atteso e un runtime plugin
operativo, persistente e diagnosticabile.

## Fonti normative

Le decisioni architetturali restano nei documenti M4.0:

- `plugin-runtime.md`: stati, transizioni, dependency ordering, rollback,
  enable/disable
- `plugin-packaging-discovery.md`: package shape, discovery configurata,
  compatibility
- `plugin-contract.md`: manifest e contribution dichiarative
- `namespace-governance.md`: namespace, collision policy, reserved names
- `observability-operations.md`: diagnostics, operation events, health
- `sdk-api-contract.md`: API envelope, OpenAPI e generated SDK

Questo documento non sostituisce quelle specifiche. Le rende eseguibili come
milestone.

## Stato di partenza

Gia disponibile nel kernel:

- manifest target e validazione estesa
- `NamespaceValidator` e collision policy
- `PluginContributionRegistry`
- `PluginRuntimeStore` con implementazioni in-memory, DB-backed e deferred
- `ConfiguredPluginDiscoveryService`
- endpoint diagnostico `GET /v1/system/plugins/sources`
- endpoint operativo `POST /v1/system/plugins/:pluginId/operations`
- test su runtime store, discovery, manifest, namespace e health

Da completare o consolidare in M5:

- reidratazione runtime da stato persistito
- ordering robusto tra plugin scoperti e dipendenze
- diagnostica persistente delle operazioni runtime
- rollback contribution in caso di load fallito
- available operations coerenti con stato, dipendenze e permission
- allineamento API/OpenAPI/SDK agli stati reali del runtime
- UI admin per operazioni plugin e failure context

## Modello mentale

Il runtime e un orchestratore a stati, non un semplice array di plugin.

Ogni plugin attraversa tre livelli:

1. **Source**: dove viene trovato (`workspace`, `package`, `local-path`).
2. **Definition**: manifest validato, moduli e lifecycle hooks.
3. **Runtime record**: stato operativo persistito e diagnosticabile.

Il runtime deve sempre poter rispondere a queste domande:

- il plugin esiste?
- da quale source arriva?
- il manifest e valido?
- quali dipendenze ha?
- quali contribution ha materializzato?
- quali operazioni sono disponibili adesso?
- perche una operazione non e disponibile?
- cosa e successo nell'ultimo fallimento?
- cosa succede dopo restart?

## Stati runtime target

| Stato          | Significato operativo                        | Persistito | Note                                         |
| -------------- | -------------------------------------------- | ---------- | -------------------------------------------- |
| `registered`   | manifest valido registrato, non caricato     | si         | stato iniziale dopo discovery/register       |
| `loading`      | load in corso                                | si         | stato transitorio, utile per diagnostics     |
| `initializing` | hook `onInit` o hook runtime in corso        | si         | stato transitorio, puo fallire               |
| `loaded`       | plugin attivo e contribution visibili        | si         | stato operativo normale                      |
| `unloading`    | unload in corso                              | si         | stato transitorio                            |
| `unloaded`     | plugin scaricato ma ancora noto al runtime   | si         | puo tornare a `loading` o `disabled`         |
| `disabled`     | plugin disabilitato da operatore o bootstrap | si         | non deve autoloadare                         |
| `failed`       | ultimo lifecycle fallito                     | si         | deve conservare fase, errore, count e reason |

Regola: `loaded` e l'unico stato in cui le contribution del plugin possono
essere considerate disponibili da admin/API. Stati transitori o `failed` non
devono lasciare contribution parziali visibili.

## Transizioni consentite

```text
registered -> loading | disabled
loading -> initializing | failed
initializing -> loaded | failed
loaded -> unloading | disabled | failed
unloading -> unloaded | failed | disabled
unloaded -> loading | disabled | registered
failed -> loading | disabled | unloaded
disabled -> registered
```

Semantica delle operazioni:

| Operazione | Precondizioni principali                       | Stato finale atteso       |
| ---------- | ---------------------------------------------- | ------------------------- |
| `load`     | plugin noto, non disabled, dependency valide   | `loaded` o `failed`       |
| `unload`   | plugin `loaded` o `failed` con risorse residue | `unloaded` o `failed`     |
| `reload`   | plugin noto e non disabled                     | `loaded` o `failed`       |
| `disable`  | plugin noto                                    | `disabled`                |
| `enable`   | plugin `disabled`, manifest ancora valido      | `registered`              |
| `loadMany` | set di plugin noti o tutti i plugin caricabili | load in ordine topologico |

Le operazioni non disponibili devono produrre errore deterministico, non no-op
silenziosi, salvo i casi idempotenti esplicitamente accettati nei test.

## Discovery e bootstrap

Pipeline target:

1. leggere `pluginSources` da `startCmsApp()`
2. normalizzare ogni source
3. saltare source disabilitate
4. importare entrypoint
5. estrarre `KernelPluginDefinition`
6. validare manifest, compatibilita core e namespace
7. registrare nel runtime
8. caricare stato persistito da `PluginRuntimeStore`
9. applicare regole di reidratazione
10. se `autoLoadPlugins !== false`, caricare i plugin caricabili con
    `loadMany()`

Regole di reidratazione:

- un record persistito `disabled` resta `disabled`
- un record persistito `loaded` puo essere candidato ad autoload
- un record persistito `failed` resta diagnosticabile, ma puo essere ritentato
  solo tramite operazione esplicita o policy definita
- se il manifest persistito non corrisponde alla source corrente, prevale la
  source corrente ma la diagnostica deve segnalare version/manifest drift
- se il plugin persistito non viene piu scoperto, il record deve restare
  leggibile come orphaned oppure essere marcato con `statusReason`, non sparire
  senza traccia

## Dependency graph

Ogni dependency dichiarata deve produrre un edge:

```text
from: plugin dipendente
to: plugin richiesto
optional: boolean
requiredRange: semver range
status: ok | missing | disabled | version-mismatch
```

Regole:

- dependency obbligatoria `missing` blocca `load`
- dependency obbligatoria `disabled` blocca `load`
- dependency obbligatoria `version-mismatch` blocca `load`
- dependency opzionale non blocca, ma produce warning diagnostico
- un ciclo tra dependency obbligatorie blocca registration/loadMany
- `loadMany()` deve usare ordinamento topologico stabile

Quando un plugin viene disabilitato, i dipendenti gia caricati non devono essere
scaricati implicitamente in M5. Devono pero mostrare dependency status degradato
e available operations coerenti.

## Contribution lifecycle

Le contribution dichiarative (`entities`, `settings`, `events`, `admin`) sono
materializzate dal manifest, ma diventano visibili solo dopo load riuscito.

Load riuscito:

1. validazione manifest
2. collision check
3. register modules
4. `onLoad`
5. `onInit`
6. runtime hooks
7. publish contribution snapshot
8. stato `loaded`

Load fallito:

1. registrare errore con `lastFailurePhase`
2. eseguire rollback best effort
3. rimuovere contribution parziali
4. persistere stato `failed`
5. emettere runtime event fallito

Il `PluginContributionRegistry` deve poter ricostruire una snapshot coerente
dopo load, unload, reload, disable e failure.

## Persistenza Mongo

Collection runtime:

```text
cms_kernel_plugin_runtime
```

Campi minimi:

- `pluginId`
- `version`
- `state`
- `enabled`
- `failureCount`
- `lastFailurePhase`
- `lastErrorCode`
- `lastErrorName`
- `lastErrorMessage`
- `lastErrorDetails`
- `statusReason`
- `disabledReason`
- `manifest`
- `loadedAt`
- `failedAt`
- `disabledAt`
- `createdAt`
- `updatedAt`

Collection eventi runtime:

```text
cms_kernel_plugin_runtime_events
```

M5 puo partire con eventi in-memory se l'API eventi non e ancora persistita, ma
la scelta deve essere esplicita nel task e nei test. Se si introduce la
collection eventi, servono retention e indice per `pluginId + timestamp`.

## API operative

Endpoint target M5:

| Method | Path                                       | Permission                  | Scopo                             |
| ------ | ------------------------------------------ | --------------------------- | --------------------------------- |
| `GET`  | `/v1/system/plugins`                       | `core-pack:plugins:read`    | lista plugin runtime              |
| `GET`  | `/v1/system/plugins/{pluginId}`            | `core-pack:plugins:read`    | dettaglio plugin                  |
| `POST` | `/v1/system/plugins/{pluginId}/operations` | `core-pack:plugins:operate` | load/unload/reload/enable/disable |
| `GET`  | `/v1/system/plugins/{pluginId}/events`     | `core-pack:plugins:read`    | eventi runtime plugin             |
| `GET`  | `/v1/system/plugins/sources`               | `core-pack:plugins:read`    | diagnostica discovery             |

Ogni response deve usare envelope standard `ApiSuccessResponse<T>` o
`ApiErrorResponse`.

DTO runtime minimo:

```ts
export interface PluginRuntimeDto {
  id: string;
  version: string;
  state: PluginState;
  loadedAt?: string;
  failedAt?: string;
  failureCount?: number;
  lastFailurePhase?: string;
  source?: {
    type: "workspace" | "package" | "local-path";
    name: string;
    entrypoint: string;
    status: "discovered" | "failed" | "disabled";
    pluginId?: string;
    error?: string;
  };
  disabledAt?: string;
  disabledReason?: string;
  statusReason?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  capabilities: string[];
  dependencies: PluginDependencyDto[];
  operations: PluginOperationAvailabilityDto[];
}
```

## Admin UX target

La pagina plugin del backoffice permette a un operatore di capire lo
stato senza leggere log server.

Vista lista:

- plugin id, display name, version
- state badge
- source status
- dependency status sintetico
- ultima failure se presente
- azioni disponibili

Vista dettaglio o pannello:

- manifest summary
- dependency table
- available operations con reason quando disabilitate
- failure context (`phase`, `code`, `message`)
- runtime event timeline
- source snapshot

La UI non espone operazioni mutative se il backend le considera
indisponibili.

## Error model

Errori canonici M5:

| Code                                 | HTTP | Quando                               |
| ------------------------------------ | ---- | ------------------------------------ |
| `plugin_not_found`                   | 404  | plugin assente                       |
| `plugin_operation_not_available`     | 409  | stato incompatibile                  |
| `plugin_dependency_missing`          | 409  | dependency obbligatoria assente      |
| `plugin_dependency_disabled`         | 409  | dependency obbligatoria disabilitata |
| `plugin_dependency_version_mismatch` | 409  | dependency fuori range               |
| `plugin_dependency_cycle`            | 409  | ciclo dependency                     |
| `plugin_lifecycle_hook_failed`       | 500  | hook plugin fallito                  |
| `plugin_runtime_store_failed`        | 500  | persistenza runtime fallita          |
| `plugin_source_invalid`              | 400  | source discovery invalida            |
| `plugin_entrypoint_missing`          | 500  | entrypoint senza export valido       |
| `plugin_manifest_missing`            | 500  | manifest assente                     |

Ogni errore operativo deve essere convertibile in:

- API error envelope
- `statusReason`
- runtime event
- log diagnostico

## Ordine di sviluppo consigliato

1. Stabilizzare state machine e available operations.
2. Implementare dependency graph completo e ordinamento stabile.
3. Consolidare discovery -> registration -> autoload.
4. Aggiungere reidratazione da `PluginRuntimeStore`.
5. Chiudere failure handling e rollback contribution.
6. Completare API DTO, OpenAPI e SDK.
7. Aggiornare admin plugin operations.
8. Aggiungere documentazione operativa e troubleshooting.

Non iniziare dal backoffice: la UI deve consumare capability e reason prodotte
dal runtime, non inventare regole proprie.

## Test strategy

Unit test kernel:

- transizioni valide e invalide
- idempotenza operazioni accettate
- dependency graph: missing, disabled, version mismatch, optional, cycle
- `loadMany()` con ordinamento stabile
- rollback contribution su failure
- available operations per ogni stato
- runtime events per success/failure

Contract test runtime store:

- `InMemoryPluginRuntimeStore`
- `DbPluginRuntimeStore` con double DB
- cleanup campi opzionali con `$unset`
- serializzazione error details

Integration Mongo gated:

```bash
TRINACRIA_RUN_MONGO_INTEGRATION=1 npm run test:integration -w @trinacria-cms/kernel
```

Build/check minimi per task kernel:

```bash
npm run typecheck -w @trinacria-cms/kernel
npm run test -w @trinacria-cms/kernel
npm run build -w @trinacria-cms/kernel
```

Check per API/SDK:

```bash
npm run build -w @trinacria-cms/sdk
npm run test -w @trinacria-cms/sdk
```

Check per admin:

```bash
npm run build -w @trinacria-cms/admin-kernel
npm run build -w @trinacria-cms/backoffice
```

## Definition of done M5

M5 e chiusa quando:

- `workflow/tasks/todo` non contiene piu task M5 aperti
- un plugin valido viene scoperto da source configurata
- un plugin valido viene registrato e caricato in ordine dependency
- stato e diagnostica sopravvivono a restart con store Mongo
- enable/disable/reload sono disponibili via API e admin
- failure di un plugin non rompe bootstrap o altri plugin
- contribution parziali non restano visibili dopo failure
- OpenAPI e SDK riflettono DTO runtime reali
- docs sviluppatori e troubleshooting sono aggiornati
- lint, build e test rilevanti passano o il debito e dichiarato nel changelog

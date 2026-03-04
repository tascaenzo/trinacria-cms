# 0001 - Kernel: Modelli e Strutture (v0.1)

## Obiettivo

Descrivere i modelli e le strutture base introdotte nel kernel `@trinacria-cms/kernel` durante la fase iniziale del progetto.

Questa versione copre solo i **contratti** (interfacce e tipi), non le implementazioni runtime complete.

## Decisione architetturale di riferimento

La baseline e definita dall'ADR:

- [ADR-001: Confini tra kernel e core-pack](../../adr/ADR-001-core-boundaries.md)

Sintesi:

- `kernel` contiene runtime e contratti piattaforma.
- `core-pack` contiene implementazioni default (utenti/ruoli/permessi/settings).

## Strutture introdotte nel package kernel

Percorso sorgente:

- `packages/kernel/src/contracts`

### 1) Namespace context

File:

- `packages/kernel/src/contracts/namespace-context.ts`

Modelli:

- `NamespaceContext`
  - `pluginId`: identifica il plugin proprietario delle risorse.
  - `workspaceId?`: abilita scoping multi-tenant/workspace.
- `buildNamespaceKey(context)`
  - genera una chiave namespace canonica per storage/cache/metriche.

Perche serve:

- evita collisioni tra plugin;
- prepara il kernel a isolamento dati per tenant/workspace.

### 2) Plugin manifest

File:

- `packages/kernel/src/contracts/plugin-manifest.ts`

Modelli:

- `PluginManifest`
  - `id`, `version`, `requiresCore`
  - `capabilities?`
  - `dependencies?`
- `PluginManifestDependency`
  - `pluginId`, `versionRange`, `optional?`

Perche serve:

- definisce il contratto minimo di un plugin installabile;
- consente validazioni di compatibilita e dipendenze.

### 3) Plugin runtime contract

File:

- `packages/kernel/src/contracts/plugin-runtime.ts`

Modelli:

- `PluginState`
  - `registered | loaded | failed | disabled | unloaded`
- `PluginRuntimeRecord`
  - snapshot runtime di stato plugin (`manifest`, `state`, `loadedAt`, `lastError`)
- `PluginRuntime`
  - API minima: `register`, `load`, `unload`, `disable`, `list`

Perche serve:

- formalizza il lifecycle plugin a runtime;
- stabilisce la superficie pubblica per il registry/orchestratore.

### 4) DB abstraction

File:

- `packages/kernel/src/contracts/db-adapter.ts`

Modelli:

- `DbQuery<TData>`
- `DbRepository<TData>`
- `DbTransaction`
- `DbAdapter`

Perche serve:

- separa il kernel dal database concreto;
- abilita persistenza MongoDB con Mongoose mantenendo i servizi core disaccoppiati.

### 5) Authorization contract

File:

- `packages/kernel/src/contracts/authz-service.ts`

Modelli:

- `AuthorizationRequest`
- `AuthorizationResult`
- `AuthzService`

Perche serve:

- fornisce un contratto unico di autorizzazione per kernel e plugin;
- integra il controllo permessi con contesto namespace/workspace.

### 6) Export pubblico contratti

File:

- `packages/kernel/src/contracts/index.ts`
- `packages/kernel/src/index.ts`

Perche serve:

- espone in modo stabile i contratti v0.1 del kernel;
- evita import diretti da path interni non versionati.

## Stato implementazione

Completato:

- definizione confini architetturali (`kernel` vs `core-pack`);
- introduzione contratti minimi v0.1 in `packages/kernel/src/contracts`;
- commenti TSDoc sui modelli principali.

Non ancora completato:

- implementazione concreta del registry runtime plugin;
- orchestrazione lifecycle con rollback;
- implementazioni adapter DB reali;
- implementazione authz/rbac concreta.

## Prossimo passo

Procedere con lo skeleton runtime del `kernel` (step successivo del piano):

- cartelle `runtime`, `errors`, `tokens`;
- prime implementazioni placeholder allineate ai contratti definiti qui.

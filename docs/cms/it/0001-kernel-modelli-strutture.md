# 0001 - Kernel: architettura, confini e API pubbliche

## 1. Missione del kernel

Il kernel e il "sistema operativo" del CMS.

Responsabilita principali:

- definire contratti stabili per plugin e servizi trasversali;
- orchestrare lifecycle plugin a runtime;
- garantire isolamento logico tra plugin;
- fornire primitive standard per API envelope, health, persistence abstraction.

Il kernel non deve contenere business logic specifica (es. regole utenti, contenuti editoriali).

## 2. Struttura fisica del package

Percorso: `packages/kernel/src`

Directory e ruolo:

- `contracts/`: specifiche pubbliche (interfacce e tipi condivisi).
- `runtime/`: implementazioni concrete di orchestrazione.
- `errors/`: gerarchia errori tipizzati.
- `tokens/`: token DI ufficiali del framework.
- `http/`: strumenti HTTP trasversali (health, swagger, helpers).
- `types/`: augmentation tipi per plugin esterni (`@trinacria/http`).
- `index.ts`: entrypoint unico e re-export delle librerie Trinacria.

## 3. Entry-point strategy

File: `packages/kernel/src/index.ts`

Scelta progettuale: re-export centralizzato.

Cosa permette:

- plugin developer importa da `@trinacria-cms/kernel` una sola volta;
- riduce import frammentati (`@trinacria/core`, `@trinacria/http`, `@trinacria/schema`);
- facilita migrazioni future con minor impatto sui plugin.

Tradeoff:

- il kernel diventa "facade" ampia;
- richiede disciplina per evitare export superflui/non stabili.

## 4. Contratti fondanti

### 4.1 `PluginManifest`

File: `contracts/plugin-manifest.ts`

Campi chiave:

- `id`: identita stabile plugin.
- `version`: versione plugin.
- `requiresCore`: range semver kernel richiesto.
- `capabilities`: capability esportate.
- `dependencies`: dipendenze plugin->plugin.
- `security`: contributi security dichiarativi (`permissions`, `roles`, `grants`).

Impatto architetturale:

- abilita validazione preventiva;
- abilita governance versioning e compatibilita.

### 4.2 `PluginRuntime`

File: `contracts/plugin-runtime.ts`

Espone API lifecycle:

- `register`, `load`, `unload`, `reload`, `loadMany`, `disable`, `unregister`.

Espone ispezione runtime:

- `list`, `describeDependencies`.

Impatto:

- runtime amministrabile e osservabile senza accedere a dettagli interni.

### 4.3 `DbAdapter`

File: `contracts/db-adapter.ts`

Scopo:

- mantenere plugin storage-agnostici.

Primitive:

- repository CRUD (`DbRepository`)
- query astratta (`DbQuery`)
- transaction handle (`DbTransaction`)

Impatto:

- plugin non dipende da Mongoose/SQL client;
- cambio backend con impatto ridotto su codice dominio.

### 4.4 `NamespaceContext`

File: `contracts/namespace-context.ts`

Contiene:

- `pluginId`
- `workspaceId` opzionale

`buildNamespaceKey` produce chiave canonica per isolamento.

Impatto:

- riduce collisioni cross-plugin;
- prepara multi-namespace senza cambiare API repository.

### 4.5 `ApiContract`

File: `contracts/api-contract.ts`

Definisce envelope standard:

- successo: `{ data, meta? }`
- errore: `{ error, meta? }`

`meta` include, tra gli altri, `pluginId`.

Impatto:

- risposte omogenee per tutti i plugin;
- SDK client semplificato.

### 4.6 `CmsStarterOptions`

File: `contracts/cms-starter.ts`

Definisce bootstrap minimo applicativo:

- HTTP/OpenAPI
- Swagger UI
- plugin da registrare
- provider globali
- auto-load lifecycle
- provisioning del manifest automatico su load/unregister (se disponibile un `PluginManifestProvisioner`)

Impatto:

- standard unico di avvio applicazione.

## 5. Token come ABI interna del framework

File: `tokens/core-tokens.ts`

Token principali:

- `PLUGIN_RUNTIME`
- `DB_ADAPTER`
- `ENTITY_REGISTRY`
- `AUTHZ_SERVICE`
- `PLUGIN_MANIFEST_PROVISIONER`
- `KERNEL_HEALTH_SERVICE`
- `LOGGER`

Perche e cruciale:

- in DI, il token e l'interfaccia binaria logica tra moduli;
- cambia implementazione senza cambiare consumatori.

## 6. Error model e semantica operativa

Directory: `errors/`

Gerarchia:

- `CoreError` base
- specializzazioni plugin/db

Benefici:

- codici errore stabili (`PLUGIN_LIFECYCLE_ERROR`, ecc.);
- diagnosi piu rapida in API/log.

## 7. Modulo HTTP trasversale

Directory: `http/`

Componenti principali:

- `KernelHealthHttpController`
- `CmsSwaggerController`
- `createPluginApiResponder` (in `api-http-utils.ts`)

Impatto:

- riduce duplicazione controller plugin;
- garantisce uniformita di presentazione/diagnostica.

## 8. Principi architetturali riassunti

1. Contracts-first.
2. Runtime con regole esplicite.
3. Dipendenze tramite token.
4. Isolamento plugin by design.
5. API surface coerente.
6. Error handling tipizzato.

Se uno di questi principi viene violato, il framework perde affidabilita e scalabilita organizzativa.

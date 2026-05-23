# M5 - Plugin Runtime Foundation

Stato: `planned`

## Obiettivo

Implementare il primo runtime plugin reale dopo la chiusura di `M4.0 - Core
Platform Specifications`.

La milestone deve dimostrare che il CMS sa scoprire, validare, ordinare,
caricare, abilitare, disabilitare e diagnosticare plugin reali senza introdurre
domini applicativi nel core.

## Principio guida

M5 e una milestone di piattaforma, non una milestone editoriale.

Il lavoro deve rendere operativo il contratto plugin-first gia specificato in
M4.0. Content, editorial workflow, revisioni, publish/unpublish e UI dominio
restano in backlog dominio finche la piattaforma non espone un runtime plugin
stabile.

## Perimetro

### 1. Runtime state machine

- definire stati runtime effettivi: `registered`, `loading`, `loaded`,
  `disabled`, `failed`, `unloading`, `unloaded`
- validare transizioni consentite
- rendere idempotenti le operazioni dove previsto dalla specifica
- conservare `lastFailurePhase`, `failureCount`, `statusReason`, timestamp e
  diagnostica operativa

### 2. Discovery plugin configurata

- usare sorgenti esplicite `workspace`, `package`, `local-path`
- importare entrypoint plugin in modo controllato
- validare manifest e compatibilita
- produrre diagnostica per source `discovered`, `failed`, `disabled`
- mantenere fuori scope filesystem scan arbitrario e marketplace remoto

### 3. Dependency ordering

- leggere dipendenze dichiarate nel manifest
- ordinare i plugin prima del load
- bloccare load/enable quando una dependency obbligatoria manca, e disabilitata
  o non rispetta il version range
- rilevare dependency cycle e riportare errore diagnostico
- supportare dependency opzionali senza bloccare il runtime

### 4. Enable, disable e persistenza

- esporre operazioni runtime per `load`, `unload`, `reload`, `enable`,
  `disable`
- persistere stato runtime in Mongo tramite runtime store
- reidratare lo stato plugin al bootstrap
- distinguere plugin disabilitati manualmente da plugin falliti
- mantenere available operations coerenti con stato, dipendenze e permission

### 5. Failure mode e rollback

- isolare il fallimento di un plugin senza rompere l'avvio del kernel
- salvare stato `failed` con fase, codice errore e messaggio leggibile
- fare rollback delle contribution registrate quando il load fallisce
- impedire che contribution parziali restino visibili in admin/API
- produrre runtime events per operazioni riuscite e fallite

### 6. API, admin e diagnostica

- completare API operative plugin:
  - `GET /v1/system/plugins`
  - `GET /v1/system/plugins/{pluginId}`
  - `POST /v1/system/plugins/{pluginId}/operations`
  - `GET /v1/system/plugins/{pluginId}/events`
- mantenere `GET /v1/system/plugins/sources` come diagnostica discovery
- aggiornare la UI admin plugin per mostrare stato, failure reason,
  dependency status e operazioni disponibili
- proteggere operazioni mutative con `core-pack:plugins:operate`

## Task inclusi

- [ ] State machine runtime e transizioni operative
- [ ] Dependency graph, ordering e cycle detection
- [ ] Loading reale da discovery configurata
- [ ] Persistenza Mongo e reidratazione runtime state
- [ ] Enable/disable/reload con available operations
- [ ] Failure handling, rollback contribution e runtime events
- [ ] API operative plugin e DTO allineati a SDK/OpenAPI
- [ ] Admin plugin operations con diagnostica leggibile
- [ ] Test unitari, contract test runtime store e integration Mongo gated
- [ ] Documentazione operativa e changelog M5

## Dipendenze

- `docs/cms/specs/core-platform/plugin-runtime.md`
- `docs/cms/specs/core-platform/plugin-packaging-discovery.md`
- `docs/cms/specs/core-platform/plugin-contract.md`
- `docs/cms/specs/core-platform/namespace-governance.md`
- `docs/cms/specs/core-platform/observability-operations.md`
- task completato `workflow/tasks/done/2026-05-21-core-contracts-foundation-implementation.md`

## Out of scope

- content types e content entries
- workflow editoriale
- revisioni/versioning contenuti
- publish/unpublish
- scheduling editoriale
- workflow approvativo multi-step
- marketplace remoto
- installazione npm runtime
- event bus completo oltre agli eventi runtime necessari
- configuration registry completo oltre alle configurazioni gia necessarie al
  runtime plugin
- admin resource renderer generico

## Criterio di chiusura

M5 e chiusa quando:

- un plugin dichiarativo valido puo essere scoperto da sorgente configurata
- il manifest viene validato con namespace e collision policy gia implementate
- il runtime ordina i plugin in base alle dipendenze
- un plugin puo essere caricato, abilitato, disabilitato, ricaricato e scaricato
- lo stato runtime sopravvive a restart tramite persistenza Mongo
- un plugin fallito non rompe il kernel e produce diagnostica leggibile
- contribution parziali vengono rimosse in caso di fallimento
- API, admin, SDK/OpenAPI e documentazione riflettono gli stati runtime reali
- test kernel, build e lint passano

## Esito atteso

Al termine della milestone il core resta piccolo, ma diventa realmente
estensibile: la piattaforma puo ospitare plugin funzionali senza hardcodare un
dominio nel kernel o nel core-pack.

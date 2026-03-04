# 0008 - Testing, operazioni e governance tecnica

Questo capitolo copre la parte che trasforma una base tecnica in un prodotto affidabile.

## 1. Strategia test multilivello

### Livello A - Unit test

Target:

- `users.service.ts`
- helper runtime puri (`semver.ts`, parsers)
- mapping errori API

Obiettivo:

- validare regole isolate rapidamente.

### Livello B - Integration test

Target:

- repository su adapter reale
- module wiring DI
- registrazione entita in `EntityRegistry`

Obiettivo:

- verificare collaborazione tra componenti.

### Livello C - Runtime orchestration test

Target:

- `register/load/unload/reload/disable`
- dipendenze mancanti o cicliche
- rollback su failure hook/moduli

Obiettivo:

- validare robustezza kernel lifecycle.

### Livello D - API end-to-end

Target:

- endpoint users
- envelope e codici errore
- OpenAPI endpoint

Obiettivo:

- garantire contratto esterno stabile.

## 2. Casi minimi obbligatori

Kernel/runtime:

- manifest invalido -> `PluginManifestError`
- core incompatibile -> `PluginCompatibilityError`
- ciclo dipendenze -> `PluginDependencyError`
- transizione invalida -> `PluginStateTransitionError`
- rollback su load failure -> plugin in `failed`

Core-pack/users:

- create user valido
- duplicate email
- get user non esistente
- update status
- list pagination base

Operazioni:

- `/health` con DB non configurato
- `/health` con DB disponibile
- `/health/dependencies` con edge mismatch simulato

## 3. Operabilita runtime

Indicatori da monitorare:

- conteggio plugin per stato (`loaded`, `failed`, `disabled`)
- warning dependency graph
- frequenza retry/load fail
- latenza endpoint health

Azioni operative standard:

- `reload` dopo fix plugin
- `disable` plugin degradato
- analisi `lastFailurePhase` per root cause

## 4. Gestione incidenti (runbook base)

Scenario: plugin in `failed` durante `init`.

Passi:

1. leggere errore lifecycle (`phase`, `cause`, `rollbackErrors`)
2. verificare dipendenze plugin e version range
3. verificare token non risolti in modulo plugin
4. correggere root cause
5. `reload(pluginId)`
6. verificare `/health` e `/health/dependencies`

## 5. Governance tecnica su capability e API

Linee guida:

- naming capability consistente
- no capability duplicate semantiche
- ogni capability nuova documentata
- ogni endpoint nuovo con schema request/response

Perche importante:

- in ecosistemi plugin, la semantica drift e il principale debito tecnico.

## 6. Regole di code review consigliate

Checklist:

- confini layer rispettati?
- nuovi token/documentati?
- error handling tipizzato?
- impatto su state machine runtime valutato?
- backward compatibility API valutata?
- test aggiunti per nuovi rami logici?

## 7. Evoluzione roadmap tecnica

Step suggeriti:

1. completare ruoli/permessi/settings con pattern users
2. introdurre AuthZ engine su `AuthzService`
3. aggiungere audit event runtime persistente
4. introdurre suite CI e2e con Mongo container
5. introdurre policy migration dati plugin-by-plugin

## 8. Metodo di studio universitario

### Fase teorica

- ricostruire diagrammi state machine e dependency graph dal codice.

### Fase sperimentale

- modificare un plugin per forzare failure in load/init e osservare rollback.

### Fase critica

- proporre miglioramenti con analisi tradeoff (complessita vs robustezza).

### Fase documentale

- aggiornare sempre docs insieme al codice per mantenere architettura esplicita.

## 9. Conclusione

Un framework/CMS non si valuta solo dalla velocita di sviluppo iniziale. Si valuta dalla sua capacita di restare comprensibile, osservabile e correggibile nel tempo.

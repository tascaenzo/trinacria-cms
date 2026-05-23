# Changelog

Tutte le milestone significative sono documentate qui.
Il formato si ispira a [Keep a Changelog](https://keepachangelog.com/).

## [M4] Core Platform Foundation — completata

### Checklist iniziale

- [x] Filosofia plugin-first e confini Trinacria/kernel/core-pack/plugin
- [x] Specifiche low-level core platform
- [x] Manifest plugin, contribution catalog, API pubbliche
- [x] Contratti fondativi: manifest target, namespace validator, collision policy
- [x] Namespace validator integrato nel runtime
- [x] Diagnostica admin per contribution plugin
- [x] Test limite su runtime store in-memory e DB-backed
- [x] Integration Mongo reale per runtime store
- [x] Discovery plugin configurata da sorgenti esplicite
- [x] Endpoint diagnostico sorgenti plugin

### Riepilogo

M4 fonda la piattaforma plugin-first. Il dominio editoriale resta fuori dal core.
Il runtime plugin reale end-to-end e stato separato nella milestone successiva,
`M5 - Plugin Runtime Foundation`.

### Introdotto

- Documentazione core platform low-level
- Manifest plugin esteso (`entities`, `settings`, `events`, `admin`, `security`)
- Contribution catalog runtime e endpoint di lettura
- Pagina admin diagnostica per contribution
- Namespace validator side-effect free
- Collision detection cross-plugin nel runtime
- Contract test su runtime store memoria/DB-backed
- Integration test Mongo reale
- Fix Mongo `$unset` per campi runtime obsoleti
- `ConfiguredPluginDiscoveryService` e `pluginSources` nello starter CMS
- Endpoint `GET /v1/system/plugins/sources`

### Check eseguiti

- `npm run lint`, `npm run build`, `npm test`
- typecheck + test kernel, integration Mongo

### Prossimo blocco

`M5 - Plugin Runtime Foundation`: runtime plugin reale end-to-end con discovery
configurata, loading, dependency ordering, enable/disable, failure mode,
rollback contribution e persistenza Mongo.

---

## [M5] Plugin Runtime Foundation — pianificata

### Obiettivo

Rendere operativo il contratto plugin-first chiuso in M4.0 senza introdurre
domini applicativi nel core.

### Documentazione di partenza

- `workflow/milestones/M5-plugin-runtime-foundation.md`
- `docs/cms/specs/core-platform/m5-plugin-runtime-implementation.md`
- `docs/cms/it/0016-m5-runtime-plugin-foundation.md`
- `docs/cms/en/0016-m5-plugin-runtime-foundation.md`

### Task iniziali

- [x] `2026-05-23-m5-runtime-state-machine.md`
- [x] `2026-05-23-m5-dependency-graph-ordering.md`
- `2026-05-23-m5-discovery-registration-autoload.md`
- `2026-05-23-m5-runtime-store-rehydration.md`
- `2026-05-23-m5-failure-rollback-events.md`
- `2026-05-23-m5-api-openapi-sdk.md`
- `2026-05-23-m5-admin-plugin-operations.md`
- `2026-05-23-m5-docs-troubleshooting-qa.md`

### Include

- Runtime state machine e transizioni valide
- Discovery plugin configurata da source esplicite
- Dependency ordering e cycle detection
- Operazioni `load`, `unload`, `reload`, `enable`, `disable`
- Persistenza Mongo e reidratazione stato runtime
- Failure handling, rollback contribution e runtime events
- API operative plugin, admin diagnostics e SDK/OpenAPI aggiornati

### Avanzamento

- State machine e available operations allineate: `unload` recupera plugin in
  stato `failed` dopo un unload fallito, e le operazioni esposte rispettano gli
  stati transitori.
- Dependency graph e ordering rafforzati: `loadMany()` include dependency
  obbligatorie, blocca dependency disabilitate/fuori range prima del load e gli
  snapshot API mostrano operazioni indisponibili quando il grafo le blocca.

### Fuori scope

- Content types, workflow editoriale, revisioni e publish/unpublish
- Marketplace remoto e installazione npm runtime
- Event bus completo, configuration registry completo e admin resource renderer generico

---

## [M3.6] Design System Accessibility Hardening — completata

Ultima fase M3 sull'accessibilità dei componenti trinacria-ui.
Documentazione e task disponibili in `workflow/tasks/done/`.

---

## [M3.5] Design System Backoffice — completata

Prima fase del design system backoffice: setup Storybook monorepo, componenti core, pattern composti, audit e confini.
Documentazione e task disponibili in `workflow/tasks/done/`.

---

## [M3] Gestione Plugin Operativa — completata

Runtime plugin, API operative, diagnostica, test di integrazione.

---

## [M2] Settings Operativi V1 — completata

CRUD settings, bootstrap core-pack, sicurezza, ownership.

---

## [M1] Riallineamento Base Operativa — completata

Baseline README, struttura repo, smoke test, contratti utenti admin.

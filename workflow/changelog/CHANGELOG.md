# Changelog

Tutte le milestone significative sono documentate qui.
Il formato si ispira a [Keep a Changelog](https://keepachangelog.com/).

## Prima verifica remota del consolidamento (2026-10-07)

- Aperta la PR #17 verso `unstable` e avviata la CI completa.
- Corretto il riconoscimento della readiness Vite della fixture esterna: i colori
  ANSI del runner interrompevano il marker testuale pur con server già avviato.
- [Verifica e risultati](../tasks/todo/2026-10-07-pr-ci-first-verification.md).

## Consolidamento automatico delle basi CMS e plugin (2026-10-05)

- Nove scenari D0 reali nello stesso comando di conformità da tarball; report distingue
  controlli statici incompleti, successo e fallimento. Teardown e exit status verificati.
- Backup/restore della fixture con tipi BSON, indici, media e configurazione, cold start,
  login e salute del kernel; misure locali di avvio, memoria e latenza HTTP.
- CI completa, Chromium prima del packaging/browser, integrazioni senza cache e prova
  primo avvio Mongo esplicita; report redatti conservati come artefatti.
- Cleanup del database esterno assicurato dal runner dopo l uscita dei figli,
  con nome UUID controllato e verifica delle collection residue.
- Guardrail dei tarball contro output compilati orfani; ricompilati gli otto pacchetti
  da sorgenti, archiviando gli output precedenti in una directory locale ignorata.
- Verificati 605 test ordinari, 45 della suite Mongo/Redis/S3 senza skip, 12 playground
  incluso primo avvio reale, 28 Chromium, build/Storybook/SDK/API/signing/template.
- Task C0/C1/D0 e guide allineati alle evidenze; procedure del team pronte. Prova umana,
  CI remota e staging restano aperti, con nessuna pubblicazione o reset del DB mock.
- [Consegna](../tasks/done/2026-10-05-cms-foundation-consolidation.md) e
  [acceptance del team](../../docs/cms/architecture/plugin-platform/single-instance-acceptance.md).

## Setup: prerequisiti separati e step centrati (2026-10-05)

- Pagina dedicata ai requisiti mancanti, checklist compatta e correzioni senza duplicati.
  Esempi di configurazione espandibili, limitati alle variabili da correggere.
- Setup automatico quando i controlli passano e il runtime è pronto; rimane necessario
  riavviare il CMS dopo modifiche ambientali in modalità `installerOnly`.
- Stepper del design system con tutti e tre i passi centrati, navigazione anche con
  Invio e form adattati al mobile. Tolti i banner dei prerequisiti dal wizard;
  verifiche finali raccolte in un dettaglio espandibile.
- Build e tipi verificati, 102 test admin e sette test Chromium dell'interfaccia;
  risposte API simulate e nessuna modifica al database mock.
- [Specifica operativa](../../docs/cms/specs/core-platform/installation-bootstrap.md).

## Primo avvio verificato e riprendibile (2026-10-04)

- Stato automatico da Mongo, requisiti reali e guida con controlli ripetibili.
- Configurazione core atomica, lease condiviso e ripresa con le credenziali originali.
- Scelta CMS vuoto/demo, hook `onInstall` idempotente e nessun seed durante `onLoad`.
- Controlli finali prima del completamento e schermata di ingresso al backoffice.
- SDK/OpenAPI, traduzioni, API pubbliche e runbook aggiornati; mock corrente conservato.
- [Specifica operativa](../../docs/cms/specs/core-platform/installation-bootstrap.md)
  e [verifiche](../tasks/done/2026-10-04-first-run-installation.md).

## Collection Mongo leggibili (2026-10-04)

- Naming `<entity>__plugin_<pluginId>`, con workspace opzionale ed escaping reversibile.
  Registro ownership e controlli tra plugin invariati.
- Rinominate le 31 collection del database mock, conservando documenti, indici e account.
  Login, pubblicazioni e media verificati dopo riavvio.
- [Regole di naming](../../docs/cms/architecture/plugin-platform/collection-naming.md)
  e [registro del lavoro](../tasks/done/2026-10-04-readable-mongo-collection-names.md).

## Pulizia del codice plugin e dei documenti (2026-10-03)

- Eliminati runtime sperimentali inutilizzati, profili nei manifest, export, test e
  documenti associati; tolti wrapper/fence dei grant locali e seed delle approvazioni.
- Policy HTTP esplicita e separata; grant remoti limitati agli scope API.
  Permessi utente, vault, ownership, transazioni, manutenzione e cluster opzionale mantenuti.
- Checklist e guide eventi/email/settings aggiornate; rimosse istruzioni verso UI,
  classi e file eliminati. Link relativi verificati. SDK/OpenAPI e contratti rigenerati.
- Build pulita, check, 51 test mirati, 42 integrazioni Mongo, 21 Chromium e fixture
  esterna passati; Redis/S3 non attivati. Otto tarball senza artefatti rimossi,
  con guardrail nel packaging contro file compilati orfani. Nessun reset o pubblicazione.
- [Registro della pulizia](../tasks/done/2026-10-03-plugin-code-and-docs-cleanup.md).

## Plugin fidati — runtime standard semplificato (2026-10-03)

- Plugin installati nello stesso processo Node.js e chiamate dirette. Policy basata
  su manifest/dipendenze/contratti, senza grant DB o fence transazionali per le
  integrazioni locali. Autorizzazione utente, deleghe, schema e ownership mantenuti.
- Singola istanza per default, cluster opt-in. Lifecycle locale con CAS, idempotenza,
  drain e revisioni conservate oltre il buffer diagnostico. Gestione plugin visibile
  in Settings; centro approvazioni rimosso. Controlli dei client HTTP firmati conservati.
- Vault cifrato/atomico mantenuto e verificato con i permessi consumer di Email;
  eventi protected, destinatari e monouso ancora controllati.
- SDK/OpenAPI, contratti, template/starter, esempi e documenti allineati. Build/check,
  prove Mongo sui componenti attivi, 21 Chromium e fixture tarball esterna passati,
  incluso upgrade distribuito con dati conservati. Prova locale: dieci letture e
  evento protected, zero query ai grant e zero approvazioni. Nessun reset/rilascio.
- [Decisione vigente](../../docs/cms/architecture/plugin-platform/trusted-plugin-model.md)
  e [task](../tasks/done/2026-10-03-trusted-plugin-runtime-simplification.md).

## E0 — sito pubblico (2026-10-02)

- Snapshot pubblicati immutabili, pointer/ripubblicazione CAS e intent atomici; copia
  di lavoro e restore non cambiano la pubblicazione. Delivery allowlist, relazioni
  bounded, Media public controllati e limiter Mongo condiviso.
- Anteprima monouso/sessioni hash-only con chiavi separate; backoffice, SDK delivery/
  preview e sito React SSR/Vite con CSP/SEO, cache condivisa30s e invalidazioni C1.
- Check/build/SDK/Storybook, 41 test integrazione / 2 skip Redis-S3, 20 Chromium;
  restore snapshot/pointer su database separato verificato. Deployment team aperto.
- D0: fixture esterna con tarball, overlay/browser e upgrade conservativo0.1→0.2
  passata anche dopo il fence workload/storage; fixture aggiornata a25 route Editorial
  e gruppi SDK editorial/preview, report precedente eliminato prima della prova.
  Prova umana e suite di riferimento completa aperte. Nessun rilascio npm.
- [Runbook sito pubblico](../../docs/cms/architecture/plugin-platform/public-site-runbook.md).

## B0 — export pubblici e semver (2026-10-02)

- Semver npm diretto, caret 0.x corretto e prerelease esplicite; runtime rifiuta combinazioni incompatibili.
- Servizi/repository e factory host spostati al subpath `/runtime`, consumer aggiornati senza alias legacy.
- Inventario e snapshot `.d.ts` degli otto package, fixture TypeScript positiva/negativa,
  range Core/plugin/admin e check CI; guide e riferimento API aggiornati.
- Check: 563 test passati, 13 skip opt-in, build 12/12 e public-api:check passati.
- [Baseline](../../docs/cms/specs/core-platform/public-api/README.md) e
  [task](../tasks/done/2026-10-02-public-exports-semver-and-compatibility.md). Continua B1.

## A3 — autorizzazione applicativa (2026-10-02)

- Contesti host certificati, principal autenticato e doppio controllo delle deleghe;
  authorizer Core per utenti/grant API e diniego redatto 403, policy risolta a ogni uso.
- Facade applicative nei sei domini; controller e operazioni nominate condividono i
  controlli, owner/approver/updatedBy derivati dall'host, nessun bypass dai payload.
- Editorial ricrea modello/entry/revisioni nella sessione, fence CAS e retry autorizzati;
  publish obbligatorio sulle scritture live, restore preserva lo stato pubblico.
- Media ACL prima della paginazione, replacement controllato a ogni fase, cleanup system
  con scope esplicito; secrets e runtime manage separati, nuovi permessi solo ad admin.
- Check senza cache: 561 passati/13 skip opt-in; 20 integrazioni Mongo/2 skip Redis-S3;
  17/17 Chromium, build 12/12, SDK e backend senza React passati. Nessun reset sviluppo.
- [Inventario](../../docs/cms/architecture/plugin-platform/application-operation-inventory.md)
  e [task completato](../tasks/done/2026-10-02-application-operation-authorization.md).
  Prossimo B0/B1; store grant condiviso/outbox/migrazioni restano C2/C1/C0.

## A2 — vault atomico e keyring (2026-10-01)

- Claim Mongo con CAS, massimo tre tentativi e policy rivalutata; nessun plaintext su
  CAS perso, record corrotto, stato/scadenza/destinatario negato o policy assente.
- Client `services.securePayloads` con identità host, DTO sanitizzati e Core/Email migrati;
  starter risolve la policy al claim anche se Core viene caricato dopo il singleton.
- Keyring obbligatorio in ogni ambiente, write active/read keyVersion; retention TTL
  24h configurabile. Rotazione CAS con inventario readonly, batch e ripresa idempotente.
- [Runbook](../../docs/cms/architecture/plugin-platform/secure-payload-keyring-runbook.md),
  `.env.example`, guide EN/IT e checklist aggiornati; nessun alias o reset sviluppo.
- Riproduzione prima: 50 successi errati per max1/max3; dopo: esattamente 1/3.
  Check senza cache: 541 passati, 13 opt-in skip; build, SDK e backend senza React passati;
  17 integrazioni Mongo (2 skip Redis/S3) e 17/17 Chromium.
- [Task completato](../tasks/done/2026-10-01-secure-payload-atomic-claim-and-keyring.md).
  Prossimo: A3, autorizzazione applicativa; grant condivisi/outbox restano C2/C1.

## A0 — contesto plugin e ownership storage (2026-10-01)

- Rimossi app/bus dai contesti: storage/settings/events/logger/operazioni nominate scoped,
  identità host e generazioni invalidate su unload/reload; pack e playground aggiornati.
- Entità con owner obbligatorio, nomi Mongo leggibili (aggiornati il 2026-10-04) e registro ownership con due indici
  unici; vecchio layout rilevato senza modificarlo. Transazioni host cross-namespace con
  allowlist e sessione unica; nesting/repository fuori tentativo negati anche nei retry.
- Discovery locale con root realpath e controlli URL/symlink prima dell'import.
- Helper server nel subpath runtime e guardrail plugin-api condiviso; typecheck SDK attende
  generate per evitare una gara nel grafo Turbo. Guide EN/IT e piano M8 allineati.
- Check senza cache: 512 test passati, 7 opt-in skip; build completa, SDK e import backend
  senza React passati; 11 integrazioni Mongo e 17/17 Chromium. Redis/S3 non ripetuti.
- [Task completato](../tasks/done/2026-10-01-plugin-host-context-and-storage-boundaries.md).
  Prossimo: A2 (claim atomico e keyring); policy applicativa completa resta A3/C2.

## A1 — autorizzazione e consegna eventi plugin (2026-10-01)

- Protected/audit negati senza authorizer, con permesso dichiarato dall'owner e decisione
  rigorosamente positiva; policy rivalutata a ogni consegna, senza cache.
- Unload/reload invalida handler già in snapshot o in attesa della policy; binding parziale
  ripulito con rollback di moduli/contributi anche nelle dipendenze ricorsive.
- Diagnostica tipizzata redatta disponibile nel runtime e nello starter; errori policy
  contenuti senza interrompere altri consumer, errori applicativi conservati.
- Verifiche senza cache: 500 test passati, 5 opt-in skip, build completa, SDK,
  9 integrazioni Mongo e 17/17 Chromium. Nessuna modifica al vault o sandbox.
- [Task completato](../tasks/done/2026-10-01-plugin-event-authorization-hardening.md).

## M8 — riprogettazione prima del primo rilascio (2026-10-01)

- Confermato dal maintainer che il progetto non è mai stato rilasciato: nessun vincolo
  di retrocompatibilità con il codice attuale, alias legacy o finestra di deprecazione.
- Aggiornati piano, specifiche e task: contesto plugin senza app, firma solo v2,
  API cluster e SDK aggiornati direttamente, delivery obbligatoria nei manifest.
- Naming/schema target per nuove installazioni; recupero dati di sviluppo opzionale,
  senza reset automatici. Restano semver, rotazione chiavi e migrazioni future.
- Versione della prima release da scegliere al gate G2; nessuna modifica al runtime.

## Specifiche piattaforma plugin M8 — completate (2026-10-01)

- Completati gli approfondimenti dei 12 punti: piano tecnico, 20 decisioni,
  sei specifiche esecutive e 13 task implementativi collegati alla milestone M8.
- Definiti contratti, ownership/unit of work host, sicurezza, API/SDK/release,
  migrazioni, eventi durevoli, repliche, audit, sito pubblico e plugin isolati.
- A1 aggiornato con diagnostica e semantica del bus effettivamente installato;
  nessuna modifica al runtime o dichiarazione di completamento dei task implementativi.
- Riferimento: [piano tecnico](../../docs/cms/architecture/plugin-platform-implementation-plan.md).

## Revisione piattaforma plugin — completata (2026-10-01)

- Checklist operativa con 12 punti: evidenze nel codice, priorità, dipendenze,
  criteri di completamento e sequenza delle prime PR; nessuna modifica al runtime.
- Baseline PR #16 verificata su Node 24.21.0: check senza cache con 470 test passati,
  build/Storybook senza cache, SDK, 11 integrazioni Mongo/S3/Redis e 17/17 Chromium.
- Confermati i gap dei contratti pubblici e della sicurezza plugin; distinta dai lavori
  futuri la separazione server/admin già protetta dai guardrail.
- Riferimento: [checklist](../../docs/cms/architecture/plugin-platform-operational-checklist.md).

## Cache senza scadenza — completata (2026-10-01)

- L’adapter in memoria conserva i valori con TTL zero senza scadenza, come Redis.
- Il test avanza un orologio simulato per verificare il comportamento senza dipendere
  dalla velocità del runner; corretto il difetto emerso nella CI sul push.

## Installazione E2E sincronizzata — completata (2026-10-01)

- Il test attende la risposta POST del bootstrap e ne verifica il successo prima
  di cercare la dashboard; rimosso il click sintetico che non attendeva il flusso.
- Le porte dei fixture seguono gli URL E2E configurati, permettendo la verifica
  senza fermare il CMS di sviluppo. Suite locale su porte separate: 17/17 passati.

## Servizio S3 della CI — completato (2026-10-01)

- MinIO costruito dal commit ufficiale della release fissata, dopo il ritiro delle
  immagini/binari precompilati usati dalla CI; dati e log restano temporanei nel runner.
- Verificata la build sorgente e l’integrazione upload/lettura/cancellazione S3 locale.

## Typecheck E2E su checkout pulito — completato (2026-10-01)

- `e2e:typecheck` compila prima il playground e le dipendenze workspace richieste
  dagli entrypoint browser/API, senza dipendere da artifact locali precedenti.
- Riprodotto il problema in CI; verificato il comando senza `apps/playground/dist`.

## Semplificazione menu UI — completata (2026-10-01)

- Navigazione e contratto di selezione condivisi tra dropdown e menu contestuale.
- Handler del trigger unificato, rimosso il cast ref `as never`.
- ContextMenu rispetta selezioni persistenti e annullate; ArrowUp senza voce attiva
  raggiunge l’ultima azione abilitata.
- Check completo: 470 test ordinari, inclusi 96 UI; build e Storybook verdi.

## Allineamento documentazione — completato (2026-10-01)

- README e indici collegano stato corrente, UI/Tailwind e operazioni editoriali.
- Guide aggiornate alle API pubbliche, configurazione CSS e guardrail effettivi.
- Risultati storici distinti dal riepilogo corrente: 464 test e 11 integrazioni registrati
  nell’aggiornamento delle dipendenze; le singole fasi conservano i propri conteggi.
- Audit, specifiche e milestone collegati allo stato implementato senza dichiarare
  concluse le capacità prodotto ancora previste.

## Compatibilità Tailwind 4.3 — completata (2026-10-01)

- Sintassi dei token uniformata, gradienti e wrapping aggiornati; outline accessibile.
- Configurazioni legacy inutilizzate rimosse e guardrail automatico aggiunto.
- 98 conversioni distinte verificate come equivalenti dal compilatore Tailwind;
  check, build, Storybook e verifica visuale mobile light/dark verdi.

## UI condivisa del CMS — completata (2026-10-01)

- Nuovi componenti pubblici Toolbar, ContextMenu, IconTile, PageCanvas e CenteredPanel,
  con varianti, tipi, stories e documentazione.
- Accesso/MFA, editor, workflow e media adottano token e componenti comuni;
  variante danger condivisa e dialog accessibile per inserire link.
- Menu con tema e navigazione da tastiera, toolbar responsive e notifiche senza
  interferenze con i clic; guardrail contro palette locali nel chrome amministrativo.
- Verifica: 463 test ordinari e 17 scenari Chromium passati; check, build e Storybook verdi.

## [M7] Consolidamento Editorial, Media e qualità — completata (2026-10-01)

- Ownership applicata, restore validato senza cambiare pubblicazione e permesso publish
  obbligatorio anche nei workflow personalizzati.
- Indice slug parziale migrato senza rimuovere dati; storico e entry atomici in transazioni Mongo;
  snapshot concorrenti serializzati; modelli popolati protetti da modifiche distruttive.
- Editor e file manager modularizzati, renderer lazy e bundle principale ridotto da circa 794 a 397 kB.
- Frontend dei pack come peer opzionali e confini server/admin verificati in CI.
- Lint hook/ARIA attivi; file temporaneo Storybook rimosso dal repository; dipendenze ripristinate
  e aggiornate. Resta la sola segnalazione low esbuild Windows nel tooling transitivo.
- Corretti bootstrap eventi, apertura diretta delle pagine, messaggi errore media e retry cartelle.
- Stato progetto, task storici e procedure operative editoriali riallineati al codice.
- Verifica: 460 test ordinari, 10 integrazioni Mongo/S3 senza skip e 17 scenari Chromium passati;
  build, Storybook, lint, format, typecheck, SDK e controlli dipendenze/confini verdi.
- Mongo di sviluppo/CI ora replica set autenticato: requisito delle transazioni editoriali.

---

## [M6] Production Readiness — completata

### Avvio

- Creato il task `2026-07-04-production-readiness-e2e.md` per portare il progetto verso una
  readiness verificabile con smoke E2E, checklist deploy e hardening finale.

### Consolidato

- Harness Playwright introdotto con Chromium, database Mongo `_e2e` isolato, lifecycle fixture,
  trace/screenshot/video e report CI.
- Prima baseline production-readiness verde: installazione browser, login bearer/cookie, CSRF,
  admin extensions, settings/permission grants, template email e observability protetta.
- Snapshot OpenAPI e generated SDK riallineati con `system.listAdminExtensions()`.
- CI estesa a tutti i push, test Mongo reale obbligatorio, Storybook build ed E2E con artifact.
- Corretta la race del wizard che poteva inviare due volte il bootstrap durante il passaggio alla
  review.
- Toolchain aggiornata senza breaking change: audit runtime a zero vulnerabilita e audit completo
  ridotto a una sola segnalazione low su esbuild dev server Windows.
- Backoffice plugin UI disaccoppiata tramite renderer registry e `componentRef`.
- Flussi auth/email consolidati con test su secure payload, reset password, registrazione pubblica
  e verifica email.
- Runbook deploy production aggiunta con `.env`, Mongo, reverse proxy, CORS/CSRF, JWT, backup,
  restore e observability token.
- Checklist hardening security aggiunta per eventi sensibili, replay protection, permission
  escalation, CSRF e secret leakage.
- Wizard installazione consolidato: bootstrap sito/admin senza campi MongoDB, nessuna scrittura
  `.env`, settings sito verificati da test.
- API admin extensions stabilizzata su `/v1/admin/extensions`, con fallback backoffice al catalogo
  contribution legacy.

### Chiusura

- Release gate Playwright completato con 14/14 scenari browser/API verdi.
- Integrazione Mongo reale, smoke backup/restore e readiness `ok/degraded/down` verificati.
- Logout reso server-side e revoca JWT resa univoca tramite `jti`, eliminando collisioni tra
  sessioni create nello stesso secondo.
- Corretto l'update Mongo dei documenti applicativi che contengono un campo `value`.
- Il provisioning security differito completa i grant dei plugin caricati subito dopo il bootstrap,
  senza richiedere un riavvio del CMS.
- Log email console strutturati e token di verifica/reset redatti automaticamente.

---

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

## [M5] Plugin Runtime Foundation — completata

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
- [x] `2026-05-23-m5-discovery-registration-autoload.md`
- [x] `2026-05-23-m5-runtime-store-rehydration.md`
- [x] `2026-05-23-m5-failure-rollback-events.md`
- [x] `2026-05-23-m5-api-openapi-sdk.md`
- [x] `2026-05-23-m5-admin-plugin-operations.md`
- [x] `2026-05-23-m5-docs-troubleshooting-qa.md`

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
- Discovery, registration e autoload separati in una pipeline testabile:
  `bootstrapDiscoveredPlugins()` registra plugin scoperti, preserva diagnostica
  source e delega il caricamento a `loadMany()`.
- Runtime store rehydration aggiunta: il runtime ripristina stati persistiti,
  preserva `disabled`/`failed`, candida `loaded` ad autoload sicuro e marca
  plugin persistiti senza source come `plugin_source_missing`.
- Failure rollback completato: il catalogo contribution espone solo plugin
  caricati, ripulisce contribution su failure/unload/disable e gli eventi runtime
  includono fase, conteggio failure e `statusReason`.
- API/OpenAPI/SDK allineati: lo snapshot plugin include `source`, eventi plugin
  supportano `limit` e il generated SDK espone i DTO M5 aggiornati.
- Admin plugin operations aggiornato: la pagina mostra source, fase ultimo
  failure, dependency status, eventi recenti e azioni consentite dal backend.
- Documentazione M5 chiusa: guida runtime, troubleshooting IT/EN e README
  package aggiornati con flussi API/SDK/admin.

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

### M8 B1 — Editorial OpenAPI e SDK (2 ottobre 2026)

Documentate e tipizzate le 22 route Editorial, con errori 409 e JSON annidato.
Inventario del router confrontato con OpenAPI al bootstrap; cookie effettivo e firma
plugin documentati separatamente. CLI overlay esterna, pulizia con ownership e schemi
non supportati rifiutati. Trasporto binario Media preserva i byte. Admin Editorial migrato
ai metodi SDK. Verifica: 569 test pass, 13 skip opt-in; 20 integrazioni Mongo pass,
2 skip S3; 19 Chromium pass; SDK check, build e Storybook pass.

### M8 B2 e sviluppo C0 — 2 ottobre 2026

Packaging degli otto pacchetti MIT, registry locale e fixture tarball backend/admin
verificati fuori dal monorepo, con una copia React. Nessuna pubblicazione; versione
iniziale da fissare a G2. C0 in sviluppo: migrazioni con checkpoint, lock fencing e
maintenance transazionale; lifecycle attende il drain degli handler già iniziati.
Le superfici migration restano experimental e il gate di cluster/recovery è aperto.

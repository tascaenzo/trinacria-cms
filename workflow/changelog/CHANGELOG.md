# Changelog Operativo

## 2026-05-20

- Aperta la milestone documentale `M4.0 - Core Platform Specifications` per chiudere confini, contratti e comportamento della piattaforma core prima di nuove implementazioni.
- Chiusa la specifica `core-boundaries`: documentati confini tra Trinacria, `kernel`, `core-pack`, plugin dominio, `admin-kernel` e `trinacria-ui`, con regole decisionali e anti-pattern.
- Riallineato il planner M4.0 su specifiche core: plugin contract, runtime, security, storage, settings, admin extensibility, bootstrap, packaging/discovery, observability/operations e API/SDK contract.
- Spostati i task content/editorial precedenti in `workflow/tasks/backlog` per mantenere `todo` focalizzata sulla milestone core.
- Marcate M4 e M5 dominio come `deferred` finche `M4.0 - Core Platform Specifications` non e chiusa.
- Formalizzata la decisione Mongo-first: il kernel possiede il Mongo storage core, mentre `core-pack` e plugin dominio dichiarano repository/entity usando quei contratti; il supporto multi-database resta fuori scope.
- Aggiunto il documento fondativo `m4-core-platform-foundation.md` e i draft funzionali per configuration registry/secrets, namespace governance/alias e plugin event bus opzionale.
- Avviato il livello low-level di M4.0 con lo standard di specifica implementabile e il draft `plugin-contract.md`, includendo manifest target, API operative, DTO, storage Mongo, error model e gap col codice attuale.
- Consolidata la documentazione CMS sotto `docs/cms`: architettura in `docs/cms/architecture`, specifiche core in `docs/cms/specs/core-platform`, lasciando `docs/trinacria` separata come riferimento del framework.
- Completata la copertura draft low-level M4.0 per runtime plugin, security core, Mongo storage core, settings/configuration registry, admin extensibility, installation/bootstrap, packaging/discovery, observability/operations e API/SDK contract.
- Aggiunto nell'indice delle specifiche core platform l'ordine di lettura, l'ordine di implementazione consigliato, le dipendenze tra specifiche e il criterio per iniziare il codice.
- Chiuse le decisioni aperte M4.0: manifest unico come fonte dichiarativa, `DbAdapter` solo compat layer Mongo-first, event bus iniziale in-process e audit storage centralizzato in `core-pack`.

## 2026-05-15

- Chiusa formalmente la milestone `M3.5 - Design System Backoffice` e `M3.6 - Design System Accessibility Hardening`.
- Spostati 12 task da `in-progress` a `done` (8 M3.5 + 3 M3.6 hardening + 1 M3.6 docs).
- Aggiunto `**/storybook-static/**` a eslint ignores per evitare che lint analizzi build artifact.
- Aggiunto `**/storybook-static/` e `packages/sdk/src/generated/` a `.prettierignore`.
- Corretti 12 errori lint in `trinacria-ui` (import non usati, interfacce vuote).
- Allineata formattazione su 317 file con `prettier --write`.
- Verificato che `npm run build`, `npm run lint`, `npm run format`, `npm run typecheck` e `npm run test` passino su tutti i workspace.
- La milestone `M4` va reinterpretata come fondazione di un plugin editoriale esterno al core, in linea con la direzione plugin-first.

## 2026-04-11

- Aperta la milestone `M3.6 - Design System Accessibility Hardening` per consolidare accessibilita di form controls, dialog e picker custom di `packages/trinacria-ui` prima delle prossime milestone di prodotto.
- Hardened il layer a11y di `trinacria-ui`: `FormControl` ora collega label/hint/error ai controlli, `Dialog` gestisce semantica modal e focus trap, `DatePicker`/`TimePicker` espongono trigger e popup piu corretti per tastiera e screen reader, e il DS include ora una checklist operativa dedicata in Storybook foundations.

## 2026-04-06

- Inizializzata la struttura `workflow/` con task board locale, milestone e changelog operativo.
- Definito il flusso: `todo -> in-progress -> done`, con obbligo di aggiornare changelog e documentazione alla chiusura di ogni task.
- Chiusa la baseline M1 sul contratto utenti: `core-pack`, bootstrap installazione, SDK generato e backoffice convergono sul campo canonico `displayName`, mantenendo compatibilita di lettura sui record legacy con `firstName` e `lastName`.
- Ripristinata la baseline di quality check: `npm run build`, `npm run lint`, `npm run typecheck -w @trinacria-cms/admin-kernel`, `npm run typecheck -w @trinacria-cms/backoffice` e `npm run test -w @trinacria-cms/core-pack` risultano verdi.
- Riallineato il `README.md` root con la struttura reale del monorepo (`apps/playground`, `apps/backoffice`, `packages/sdk`, `packages/admin-kernel`, `packages/trinacria-ui`) e aggiunta una smoke checklist minima di ripartenza.
- Verificati gli smoke start di playground e backoffice: nel terminale sandbox i comandi `dev` possono fallire per limiti `EPERM` su bind IPC/porte locali, mentre fuori sandbox partono correttamente su `:3000` e `127.0.0.1:4174`.
- Formalizzata la decisione architetturale `settings` su sicurezza e ownership: letture operative ammesse, reveal/export/scritture owner-scoped e backoffice ammesso solo come broker plugin-aware, con nuovo riferimento documentale bilingue `0013`.
- Hardened il backend `settings`: letture non piu pubbliche, accesso separato admin/plugin signed, ownership errors tipizzati a `403`, OpenAPI snapshot e SDK riallineati al comportamento effettivo.
- Introdotto il catalogo bootstrap `core-pack` per i settings operativi: sito, URL pubblico, locale, timezone, branding minimo e feature flag editoriale vengono provisionati in modo idempotente dal plugin owner e letti correttamente dal backoffice overview.
- Aggiornata la UX backoffice `settings`: inspector con metadata secret mascherati, stati empty/error piu utili e handoff esplicito per richieste owner-signed sui valori non-secret, senza scrittura diretta dalla sessione admin.
- Completata la documentazione end-to-end del dominio `settings` con nuovo capitolo bilingue `0014`, esempi HTTP/SDK/backoffice e verifica finale monorepo verde su `npm run build`, `npm test` e `npm run lint`.
- Chiusa la review contrattuale `M3` del runtime plugin: introdotte ragioni di stato leggibili, operazioni runtime dichiarate (`load`, `unload`, `reload`, `disable`, `enable`), event log diagnostico bounded e discovery plugin arricchita con contesto failure/dependency operativo.
- Chiuse le API operative plugin `v1`: aggiunti `GET /v1/system/plugins/:pluginId` e `POST /v1/system/plugins/:pluginId/operations`, OpenAPI/SDK rigenerati e scope limitato alle sole azioni coerenti col runtime attuale (`load`, `unload`, `reload`, `disable`, `enable`).
- Rafforzata la diagnostica `M3`: runtime store con `statusReason` e metadata dell’ultimo errore, endpoint `GET /v1/system/plugins/:pluginId/events`, error payload delle operation API arricchiti con snapshot plugin ed eventi recenti, parser admin SDK esteso ai `details`.
- Aggiunta la pagina backoffice `Plugins`: inventario plugin, stato lifecycle, capability, dipendenze, azioni runtime supportate, eventi recenti ed error context sono ora leggibili e azionabili dalla shell admin.
- Chiusa la documentazione operativa plugin con nuovo capitolo bilingue `0015`, README docs aggiornati e verifica finale monorepo verde su `npm run build`, `npm test` e `npm run lint`; la milestone `M3` e ora coerentemente chiudibile.
- Hardening sicurezza `M3`: la superficie `kernel` `system/plugins*` e `system/capabilities` e ora protetta da un bridge admin esplicito fornito dal modulo auth del `core-pack`, l’OpenAPI dichiara `bearerAuth` reale e la route backoffice `plugins` e visibile solo con guard capability coerente (`core-pack` `plugins.read`).

# Changelog Operativo

## 2026-04-06

- Inizializzata la struttura `workflow/` con task board locale, milestone e changelog operativo.
- Definito il flusso: `todo -> in-progress -> done`, con obbligo di aggiornare changelog e documentazione alla chiusura di ogni task.
- Chiusa la baseline M1 sul contratto utenti: `core-pack`, bootstrap installazione, SDK generato e backoffice convergono sul campo canonico `displayName`, mantenendo compatibilita di lettura sui record legacy con `firstName` e `lastName`.
- Ripristinata la baseline di quality check: `npm run build`, `npm run lint`, `npm run typecheck -w @trinacria-cms/admin-kernel`, `npm run typecheck -w @trinacria-cms/backoffice` e `npm run test -w @trinacria-cms/core-pack` risultano verdi.
- Riallineato il `README.md` root con la struttura reale del monorepo (`apps/playground`, `apps/backoffice`, `packages/sdk`, `packages/admin-kernel`, `packages/admin-ui`) e aggiunta una smoke checklist minima di ripartenza.
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

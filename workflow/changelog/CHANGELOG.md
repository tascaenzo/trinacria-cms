# Changelog Operativo

## 2026-04-06

- Inizializzata la struttura `workflow/` con task board locale, milestone e changelog operativo.
- Definito il flusso: `todo -> in-progress -> done`, con obbligo di aggiornare changelog e documentazione alla chiusura di ogni task.
- Chiusa la baseline M1 sul contratto utenti: `core-pack`, bootstrap installazione, SDK generato e backoffice convergono sul campo canonico `displayName`, mantenendo compatibilita di lettura sui record legacy con `firstName` e `lastName`.
- Ripristinata la baseline di quality check: `npm run build`, `npm run lint`, `npm run typecheck -w @trinacria-cms/admin-kernel`, `npm run typecheck -w @trinacria-cms/backoffice` e `npm run test -w @trinacria-cms/core-pack` risultano verdi.
- Riallineato il `README.md` root con la struttura reale del monorepo (`apps/playground`, `apps/backoffice`, `packages/sdk`, `packages/admin-kernel`, `packages/admin-ui`) e aggiunta una smoke checklist minima di ripartenza.
- Verificati gli smoke start di playground e backoffice: nel terminale sandbox i comandi `dev` possono fallire per limiti `EPERM` su bind IPC/porte locali, mentre fuori sandbox partono correttamente su `:3000` e `127.0.0.1:4174`.

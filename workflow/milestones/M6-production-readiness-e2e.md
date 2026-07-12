# M6 - Production Readiness And E2E

Stato: `completed`

## Obiettivo

Trasformare la baseline tecnica M5 in una release candidate verificabile, con test browser/API,
Mongo reale, security gate e procedure operative riproducibili.

## Task inclusi

- [x] `workflow/tasks/done/2026-07-10-m6-e2e-harness-fixtures.md`
- [x] `workflow/tasks/done/2026-07-10-m6-installation-login-session-e2e.md`
- [x] `workflow/tasks/done/2026-07-10-m6-settings-permissions-email-e2e.md`
- [x] `workflow/tasks/done/2026-07-10-m6-auth-security-hardening-e2e.md`
- [x] `workflow/tasks/done/2026-07-10-m6-mongo-ops-observability.md`

## Esito finale

- `npm run e2e:ci`: 14/14 test passati
- `TRINACRIA_RUN_MONGO_INTEGRATION=1 npm run test:integration`: 1/1 passato
- build, unit test, lint, format, typecheck e SDK check verdi

## Dipendenze

- M5 plugin runtime completata
- Mongo 7 disponibile in locale e CI
- build playground e backoffice verdi

## Criterio di chiusura

- installazione, login e sessione sono coperti da browser E2E
- settings, permission center ed email template editor sono coperti da E2E
- CSRF, replay, privilege escalation e secret leakage hanno release gate automatici
- il test Mongo reale non puo essere saltato silenziosamente in CI
- backup/restore e superfici observability hanno smoke riproducibili
- report e trace E2E sono conservati come artifact CI

## Out of scope

- marketplace remoto
- content/editorial pack, da affrontare nella milestone prodotto successiva

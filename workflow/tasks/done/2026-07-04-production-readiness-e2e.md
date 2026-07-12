# Production Readiness And E2E Coverage Program

Stato: `completed`

## Obiettivo

Coordinare M6 e portare il CMS da MVP tecnico avanzato a candidato production-ready con smoke
E2E, checklist operativa e hardening finale.

## Area

`infra | core-pack | backoffice | docs`

## Milestone

`M6`

## Scope

- In scope:
  - infrastruttura E2E browser/API riproducibile e isolata
  - installazione, login, sessione e logout
  - settings, permission center, email template editor e admin extensions
  - flussi auth/email e controlli CSRF, replay, escalation e leakage
  - backup/restore Mongo, readiness, disaster recovery e observability
- Out of scope:
  - marketplace remoto plugin
  - primo dominio `content/editorial`, pianificato come milestone prodotto successiva

## Task operativi

- [x] `2026-07-10-m6-e2e-harness-fixtures.md`
- [x] `2026-07-10-m6-installation-login-session-e2e.md`
- [x] `2026-07-10-m6-settings-permissions-email-e2e.md`
- [x] `2026-07-10-m6-auth-security-hardening-e2e.md`
- [x] `2026-07-10-m6-mongo-ops-observability.md`

## File impattati

- `package.json`
- `apps/playground/`
- `apps/backoffice/`
- `docs/`
- `workflow/`

## Check

- `npm run build`
- `npm run test`
- `npm run test:integration`
- `npm run e2e`
- smoke E2E install/login/settings/email

## Esito

- build completa verde
- 14 test Playwright passati
- integrazione Mongo reale passata
- lint, format, typecheck e snapshot SDK verificati

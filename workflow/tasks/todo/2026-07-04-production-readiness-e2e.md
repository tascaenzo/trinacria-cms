# Production Readiness And E2E Coverage

## Obiettivo

Portare il CMS da MVP tecnico avanzato a candidato production-ready con smoke E2E, checklist
operativa e hardening finale.

## Area

`infra | core-pack | backoffice | docs`

## Milestone

`M6`

## Scope

- In scope:
  - scegliere e installare infrastruttura E2E browser per backoffice e API pubbliche
  - coprire installazione, login, settings, permission center, email template editor
  - coprire flussi API auth: registrazione, verifica email, reset password, invito
  - documentare deploy production con env, reverse proxy, Mongo, backup, restore e secrets
  - definire checklist security su CSRF, privilege escalation, replay, secret leakage
- Out of scope:
  - content model/editoriale completo
  - marketplace remoto plugin

## File impattati

- `package.json`
- `apps/playground/`
- `apps/backoffice/`
- `docs/`
- `workflow/`

## Check

- `npm run build`
- `npm run test`
- smoke E2E da definire nel task


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
  - coprire flussi FE/API auth: registrazione, verifica email, reset password, invito
  - coprire API admin extensions: `/v1/admin/extensions` come sorgente primaria, fallback legacy solo compat
  - coprire hardening: CSRF, privilege escalation, replay, secret leakage, log leakage
  - coprire operativita Mongo: backup, restore, readiness e disaster recovery smoke
  - coprire observability: `/ready`, `/metrics`, `/ops/checklist`, request id e token observability
  - avviare il primo dominio CMS reale (`content/editorial pack`) usando manifest admin e plugin runtime
- Out of scope:
  - marketplace remoto plugin

## Workstream

1. E2E harness
   - introdurre runner browser/API
   - script npm dedicati
   - fixture per playground + backoffice

2. Installazione e login
   - setup mode
   - wizard sito/admin/review
   - login post-bootstrap
   - session restore e logout

3. Auth/email da FE applicativo
   - registrazione pubblica
   - verifica email
   - reset password
   - invito utente
   - assert: nessun token sensibile nei payload evento pubblici/log

4. Backoffice settings/security
   - settings generici
   - permission center plugin
   - email provider settings
   - email template editor preview/save

5. Admin extensions API
   - endpoint `/v1/admin/extensions`
   - filtraggio solo plugin loaded
   - guard admin obbligatoria
   - fallback `/v1/system/plugin-contributions` mantenuto solo temporaneamente

6. Security hardening
   - CSRF mutazioni cookie-auth
   - replay protection plugin signed calls
   - permission escalation su endpoint admin
   - masking secret in API/settings/log
   - log leakage scan

7. Mongo production ops
   - documentare comandi backup/restore reali
   - smoke restore su database temporaneo
   - readiness e health degradati

8. Observability
   - metriche minime richieste per produzione
   - token obbligatorio in produzione per superfici operative
   - test su request id e JSON log sanitizzati

9. Content/editorial pack
   - content types
   - entries persistence/API
   - publish/unpublish
   - backoffice resource manifest
   - smoke E2E editoriale

## File impattati

- `package.json`
- `apps/playground/`
- `apps/backoffice/`
- `docs/`
- `workflow/`

## Check

- `npm run build`
- `npm run test`
- smoke E2E install/login/settings/email
- smoke E2E content/editorial quando il primo dominio sara disponibile

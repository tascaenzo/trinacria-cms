# M6 Auth And Security Hardening E2E

## Obiettivo

Rendere automatici i release gate per auth/email e per i rischi principali della piattaforma.

## Scope

- registrazione, verifica email, reset password e invito
- CSRF su mutazioni cookie-authenticated
- replay signed plugin calls e secure payload claims
- privilege escalation su route admin
- masking secret e scansione leakage in response/eventi/log

## Check

- `npm run e2e -- --grep "auth|csrf|replay|secret|permission"`
- `npm run test -w @trinacria-cms/core-pack`

## Avanzamento

- [x] CSRF su mutazione cookie-authenticated da origine non trusted
- [x] guard admin extensions e assenza secret runtime nelle response settings
- [x] registrazione, verifica email, reset password e invito single-use E2E
- [x] replay signed plugin call e secure payload claim, privilege escalation e leakage log
- [x] redazione token nei log JSON del provider email console

## Verifica completata

- `npm run e2e:ci`: 14 test Playwright passati
- `npm run test -w @trinacria-cms/core-pack`: 69 test passati

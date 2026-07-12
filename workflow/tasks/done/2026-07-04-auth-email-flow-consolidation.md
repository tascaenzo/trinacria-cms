# Auth Email Flow Consolidation

## Obiettivo

Consolidare i flussi auth/email esistenti con test mirati su payload sicuri, eventi e settings.

## Area

`core-pack`

## Milestone

`M5`

## Scope

- In scope:
  - test reset password via secure email payload
  - test registrazione pubblica con verifica email richiesta
  - test rispetto di `public_registration_default_status`
  - allineamento test controller con `AuthUserFlowsService`
- Out of scope:
  - UI applicativa pubblica per reset/verifica/inviti
  - E2E browser

## File impattati

- `packages/core-pack/src/modules/auth/services/auth-user-flows.service.ts`
- `packages/core-pack/test/auth.service.test.ts`

## Check

- `npm run test -w @trinacria-cms/core-pack`
- `npm run build`
- `npm run test`

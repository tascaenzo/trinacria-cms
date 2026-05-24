# Hardening backend settings e riallineamento contratti

## Obiettivo

Portare il backend `settings` a uno stato coerente dal punto di vista di autenticazione, ownership, OpenAPI e error model.

## Scope

- In scope: middleware e protezioni delle route settings
- In scope: errori tipizzati e codici coerenti
- In scope: OpenAPI e SDK allineati
- In scope: test aggiuntivi per casi limite
- Out of scope: UX backoffice

## File o aree impattate

- `packages/core-pack/src/modules/settings/**`
- `packages/sdk/openapi/trinacria-cms.openapi.json`
- `packages/sdk/src/generated/**`
- `packages/core-pack/test/settings*.test.ts`

## Check da eseguire

- `npm test -w @trinacria-cms/core-pack`
- `npm run build -w @trinacria-cms/sdk`
- `npm run test -w @trinacria-cms/sdk`

# Allineamento contratti utenti tra API, SDK e backoffice

## Obiettivo

Rendere coerente il contratto utenti tra backend `core-pack`, OpenAPI, SDK generato e `admin-kernel`.

## Scope

- In scope: scegliere e applicare il contratto sorgente corretto
- In scope: rigenerare SDK se necessario
- In scope: aggiornare backoffice e documentazione toccata
- Out of scope: redesign funzionale della gestione utenti

## File o aree impattate

- `packages/core-pack/src/modules/users/**`
- `packages/core-pack/src/modules/installation/**`
- `packages/sdk/openapi/trinacria-cms.openapi.json`
- `packages/sdk/src/generated/**`
- `packages/admin-kernel/src/**`

## Check da eseguire

- `npm run build`
- `npm run typecheck -w @trinacria-cms/admin-kernel`
- `npm test`

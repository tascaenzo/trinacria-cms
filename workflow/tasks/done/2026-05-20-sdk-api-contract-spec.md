# Specifica API e SDK contract

## Obiettivo

Definire il contratto API/SDK della piattaforma: convenzioni OpenAPI, API
envelope, versioning, compatibility, generated SDK e regole di evoluzione.

## Scope

- In scope: API envelope
- In scope: error format
- In scope: OpenAPI snapshot rules
- In scope: generated SDK workflow
- In scope: compatibility e versioning
- In scope: API pubbliche core vs API plugin
- Out of scope: implementazione di nuovi endpoint

## File o aree impattate

- `docs/cms/specs/core-platform/sdk-api-contract.md`
- `packages/sdk/README.md`
- `packages/sdk/openapi/trinacria-cms.openapi.json`

## Check da eseguire

- `npx prettier --check docs workflow packages/sdk/README.md`

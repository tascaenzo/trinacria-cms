# Specifica API e SDK contract

## Meta

- ID: `2026-05-20-sdk-api-contract-spec`
- Stato: `draft`
- Area: `docs`
- Milestone: `M4.0`
- Owner: `enzo`
- Creato il: `2026-05-20`
- Ultimo aggiornamento: `2026-05-20`

## Obiettivo

Definire il contratto API/SDK della piattaforma: convenzioni OpenAPI, API
envelope, versioning, compatibility, generated SDK e regole di evoluzione.

## Contesto

Il repo ha gia snapshot OpenAPI e SDK generato. Le prossime API core devono
seguire regole esplicite per non rompere backoffice e plugin.

## Scope

- In scope: API envelope
- In scope: error format
- In scope: OpenAPI snapshot rules
- In scope: generated SDK workflow
- In scope: compatibility e versioning
- In scope: API pubbliche core vs API plugin
- Out of scope: implementazione di nuovi endpoint

## Deliverable

- `docs/cms/specs/core-platform/sdk-api-contract.md`

## File o aree impattate

- `docs/cms/specs/core-platform/sdk-api-contract.md`
- `packages/sdk/README.md`
- `packages/sdk/openapi/trinacria-cms.openapi.json`

## Check da eseguire

- `npx prettier --check docs workflow packages/sdk/README.md`

## Note operative

La specifica deve rispettare la regola repo: non modificare a mano
`packages/sdk/src/generated/*`.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `yes`
- Follow-up aperti:

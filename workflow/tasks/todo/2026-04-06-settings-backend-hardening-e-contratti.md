# Hardening backend settings e riallineamento contratti

## Meta

- ID: `task-settings-backend-hardening`
- Stato: `todo`
- Area: `core-pack`
- Milestone: `M2`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Portare il backend `settings` a uno stato coerente dal punto di vista di autenticazione, ownership, OpenAPI e error model.

## Contesto

Il dominio `settings` esiste gia come infrastruttura robusta, ma va verificato che tutti gli endpoint riflettano la policy finale e che lo SDK generato rappresenti correttamente il comportamento.

## Scope

- In scope: middleware e protezioni delle route settings
- In scope: errori tipizzati e codici coerenti
- In scope: OpenAPI e SDK allineati
- In scope: test aggiuntivi per casi limite
- Out of scope: UX backoffice

## Deliverable

- route settings coerenti con la policy decisa
- SDK rigenerato e coerente
- test backend aggiornati

## File o aree impattate

- `packages/core-pack/src/modules/settings/**`
- `packages/sdk/openapi/trinacria-cms.openapi.json`
- `packages/sdk/src/generated/**`
- `packages/core-pack/test/settings*.test.ts`

## Dipendenze

- decisione architetturale del task ADR sui settings

## Check da eseguire

- `npm test -w @trinacria-cms/core-pack`
- `npm run build -w @trinacria-cms/sdk`
- `npm run test -w @trinacria-cms/sdk`

## Note operative

Verificare esplicitamente:

- protezione GET definitions
- protezione GET values
- protezione metadata secrets
- export settings
- consistenza tra docs OpenAPI e controller effettivo

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

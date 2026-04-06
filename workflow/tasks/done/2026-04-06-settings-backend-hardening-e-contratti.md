# Hardening backend settings e riallineamento contratti

## Meta

- ID: `task-settings-backend-hardening`
- Stato: `done`
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

Direzione applicata:

- letture definitions, definition detail e resolved values non sono piu pubbliche ma richiedono bearer admin o signed plugin auth;
- metadata secret mascherati supportano bearer admin oppure signed owner plugin;
- scritture, reveal ed export restano signed-only e owner-scoped;
- gli errori di ownership dei settings sono tipizzati come `403` coerenti tra service, controller e OpenAPI;
- il documento OpenAPI tracciato e lo SDK generato riflettono la stessa matrice di accesso.

## Chiusura

- Changelog aggiornato: `si`
- Documentazione aggiornata: `si`
- File modificati:
  - `packages/core-pack/src/modules/settings/**`
  - `packages/core-pack/test/settings*.test.ts`
  - `packages/kernel/src/runtime/cms-starter.ts`
  - `packages/sdk/openapi/trinacria-cms.openapi.json`
  - `docs/cms/it/0005-core-pack-architettura-file-per-file.md`
  - `docs/cms/en/0005-core-pack-file-by-file.md`
- Check eseguiti:
  - `npm run typecheck -w @trinacria-cms/core-pack`
  - `npm run build -w @trinacria-cms/core-pack`
  - `npm run test -w @trinacria-cms/core-pack`
  - `npm run build -w @trinacria-cms/sdk`
  - `npm run test -w @trinacria-cms/sdk`
- Follow-up aperti:
  - bootstrap di definizioni core realistiche nel task successivo

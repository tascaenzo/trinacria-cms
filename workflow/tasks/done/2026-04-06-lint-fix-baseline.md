# Ripristino baseline lint

## Meta

- ID: `task-lint-baseline`
- Stato: `done`
- Area: `infra`
- Milestone: `M1`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Ridurre gli errori lint attuali fino a ottenere una baseline pulita o dichiaratamente accettata.

## Contesto

`npm run lint` fallisce per una combinazione di problemi reali e regole non allineate al contesto del repo.

## Scope

- In scope: fix degli unused vars e delle configurazioni errate
- In scope: adeguamento delle regole lint dove tecnicamente giustificato
- Out of scope: introdurre nuove regole di stile non necessarie

## Deliverable

- lint verde oppure backlog esplicito dei casi non ancora risolti

## File o aree impattate

- `eslint.config.mjs`
- `apps/backoffice/postcss.config.cjs`
- `packages/admin-kernel/src/**`
- `packages/admin-ui/src/**`
- `packages/sdk/scripts/**`

## Check da eseguire

- `npm run lint`

## Note operative

Distinguere errori reali da mismatch di configurazione del lint.

## Chiusura

- Changelog aggiornato: `si`
- Documentazione aggiornata: `si`
- File modificati:
  - `eslint.config.mjs`
  - `apps/backoffice/postcss.config.cjs`
  - `packages/admin-kernel/src/pages/dashboard-page.tsx`
  - `packages/admin-kernel/src/pages/resource-placeholder-page.tsx`
  - `packages/admin-ui/src/shell/admin-shell.tsx`
  - `packages/sdk/scripts/generate-sdk.mjs`
  - `packages/sdk/scripts/snapshot-openapi.mjs`
- Follow-up aperti:
  - nessuno

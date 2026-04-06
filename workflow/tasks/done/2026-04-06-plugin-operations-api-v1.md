# API operative per gestione plugin V1

## Meta

- ID: `task-plugin-operations-api-v1`
- Stato: `done`
- Area: `kernel`
- Milestone: `M3`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Esporre il primo set di API operative per amministrare plugin installati e lifecycle supportato.

## Contesto

La discovery esiste gia, ma manca una superficie esplicita di operazioni amministrative, almeno per i casi consentiti dal modello runtime.

## Scope

- In scope: endpoint per operazioni supportate
- In scope: security model admin
- In scope: response shape e error model
- Out of scope: installazione da registry remoto se non ancora prevista

## Deliverable

- endpoint plugin operations
- test di comportamento
- OpenAPI e SDK aggiornati

## File o aree impattate

- `packages/kernel/src/http/**`
- `packages/kernel/src/runtime/**`
- `packages/sdk/**`

## Dipendenze

- review contrattuale runtime plugin

## Check da eseguire

- `npm test -w @trinacria-cms/kernel`
- `npm run build -w @trinacria-cms/sdk`

## Note operative

Le operazioni minime candidate:

- enable
- disable
- reload
- unregister

Da confermare contro i vincoli attuali del runtime.

## Chiusura

- Changelog aggiornato: `si`
- Documentazione aggiornata: `si`
- File modificati:
  - `packages/kernel/src/runtime/kernel-system-service.ts`
  - `packages/kernel/src/http/kernel-system.controller.ts`
  - `packages/kernel/test/kernel-system-service.test.ts`
  - `packages/sdk/openapi/trinacria-cms.openapi.json`
  - `packages/sdk/src/generated/system.gen.ts`
  - `packages/sdk/src/generated/types.gen.ts`
  - `docs/cms/it/0011-sdk-api-keys-discovery.md`
  - `docs/cms/en/0011-sdk-api-keys-discovery.md`
  - `workflow/changelog/CHANGELOG.md`
  - `workflow/milestones/M3-gestione-plugin-operativa.md`
- Check eseguiti:
  - `npm test -w @trinacria-cms/kernel`
  - `npm run build -w @trinacria-cms/kernel`
  - `npm run generate -w @trinacria-cms/sdk`
  - `npm run build -w @trinacria-cms/sdk`
- Follow-up aperti:
  - Rafforzare diagnostica persistita ed error payload delle operation API con contesto failure/eventi piu dettagliato.
  - Consumare le nuove API nel backoffice con una pagina admin plugin dedicata.

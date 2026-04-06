# Diagnostica runtime plugin ed error model operativo

## Meta

- ID: `task-plugin-runtime-diagnostics`
- Stato: `done`
- Area: `kernel`
- Milestone: `M3`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Rendere il runtime plugin diagnosticabile in modo operativo, con errori, cause e stati comprensibili da backoffice e tooling.

## Contesto

Lo stato plugin esiste ma non basta per operazioni reali se non si capisce perche un plugin e failed, disabled o bloccato.

## Scope

- In scope: taxonomy errori runtime
- In scope: metadati diagnostici minimi
- In scope: serializzazione leggibile verso API/admin
- Out of scope: observability distribuita avanzata

## Deliverable

- error model aggiornato
- payload diagnostici esposti
- test su failure mode chiave

## File o aree impattate

- `packages/kernel/src/errors/**`
- `packages/kernel/src/runtime/**`
- `packages/kernel/src/http/**`

## Dipendenze

- review contrattuale runtime plugin

## Check da eseguire

- `npm test -w @trinacria-cms/kernel`

## Note operative

I payload devono essere utili ad admin e sviluppatori, non solo corretti per il codice.

## Chiusura

- Changelog aggiornato: `si`
- Documentazione aggiornata: `si`
- File modificati:
  - `packages/kernel/src/contracts/plugin-runtime-store.ts`
  - `packages/kernel/src/runtime/plugin-runtime-store.ts`
  - `packages/kernel/src/runtime/kernel-system-service.ts`
  - `packages/kernel/src/http/kernel-system.controller.ts`
  - `packages/kernel/test/plugin-runtime-store.test.ts`
  - `packages/kernel/test/kernel-system-service.test.ts`
  - `packages/admin-kernel/src/lib/sdk-errors.ts`
  - `packages/sdk/openapi/trinacria-cms.openapi.json`
  - `packages/sdk/src/generated/system.gen.ts`
  - `packages/sdk/src/generated/types.gen.ts`
  - `docs/cms/it/0011-sdk-api-keys-discovery.md`
  - `docs/cms/en/0011-sdk-api-keys-discovery.md`
  - `workflow/changelog/CHANGELOG.md`
  - `workflow/milestones/M3-gestione-plugin-operativa.md`
- Check eseguiti:
  - `npm run build -w @trinacria-cms/kernel`
  - `npm test -w @trinacria-cms/kernel`
  - `npm run build -w @trinacria-cms/sdk`
- Follow-up aperti:
  - Proiettare i nuovi payload diagnostici nella UI admin plugin con rendering leggibile di errore, dipendenze ed eventi recenti.
  - Valutare in futuro un middleware admin condiviso per proteggere le operation API a livello kernel senza dipendere da `core-pack`.

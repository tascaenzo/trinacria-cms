# Documentazione operativa gestione plugin

## Meta

- ID: `task-plugin-operations-docs`
- Stato: `done`
- Area: `docs`
- Milestone: `M3`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Documentare il lifecycle operativo dei plugin e i flussi di amministrazione disponibili.

## Contesto

Quando il runtime diventa operabile dal backoffice, serve un riferimento chiaro per evitare uso improprio delle operazioni disponibili.

## Scope

- In scope: docs lifecycle
- In scope: docs endpoint e UI plugin admin
- In scope: troubleshooting di plugin failed/disabled
- Out of scope: documentazione marketplace esterno

## Deliverable

- capitolo docs plugin operations
- procedure di troubleshooting
- esempi di flusso admin

## File o aree impattate

- `docs/cms/it/**`
- `docs/cms/en/**`

## Dipendenze

- task tecnici `M3` avanzati o completati

## Check da eseguire

- review manuale coerenza con API reali

## Chiusura

- Changelog aggiornato: `si`
- Documentazione aggiornata: `si`
- File modificati:
  - `docs/cms/it/0015-operazioni-plugin-e-troubleshooting.md`
  - `docs/cms/en/0015-plugin-operations-and-troubleshooting.md`
  - `docs/cms/it/README.md`
  - `docs/cms/en/README.md`
  - `workflow/changelog/CHANGELOG.md`
  - `workflow/milestones/M3-gestione-plugin-operativa.md`
- Check eseguiti:
  - review manuale coerenza API/UI/docs
  - `npm run build`
  - `npm test`
  - `npm run lint`
- Follow-up aperti:
  - Nessuno dentro `M3`; eventuali estensioni future sono additive (`marketplace`, auth kernel-level condivisa, bulk ops).

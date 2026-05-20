# Specifica plugin event bus

## Meta

- ID: `2026-05-20-plugin-event-bus-spec`
- Stato: `draft`
- Area: `docs`
- Milestone: `M4.0`
- Owner: `enzo`
- Creato il: `2026-05-20`
- Ultimo aggiornamento: `2026-05-20`

## Obiettivo

Definire l'event bus opzionale della piattaforma: eventi core, eventi plugin,
publish/subscribe, visibilita, payload schema, delivery e policy.

## Contesto

Trinacria offre primitive eventi. Il CMS deve specializzarle per comunicazione
inter-plugin senza creare dipendenze dirette tra domini.

## Scope

- In scope: event declaration
- In scope: public/protected/private/audit events
- In scope: subscription policy
- In scope: sync/async/deferred delivery semantics
- In scope: error handling e diagnostics
- Out of scope: broker esterno obbligatorio

## Deliverable

- `docs/cms/specs/core-platform/plugin-event-bus.md`

## File o aree impattate

- `docs/cms/specs/core-platform/plugin-event-bus.md`
- `docs/cms/specs/core-platform/plugin-contract.md`
- `docs/cms/specs/core-platform/observability-operations.md`
- `docs/trinacria/en/0006-events-plugin.md`
- `docs/trinacria/it/0006-events-plugin.md`

## Check da eseguire

- `npx prettier --check docs workflow`

## Note operative

La prima implementazione puo essere in-process; la specifica deve lasciare spazio
a delivery persistente futura senza renderla obbligatoria.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `yes`
- Follow-up aperti:

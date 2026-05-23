# Specifica plugin event bus

## Obiettivo

Definire l'event bus opzionale della piattaforma: eventi core, eventi plugin,
publish/subscribe, visibilita, payload schema, delivery e policy.

## Scope

- In scope: event declaration
- In scope: public/protected/private/audit events
- In scope: subscription policy
- In scope: sync/async/deferred delivery semantics
- In scope: error handling e diagnostics
- Out of scope: broker esterno obbligatorio

## File o aree impattate

- `docs/cms/specs/core-platform/plugin-event-bus.md`
- `docs/cms/specs/core-platform/plugin-contract.md`
- `docs/cms/specs/core-platform/observability-operations.md`
- `docs/trinacria/en/0006-events-plugin.md`
- `docs/trinacria/it/0006-events-plugin.md`

## Check da eseguire

- `npx prettier --check docs workflow`

# Specifica admin extensibility core

## Meta

- ID: `2026-05-20-admin-contribution-resource-spec`
- Stato: `draft`
- Area: `docs`
- Milestone: `M4.0`
- Owner: `enzo`
- Creato il: `2026-05-20`
- Ultimo aggiornamento: `2026-05-20`

## Obiettivo

Definire il core di estensibilita backoffice: navigation, route, resource,
dashboard widget, settings section, visibility guard e UI custom mounting.

## Contesto

Abbiamo gia introdotto `AdminResourceDefinition`. Ora serve una specifica che
dica quando usare resource-driven admin e quando usare una pagina custom.

## Scope

- In scope: admin contribution contract
- In scope: resource-driven admin come utility
- In scope: capability-aware visibility
- In scope: override/custom UI
- In scope: mounting e ownership delle route plugin
- Out of scope: implementazione `ResourceListPage`

## Deliverable

- `docs/cms/specs/core-platform/admin-contribution-resource.md`

## File o aree impattate

- `docs/cms/specs/core-platform/admin-contribution-resource.md`
- `packages/admin-kernel/README.md`
- `docs/trinacria-ui-design-system.md`

## Check da eseguire

- `npx prettier --check docs workflow packages/admin-kernel/README.md`

## Note operative

La specifica deve evitare che resource-driven admin diventi un generatore
universale obbligatorio.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `yes`
- Follow-up aperti:

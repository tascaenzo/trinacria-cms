# Specifica admin extensibility core

## Obiettivo

Definire il core di estensibilita backoffice: navigation, route, resource,
dashboard widget, settings section, visibility guard e UI custom mounting.

## Scope

- In scope: admin contribution contract
- In scope: resource-driven admin come utility
- In scope: capability-aware visibility
- In scope: override/custom UI
- In scope: mounting e ownership delle route plugin
- Out of scope: implementazione `ResourceListPage`

## File o aree impattate

- `docs/cms/specs/core-platform/admin-contribution-resource.md`
- `packages/admin-kernel/README.md`
- `docs/trinacria-ui-design-system.md`

## Check da eseguire

- `npx prettier --check docs workflow packages/admin-kernel/README.md`

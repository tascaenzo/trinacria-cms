# Specifica namespace governance e alias

## Obiettivo

Definire regole di namespace, alias, reserved names e collision policy per tutte
le contribution core e plugin.

## Scope

- In scope: namespace canonici
- In scope: alias opzionali
- In scope: reserved namespace
- In scope: collision policy bloccante/non bloccante
- In scope: ownership identificatori
- Out of scope: marketplace remoto

## File o aree impattate

- `docs/cms/specs/core-platform/namespace-governance.md`
- `docs/cms/specs/core-platform/plugin-contract.md`
- `docs/cms/specs/core-platform/plugin-entity-mongo.md`

## Check da eseguire

- `npx prettier --check docs workflow`

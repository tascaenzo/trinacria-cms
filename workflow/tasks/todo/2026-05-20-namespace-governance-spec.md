# Specifica namespace governance e alias

## Meta

- ID: `2026-05-20-namespace-governance-spec`
- Stato: `draft`
- Area: `docs`
- Milestone: `M4.0`
- Owner: `enzo`
- Creato il: `2026-05-20`
- Ultimo aggiornamento: `2026-05-20`

## Obiettivo

Definire regole di namespace, alias, reserved names e collision policy per tutte
le contribution core e plugin.

## Contesto

Il CMS plugin-first deve evitare conflitti tra plugin su entity, settings,
permission, event, route admin e alias user-facing.

## Scope

- In scope: namespace canonici
- In scope: alias opzionali
- In scope: reserved namespace
- In scope: collision policy bloccante/non bloccante
- In scope: ownership identificatori
- Out of scope: marketplace remoto

## Deliverable

- `docs/cms/specs/core-platform/namespace-governance.md`

## File o aree impattate

- `docs/cms/specs/core-platform/namespace-governance.md`
- `docs/cms/specs/core-platform/plugin-contract.md`
- `docs/cms/specs/core-platform/plugin-entity-mongo.md`

## Check da eseguire

- `npx prettier --check docs workflow`

## Note operative

La specifica deve essere applicabile prima del load plugin.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `yes`
- Follow-up aperti:

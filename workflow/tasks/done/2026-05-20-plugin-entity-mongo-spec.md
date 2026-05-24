# Specifica Mongo storage core

## Obiettivo

Definire il Mongo storage core della piattaforma: entity declaration, schema,
repository contract, indici, namespace Mongo e isolamento tra plugin.

## Scope

- In scope: entity declaration
- In scope: namespace fisico e canonical ID
- In scope: index declaration
- In scope: repository convention
- In scope: isolamento storage tra plugin
- In scope: decisione Mongo-first e fuori scope multi-database
- In scope: evoluzione/migrazione documenti
- Out of scope: implementazione di migration runner
- Out of scope: supporto Postgres/MySQL o astrazione multi-database generica

## File o aree impattate

- `docs/cms/specs/core-platform/plugin-entity-mongo.md`
- `docs/cms/en/0004-persistence-mongo-and-entity.md`
- `docs/cms/it/0004-persistence-mongo-e-entity.md`

## Check da eseguire

- `npx prettier --check docs workflow`

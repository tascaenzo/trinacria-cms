# Specifica Mongo storage core

## Meta

- ID: `2026-05-20-plugin-entity-mongo-spec`
- Stato: `draft`
- Area: `docs`
- Milestone: `M4.0`
- Owner: `enzo`
- Creato il: `2026-05-20`
- Ultimo aggiornamento: `2026-05-20`

## Obiettivo

Definire il Mongo storage core della piattaforma: entity declaration, schema,
repository contract, indici, namespace Mongo e isolamento tra plugin.

## Contesto

Mongo e una scelta intenzionale, non un dettaglio nascosto dietro una astrazione
multi-database generica. La flessibilita va governata tramite namespace, schema,
DTO, repository, indici e ownership plugin.

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

## Deliverable

- `docs/cms/specs/core-platform/plugin-entity-mongo.md`

## File o aree impattate

- `docs/cms/specs/core-platform/plugin-entity-mongo.md`
- `docs/cms/en/0004-persistence-mongo-and-entity.md`
- `docs/cms/it/0004-persistence-mongo-e-entity.md`

## Check da eseguire

- `npx prettier --check docs workflow`

## Note operative

La specifica deve essere compatibile con `EntityRegistry` e `MongoDbAdapter`
esistenti, ma deve descrivere il target come Mongo storage core nel kernel.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `yes`
- Follow-up aperti:

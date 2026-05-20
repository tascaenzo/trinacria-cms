# Fondazioni content types

## Meta

- ID: `task-content-types-foundation`
- Stato: `todo`
- Area: `core-pack`
- Milestone: `M4`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Implementare il modello iniziale dei content type, con schema persistito, validazione e API amministrative minime.

## Contesto

Senza content type non esiste un CMS editoriale: mancano struttura, contratti e validazione per le future entries.

## Scope

- In scope: entity schema content types
- In scope: repository/service/controller/module
- In scope: campi base dei field type
- Out of scope: rendering frontend

## Deliverable

- API `content types` operative
- persistenza Mongo
- test di dominio

## File o aree impattate

- nuovo dominio in `packages/core-pack/src/modules/**` o plugin dedicato
- `packages/sdk/**`
- docs relative

## Dipendenze

- ADR dominio contenuti chiusa

## Check da eseguire

- build package coinvolto
- test package coinvolto
- SDK rigenerato

## Note operative

Field type minimi suggeriti:

- text
- rich_text
- number
- boolean
- date_time
- relation

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

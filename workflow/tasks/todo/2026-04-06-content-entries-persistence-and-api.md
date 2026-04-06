# Entries contenuto: persistenza e API V1

## Meta

- ID: `task-content-entries-api-v1`
- Stato: `todo`
- Area: `core-pack`
- Milestone: `M4`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Introdurre la persistenza e le API per creare, leggere e aggiornare entries basate sui content type definiti.

## Contesto

Una volta definiti i content type, il passo successivo e rendere effettivo il contenuto persistito.

## Scope

- In scope: create/read/update/list entries
- In scope: validazione contro schema content type
- In scope: metadata minimi entry
- Out of scope: publish workflow avanzato

## Deliverable

- entity entries
- service e controller
- test end-to-end del dominio

## File o aree impattate

- dominio content entries
- `packages/sdk/**`
- docs relative

## Dipendenze

- content types foundation completato

## Check da eseguire

- test dominio
- build SDK
- smoke API manuale

## Note operative

Metadati minimi suggeriti:

- id
- contentTypeId
- slug opzionale
- data payload
- status tecnico iniziale
- createdAt/updatedAt

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

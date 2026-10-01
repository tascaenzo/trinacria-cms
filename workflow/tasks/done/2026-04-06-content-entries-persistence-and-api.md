# Entries contenuto: persistenza e API V1

Stato: `completed` — riallineato al codice il 1 ottobre 2026.

Esito: fondazione implementata in `packages/editorial-pack`; specifica in
`docs/cms/specs/domains/editorial-pack.md`, procedure in
`docs/cms/it/0023-editorial-operazioni.md` e verifiche nel consolidamento M7.

## Obiettivo

Introdurre la persistenza e le API per creare, leggere e aggiornare entries basate sui content type definiti.

## Scope

- In scope: create/read/update/list entries
- In scope: validazione contro schema content type
- In scope: metadata minimi entry
- Out of scope: publish workflow avanzato

## File o aree impattate

- dominio content entries
- `packages/sdk/**`
- docs relative

## Check da eseguire

- test dominio
- build SDK
- smoke API manuale

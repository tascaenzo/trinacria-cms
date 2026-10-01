# ADR dominio contenuti e bounded context iniziale

Stato: `completed` — riallineato al codice il 1 ottobre 2026.

Esito: fondazione implementata in `packages/editorial-pack`; specifica in
`docs/cms/specs/domains/editorial-pack.md`, procedure in
`docs/cms/it/0023-editorial-operazioni.md` e verifiche nel consolidamento M7.

## Obiettivo

Definire il bounded context del dominio contenuti e decidere la forma iniziale del primo plugin contenuti del CMS.

## Scope

- In scope: content types
- In scope: entries
- In scope: campi base e validazione
- In scope: relazione con plugin system
- Out of scope: workflow editoriale avanzato

## File o aree impattate

- `docs/**`
- eventuale nuovo plugin dominio in `packages/`

## Check da eseguire

- review architetturale dei package correnti

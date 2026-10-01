# Fondazioni content types

Stato: `completed` — riallineato al codice il 1 ottobre 2026.

Esito: fondazione implementata in `packages/editorial-pack`; specifica in
`docs/cms/specs/domains/editorial-pack.md`, procedure in
`docs/cms/it/0023-editorial-operazioni.md` e verifiche nel consolidamento M7.

## Obiettivo

Implementare il modello iniziale dei content type, con schema persistito, validazione e API amministrative minime.

## Scope

- In scope: entity schema content types
- In scope: repository/service/controller/module
- In scope: campi base dei field type
- Out of scope: rendering frontend

## File o aree impattate

- nuovo dominio in `packages/core-pack/src/modules/**` o plugin dedicato
- `packages/sdk/**`
- docs relative

## Check da eseguire

- build package coinvolto
- test package coinvolto
- SDK rigenerato

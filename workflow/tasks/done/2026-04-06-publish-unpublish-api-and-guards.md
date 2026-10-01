# API publish/unpublish e guardie editoriali

Stato: `completed` — riallineato al codice il 1 ottobre 2026.

Esito: fondazione implementata in `packages/editorial-pack`; specifica in
`docs/cms/specs/domains/editorial-pack.md`, procedure in
`docs/cms/it/0023-editorial-operazioni.md` e verifiche nel consolidamento M7.

## Obiettivo

Implementare le API e le regole autorizzative per pubblicare e ritirare contenuti.

## Scope

- In scope: endpoint publish/unpublish
- In scope: permission editoriali
- In scope: regole di validazione pre-publish
- Out of scope: scheduling temporale di pubblicazione

## File o aree impattate

- moduli contenuti
- moduli security
- SDK e docs

## Check da eseguire

- test backend
- build SDK

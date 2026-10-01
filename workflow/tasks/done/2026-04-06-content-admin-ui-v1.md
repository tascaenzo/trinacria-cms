# Backoffice content types ed entries V1

Stato: `completed` — riallineato al codice il 1 ottobre 2026.

Esito: fondazione implementata in `packages/editorial-pack`; specifica in
`docs/cms/specs/domains/editorial-pack.md`, procedure in
`docs/cms/it/0023-editorial-operazioni.md` e verifiche nel consolidamento M7.

## Obiettivo

Offrire la prima superficie backoffice per amministrare content type ed entries.

## Scope

- In scope: lista e dettaglio content types
- In scope: lista e dettaglio entries
- In scope: form minimi di creazione/modifica
- Out of scope: editor avanzato rich text full-featured

## File o aree impattate

- `packages/admin-kernel/src/**`
- `packages/trinacria-ui/src/**`

## Check da eseguire

- typecheck admin-kernel
- build backoffice

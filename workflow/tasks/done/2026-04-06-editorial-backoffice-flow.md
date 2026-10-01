# Flussi backoffice editoriali

Stato: `completed` — riallineato al codice il 1 ottobre 2026.

Esito: fondazione implementata in `packages/editorial-pack`; specifica in
`docs/cms/specs/domains/editorial-pack.md`, procedure in
`docs/cms/it/0023-editorial-operazioni.md` e verifiche nel consolidamento M7.

## Obiettivo

Implementare nel backoffice i flussi editoriali minimi per draft, revisione e pubblicazione.

## Scope

- In scope: stati visibili in lista e dettaglio
- In scope: azioni publish/unpublish
- In scope: accesso a storico/revisioni
- Out of scope: workflow approvativo multi-ruolo

## File o aree impattate

- `packages/admin-kernel/src/**`
- eventuali componenti `packages/trinacria-ui/src/**`

## Check da eseguire

- typecheck admin-kernel
- build backoffice

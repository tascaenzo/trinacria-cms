# Flussi backoffice editoriali

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

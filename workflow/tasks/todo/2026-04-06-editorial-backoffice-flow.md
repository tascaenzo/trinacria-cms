# Flussi backoffice editoriali

## Meta

- ID: `task-editorial-backoffice-flow`
- Stato: `todo`
- Area: `backoffice`
- Milestone: `M5`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Implementare nel backoffice i flussi editoriali minimi per draft, revisione e pubblicazione.

## Contesto

Con API editoriali disponibili serve una UX che renda comprensibili stati, azioni e storico della entry.

## Scope

- In scope: stati visibili in lista e dettaglio
- In scope: azioni publish/unpublish
- In scope: accesso a storico/revisioni
- Out of scope: workflow approvativo multi-ruolo

## Deliverable

- pagine admin editoriali aggiornate
- feedback chiaro per transizioni e errori
- supporto mobile minimo

## File o aree impattate

- `packages/admin-kernel/src/**`
- eventuali componenti `packages/admin-ui/src/**`

## Dipendenze

- API editoriali attive

## Check da eseguire

- typecheck admin-kernel
- build backoffice

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

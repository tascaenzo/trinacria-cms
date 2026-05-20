# Backoffice content types ed entries V1

## Meta

- ID: `task-content-admin-ui-v1`
- Stato: `todo`
- Area: `backoffice`
- Milestone: `M4`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Offrire la prima superficie backoffice per amministrare content type ed entries.

## Contesto

Il valore del dominio contenuti cresce davvero quando e navigabile dal backoffice, non solo via API.

## Scope

- In scope: lista e dettaglio content types
- In scope: lista e dettaglio entries
- In scope: form minimi di creazione/modifica
- Out of scope: editor avanzato rich text full-featured

## Deliverable

- route admin contenuti
- pagine base gestibili
- integrazione SDK

## File o aree impattate

- `packages/admin-kernel/src/**`
- `packages/trinacria-ui/src/**`

## Dipendenze

- API content types ed entries disponibili

## Check da eseguire

- typecheck admin-kernel
- build backoffice

## Note operative

Tenere la UI esplicita e funzionale: meglio forme semplici ma corrette che editor sofisticati prematuri.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

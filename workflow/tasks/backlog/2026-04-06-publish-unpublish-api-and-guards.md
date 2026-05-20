# API publish/unpublish e guardie editoriali

## Meta

- ID: `task-publish-unpublish-guards`
- Stato: `todo`
- Area: `core-pack`
- Milestone: `M5`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Implementare le API e le regole autorizzative per pubblicare e ritirare contenuti.

## Contesto

Le transizioni editoriali devono essere esplicite e protette da permission dedicate o policy equivalenti.

## Scope

- In scope: endpoint publish/unpublish
- In scope: permission editoriali
- In scope: regole di validazione pre-publish
- Out of scope: scheduling temporale di pubblicazione

## Deliverable

- API editoriali
- permission keys coerenti
- test autorizzazione e workflow

## File o aree impattate

- moduli contenuti
- moduli security
- SDK e docs

## Dipendenze

- modello stati editoriali definito

## Check da eseguire

- test backend
- build SDK

## Note operative

Definire chiaramente se una entry pubblicata modifica la stessa risorsa o genera una revisione promossa a live.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

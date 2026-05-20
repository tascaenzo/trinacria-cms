# ADR dominio contenuti e bounded context iniziale

## Meta

- ID: `task-content-domain-adr`
- Stato: `todo`
- Area: `docs`
- Milestone: `M4`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Definire il bounded context del dominio contenuti e decidere la forma iniziale del primo plugin contenuti del CMS.

## Contesto

Il progetto oggi e molto forte su framework, security e configuration, ma non ha ancora un dominio editoriale reale. Prima di implementare bisogna fissare confini e modello.

## Scope

- In scope: content types
- In scope: entries
- In scope: campi base e validazione
- In scope: relazione con plugin system
- Out of scope: workflow editoriale avanzato

## Deliverable

- documento decisionale
- mappa bounded context
- lista invarianti del dominio contenuti

## File o aree impattate

- `docs/**`
- eventuale nuovo plugin dominio in `packages/`

## Dipendenze

- baseline tecnica stabile

## Check da eseguire

- review architetturale dei package correnti

## Note operative

Decidere almeno:

- plugin che ospita il dominio
- naming entita
- livello di dinamicita del content model
- formato dei field type iniziali

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

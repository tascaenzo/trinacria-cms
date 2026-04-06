# Diagnostica runtime plugin ed error model operativo

## Meta

- ID: `task-plugin-runtime-diagnostics`
- Stato: `todo`
- Area: `kernel`
- Milestone: `M3`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Rendere il runtime plugin diagnosticabile in modo operativo, con errori, cause e stati comprensibili da backoffice e tooling.

## Contesto

Lo stato plugin esiste ma non basta per operazioni reali se non si capisce perche un plugin e failed, disabled o bloccato.

## Scope

- In scope: taxonomy errori runtime
- In scope: metadati diagnostici minimi
- In scope: serializzazione leggibile verso API/admin
- Out of scope: observability distribuita avanzata

## Deliverable

- error model aggiornato
- payload diagnostici esposti
- test su failure mode chiave

## File o aree impattate

- `packages/kernel/src/errors/**`
- `packages/kernel/src/runtime/**`
- `packages/kernel/src/http/**`

## Dipendenze

- review contrattuale runtime plugin

## Check da eseguire

- `npm test -w @trinacria-cms/kernel`

## Note operative

I payload devono essere utili ad admin e sviluppatori, non solo corretti per il codice.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

# Pattern composti `admin-ui` per il backoffice

## Meta

- ID: `task-admin-ui-composed-patterns`
- Stato: `in-progress`
- Area: `backoffice`
- Milestone: `M3.5`
- Owner: `enzo`
- Creato il: `2026-04-10`
- Ultimo aggiornamento: `2026-04-10`

## Obiettivo

Estrarre e formalizzare i pattern UI composti che il backoffice usa ripetutamente, così da riusarli in `M4` e `M5`.

## Contesto

I componenti base non bastano per un backoffice consistente: servono pattern di composizione reali, altrimenti ogni pagina continua a inventare layout e micro-interazioni.

## Scope

- In scope: page header
- In scope: filter/action bar
- In scope: detail section
- In scope: record list/table wrapper
- In scope: status summary blocks
- In scope: empty/error/loading wrappers se utili
- Out of scope: interi page module business-specific

## Deliverable

- pattern composti riusabili
- riduzione di JSX ripetuto in `admin-kernel`
- base pronta per schermate contenuti future

## File o aree impattate

- `packages/trinacria-ui/src/**`
- `packages/admin-kernel/src/**`

## Dipendenze

- audit confini
- componenti base consolidati

## Check da eseguire

- `npm run build -w @trinacria-cms/trinacria-ui`
- `npm run build -w @trinacria-cms/backoffice`

## Note operative

I pattern devono nascere da uso reale nel repo, non da cataloghi teorici di componenti enterprise.

Avanzamento iniziale:

- promossi in `admin-ui` i pattern `FeedbackBanner`, `ErrorBanner`, `EmptyState`
- promossi in `admin-ui` i pattern `MobileRecordList`, `MobileRecordCard`, `MobileRecordField`
- introdotti `PageHeader` e `ActionBar` come primi layout block riusabili
- `admin-kernel` riallineato con re-export compatibili dai vecchi file locali

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

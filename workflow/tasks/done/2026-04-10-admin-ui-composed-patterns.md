# Pattern composti `admin-ui` per il backoffice

## Obiettivo

Estrarre e formalizzare i pattern UI composti che il backoffice usa
ripetutamente, cosi da riusarli nelle milestone core successive.

## Scope

- In scope: page header
- In scope: filter/action bar
- In scope: detail section
- In scope: record list/table wrapper
- In scope: status summary blocks
- In scope: empty/error/loading wrappers se utili
- Out of scope: interi page module business-specific

## File o aree impattate

- `packages/trinacria-ui/src/**`
- `packages/admin-kernel/src/**`

## Check da eseguire

- `npm run build -w @trinacria-cms/trinacria-ui`
- `npm run build -w @trinacria-cms/backoffice`

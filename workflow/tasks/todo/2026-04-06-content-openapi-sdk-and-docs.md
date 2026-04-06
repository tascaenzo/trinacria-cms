# OpenAPI, SDK e docs del dominio contenuti

## Meta

- ID: `task-content-sdk-docs`
- Stato: `todo`
- Area: `sdk`
- Milestone: `M4`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Rendere il dominio contenuti disponibile in modo typed via OpenAPI/SDK e documentato come parte ufficiale del CMS.

## Contesto

Senza SDK e documentazione, il dominio contenuti rimane solo backend locale e non entra davvero nel modello prodotto.

## Scope

- In scope: OpenAPI snapshot
- In scope: SDK generato
- In scope: catalogo ufficiale se applicabile
- In scope: docs end-to-end
- Out of scope: SDK pubblicato esternamente se non ancora pronto

## Deliverable

- `packages/sdk` aggiornato
- docs contenuti aggiornate
- esempi di utilizzo minimi

## File o aree impattate

- `packages/sdk/**`
- `docs/cms/**`

## Dipendenze

- API content types/entries disponibili

## Check da eseguire

- `npm run build -w @trinacria-cms/sdk`
- `npm run test -w @trinacria-cms/sdk`

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

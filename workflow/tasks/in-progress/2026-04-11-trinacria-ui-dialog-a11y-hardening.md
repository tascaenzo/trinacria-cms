# Trinacria UI Dialog A11y Hardening

## Meta

- ID: `task-trinacria-ui-dialog-a11y-hardening`
- Stato: `in-progress`
- Area: `backoffice`
- Milestone: `M3.6`
- Owner: `enzo`
- Creato il: `2026-04-11`
- Ultimo aggiornamento: `2026-04-11`

## Obiettivo

Rendere `Dialog` semanticamente corretto come modal/drawer accessibile con focus trap, restore focus e naming coerente.

## Contesto

Il dialog del DS oggi gestisce solo chiusura via overlay ed `Escape`, ma non espone ancora `role="dialog"`, `aria-modal`, relazioni titolo/descrizione e gestione robusta del focus.

## Scope

- In scope:
- semantica modal accessibile
- focus iniziale e restore focus al trigger
- trap del focus mentre il dialog e aperto
- naming con `aria-labelledby` e `aria-describedby`
- Out of scope:
- migrazione a librerie esterne headless
- redesign visivo del componente

## Deliverable

- `Dialog` hardenizzato per tastiera e screen reader
- stories/documentazione allineate al nuovo comportamento

## File o aree impattate

- `packages/trinacria-ui/src/components/molecules/dialog/*`

## Check da eseguire

- `npm run build -w @trinacria-cms/trinacria-ui`
- `npm run storybook:build -w @trinacria-cms/trinacria-ui`

## Note operative

Il comportamento deve restare compatibile sia con `variant="modal"` sia con `variant="drawer"`.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

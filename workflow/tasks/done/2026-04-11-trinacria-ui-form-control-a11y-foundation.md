# Trinacria UI Form Control A11y Foundation

## Meta

- ID: `task-trinacria-ui-form-control-a11y-foundation`
- Stato: `in-progress`
- Area: `backoffice`
- Milestone: `M3.6`
- Owner: `enzo`
- Creato il: `2026-04-11`
- Ultimo aggiornamento: `2026-04-11`

## Obiettivo

Centralizzare nel layer `FormControl` gli hook semantici necessari per collegare label, hint, error e stato dei controlli del DS.

## Contesto

Gli input semplici del DS sono buoni visivamente, ma hint ed error non sono ancora associati ai controlli tramite `aria-describedby` e `aria-errormessage`. Senza questa base comune, ogni nuovo componente rischia di divergere.

## Scope

- In scope:
- introdurre id stabili per label, hint ed error
- collegare `Input`, `Select`, `Textarea` e campi affini alla semantic layer condivisa
- uniformare `aria-invalid`, `aria-describedby` e `aria-errormessage`
- Out of scope:
- redesign visivo dei form
- validazione applicativa di business

## Deliverable

- primitive `FormControl` piu robusta dal punto di vista a11y
- adozione nei controlli form base del DS

## File o aree impattate

- `packages/trinacria-ui/src/components/atoms/form-control/*`
- `packages/trinacria-ui/src/components/atoms/input/*`
- `packages/trinacria-ui/src/components/atoms/select/*`
- `packages/trinacria-ui/src/components/atoms/textarea/*`

## Check da eseguire

- `npm run build -w @trinacria-cms/trinacria-ui`
- `npm run storybook:build -w @trinacria-cms/trinacria-ui`

## Note operative

La soluzione deve diventare il contratto standard per tutti i futuri controlli del DS.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

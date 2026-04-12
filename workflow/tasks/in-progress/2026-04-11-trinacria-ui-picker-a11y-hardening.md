# Trinacria UI Picker A11y Hardening

## Meta

- ID: `task-trinacria-ui-picker-a11y-hardening`
- Stato: `in-progress`
- Area: `backoffice`
- Milestone: `M3.6`
- Owner: `enzo`
- Creato il: `2026-04-11`
- Ultimo aggiornamento: `2026-04-11`

## Obiettivo

Rendere `DatePicker`, `TimePicker` e `DateTimePicker` piu affidabili per tastiera e tecnologie assistive.

## Contesto

I picker custom hanno sostituito i controlli nativi del sistema operativo, ma devono ora recuperare le garanzie di semantica e navigazione che i controlli nativi offrivano gratuitamente.

## Scope

- In scope:
- trigger con semantica popup corretta
- relazioni `aria-controls` e `aria-expanded`
- keyboard navigation e dismiss robusti
- collegamento corretto di label, hint ed error
- Out of scope:
- internationalization completa del calendario
- supporto mobile-specific avanzato

## Deliverable

- `DatePicker`, `TimePicker` e `DateTimePicker` accessibili in modo piu coerente
- docs/stories aggiornate dove necessario

## File o aree impattate

- `packages/trinacria-ui/src/components/atoms/date-picker/*`
- `packages/trinacria-ui/src/components/atoms/time-picker/*`
- `packages/trinacria-ui/src/components/atoms/date-time-picker/*`

## Check da eseguire

- `npm run build -w @trinacria-cms/trinacria-ui`
- `npm run storybook:build -w @trinacria-cms/trinacria-ui`
- smoke keyboard check via Storybook locale

## Note operative

Il requisito minimo e eliminare markup non valido e introdurre una navigazione tastiera coerente, anche se non ancora perfetta come un calendario WCAG completo.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

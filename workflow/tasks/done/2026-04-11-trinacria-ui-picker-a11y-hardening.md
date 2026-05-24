# Trinacria UI Picker A11y Hardening

## Obiettivo

Rendere `DatePicker`, `TimePicker` e `DateTimePicker` piu affidabili per tastiera e tecnologie assistive.

## Scope

- In scope:
- trigger con semantica popup corretta
- relazioni `aria-controls` e `aria-expanded`
- keyboard navigation e dismiss robusti
- collegamento corretto di label, hint ed error
- Out of scope:
- internationalization completa del calendario
- supporto mobile-specific avanzato

## File o aree impattate

- `packages/trinacria-ui/src/components/atoms/date-picker/*`
- `packages/trinacria-ui/src/components/atoms/time-picker/*`
- `packages/trinacria-ui/src/components/atoms/date-time-picker/*`

## Check da eseguire

- `npm run build -w @trinacria-cms/trinacria-ui`
- `npm run storybook:build -w @trinacria-cms/trinacria-ui`
- smoke keyboard check via Storybook locale

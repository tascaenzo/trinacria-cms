# Trinacria UI Dialog A11y Hardening

## Obiettivo

Rendere `Dialog` semanticamente corretto come modal/drawer accessibile con focus trap, restore focus e naming coerente.

## Scope

- In scope:
- semantica modal accessibile
- focus iniziale e restore focus al trigger
- trap del focus mentre il dialog e aperto
- naming con `aria-labelledby` e `aria-describedby`
- Out of scope:
- migrazione a librerie esterne headless
- redesign visivo del componente

## File o aree impattate

- `packages/trinacria-ui/src/components/molecules/dialog/*`

## Check da eseguire

- `npm run build -w @trinacria-cms/trinacria-ui`
- `npm run storybook:build -w @trinacria-cms/trinacria-ui`

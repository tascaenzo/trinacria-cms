# Fondazioni visuali e token `admin-ui`

## Obiettivo

Definire le fondazioni visuali condivise del backoffice: token, palette, spaziature, superfici, tipografia e stati semantici.

## Scope

- In scope: token colore
- In scope: typography scale
- In scope: spacing/radius/shadow
- In scope: stati semantici (`success`, `warning`, `error`, `info`, `neutral`)
- Out of scope: redesign totale del backoffice

## File o aree impattate

- `packages/trinacria-ui/src/**`
- `apps/backoffice/src/index.css`
- eventuale configurazione Storybook futura

## Check da eseguire

- `npm run build -w @trinacria-cms/trinacria-ui`
- `npm run build -w @trinacria-cms/backoffice`

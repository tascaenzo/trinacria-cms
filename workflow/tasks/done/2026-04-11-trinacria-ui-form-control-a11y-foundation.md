# Trinacria UI Form Control A11y Foundation

## Obiettivo

Centralizzare nel layer `FormControl` gli hook semantici necessari per collegare label, hint, error e stato dei controlli del DS.

## Scope

- In scope:
- introdurre id stabili per label, hint ed error
- collegare `Input`, `Select`, `Textarea` e campi affini alla semantic layer condivisa
- uniformare `aria-invalid`, `aria-describedby` e `aria-errormessage`
- Out of scope:
- redesign visivo dei form
- validazione applicativa di business

## File o aree impattate

- `packages/trinacria-ui/src/components/atoms/form-control/*`
- `packages/trinacria-ui/src/components/atoms/input/*`
- `packages/trinacria-ui/src/components/atoms/select/*`
- `packages/trinacria-ui/src/components/atoms/textarea/*`

## Check da eseguire

- `npm run build -w @trinacria-cms/trinacria-ui`
- `npm run storybook:build -w @trinacria-cms/trinacria-ui`

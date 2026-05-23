# Hardening componenti base `admin-ui`

## Obiettivo

Consolidare i componenti base del design system per il backoffice, portandoli a una API stabile e riusabile.

## Scope

- In scope: `Button`, `Input`, `Textarea`, `Select`, `Dialog`, `Badge`, `Card`, `JsonView`
- In scope: stati, varianti, edge case e accessibilita minima
- In scope: allineamento naming e props
- Out of scope: pattern complessi di pagina

## File o aree impattate

- `packages/trinacria-ui/src/components/**`
- eventuali consumer in `packages/admin-kernel/src/**`

## Check da eseguire

- `npm run build -w @trinacria-cms/trinacria-ui`
- `npm run build -w @trinacria-cms/backoffice`
- `npm run lint`

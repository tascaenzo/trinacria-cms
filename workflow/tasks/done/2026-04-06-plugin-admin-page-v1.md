# Pagina backoffice per gestione plugin V1

## Obiettivo

Creare una superficie admin per osservare e gestire i plugin installati, con stato, capability, dipendenze e azioni supportate.

## Scope

- In scope: lista plugin
- In scope: dettaglio stato e capability
- In scope: azioni supportate
- In scope: feedback errori/azioni
- Out of scope: plugin marketplace completo

## File o aree impattate

- `packages/admin-kernel/src/**`
- eventuali componenti `packages/trinacria-ui/src/**`

## Check da eseguire

- `npm run typecheck -w @trinacria-cms/admin-kernel`
- `npm run build -w @trinacria-cms/backoffice`

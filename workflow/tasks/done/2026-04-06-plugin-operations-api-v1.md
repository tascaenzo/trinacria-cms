# API operative per gestione plugin V1

## Obiettivo

Esporre il primo set di API operative per amministrare plugin installati e lifecycle supportato.

## Scope

- In scope: endpoint per operazioni supportate
- In scope: security model admin
- In scope: response shape e error model
- Out of scope: installazione da registry remoto se non ancora prevista

## File o aree impattate

- `packages/kernel/src/http/**`
- `packages/kernel/src/runtime/**`
- `packages/sdk/**`

## Check da eseguire

- `npm test -w @trinacria-cms/kernel`
- `npm run build -w @trinacria-cms/sdk`

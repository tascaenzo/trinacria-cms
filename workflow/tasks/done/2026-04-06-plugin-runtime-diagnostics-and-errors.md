# Diagnostica runtime plugin ed error model operativo

## Obiettivo

Rendere il runtime plugin diagnosticabile in modo operativo, con errori, cause e stati comprensibili da backoffice e tooling.

## Scope

- In scope: taxonomy errori runtime
- In scope: metadati diagnostici minimi
- In scope: serializzazione leggibile verso API/admin
- Out of scope: observability distribuita avanzata

## File o aree impattate

- `packages/kernel/src/errors/**`
- `packages/kernel/src/runtime/**`
- `packages/kernel/src/http/**`

## Check da eseguire

- `npm test -w @trinacria-cms/kernel`

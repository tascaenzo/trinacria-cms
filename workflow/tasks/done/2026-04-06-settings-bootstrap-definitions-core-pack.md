# Bootstrap definizioni settings core-pack

## Obiettivo

Popolare il sistema con un set iniziale di definizioni settings realmente utili al CMS, in modo da validare il dominio con casi concreti.

## Scope

- In scope: definizioni base sito
- In scope: definizioni i18n/locale/timezone
- In scope: definizioni integrazioni e feature flags se coerenti
- Out of scope: tutte le configurazioni future del CMS

## File o aree impattate

- `packages/core-pack/src/**`
- `apps/playground/**`
- documentazione settings

## Check da eseguire

- `npm test -w @trinacria-cms/core-pack`
- verifica manuale via API `/v1/settings/definitions`
- verifica manuale via backoffice

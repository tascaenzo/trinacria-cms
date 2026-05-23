# Flussi backoffice per i settings operativi

## Obiettivo

Definire e implementare la prima UX backoffice utile per leggere e, se previsto dalla policy, modificare i settings senza compromettere i vincoli di ownership.

## Scope

- In scope: UX di lettura, filtro, ispezione e stato dei settings
- In scope: eventuale write flow coerente con la policy
- In scope: gestione errori e feedback per definitions, values e secrets
- Out of scope: design system nuovo o completo redesign del backoffice

## File o aree impattate

- `packages/admin-kernel/src/pages/settings-page.tsx`
- `packages/admin-kernel/src/i18n/*.json`
- eventuali componenti `packages/trinacria-ui/src/**`

## Check da eseguire

- `npm run typecheck -w @trinacria-cms/admin-kernel`
- `npm run build -w @trinacria-cms/backoffice`

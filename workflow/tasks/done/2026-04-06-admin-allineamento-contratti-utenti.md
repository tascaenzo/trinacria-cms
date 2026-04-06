# Allineamento contratti utenti tra API, SDK e backoffice

## Meta

- ID: `task-admin-contracts-users`
- Stato: `done`
- Area: `backoffice`
- Milestone: `M1`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Rendere coerente il contratto utenti tra backend `core-pack`, OpenAPI, SDK generato e `admin-kernel`.

## Contesto

L'analisi del repository ha mostrato che il backend usa ancora `firstName` e `lastName`, mentre SDK e backoffice tipizzati risultano gia allineati a `displayName`. Questo rompe build e typecheck del backoffice.

## Scope

- In scope: scegliere e applicare il contratto sorgente corretto
- In scope: rigenerare SDK se necessario
- In scope: aggiornare backoffice e documentazione toccata
- Out of scope: redesign funzionale della gestione utenti

## Deliverable

- build del monorepo nuovamente verde
- backoffice senza errori TypeScript sul dominio utenti
- documentazione tecnica riallineata sul contratto scelto

## File o aree impattate

- `packages/core-pack/src/modules/users/**`
- `packages/core-pack/src/modules/installation/**`
- `packages/sdk/openapi/trinacria-cms.openapi.json`
- `packages/sdk/src/generated/**`
- `packages/admin-kernel/src/**`

## Check da eseguire

- `npm run build`
- `npm run typecheck -w @trinacria-cms/admin-kernel`
- `npm test`

## Note operative

Direzione fissata:

- opzione scelta: API canonicale con `displayName`
- compatibilita residua: lettura tollerante di record legacy che contengono ancora `firstName` e `lastName`

## Chiusura

- Changelog aggiornato: `si`
- Documentazione aggiornata: `si`
- File modificati:
  - `packages/core-pack/src/modules/users/**`
  - `packages/core-pack/src/modules/auth/auth-users.repository.ts`
  - `packages/core-pack/src/modules/installation/**`
  - `packages/core-pack/test/**`
  - `packages/admin-kernel/src/backoffice-app.tsx`
  - `packages/admin-kernel/src/pages/users-page.tsx`
  - `packages/admin-kernel/src/pages/installation-bootstrap-page.tsx`
- Follow-up aperti:
  - rigenerare snapshot OpenAPI dal playground se il documento runtime diventera la sola sorgente di verita del contratto

# Bootstrap definizioni settings core-pack

## Meta

- ID: `task-settings-bootstrap-core-pack`
- Stato: `done`
- Area: `core-pack`
- Milestone: `M2`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Popolare il sistema con un set iniziale di definizioni settings realmente utili al CMS, in modo da validare il dominio con casi concreti.

## Contesto

L'infrastruttura settings oggi e generica. Serve un catalogo iniziale di chiavi e default che rappresentino bisogni reali del CMS.

## Scope

- In scope: definizioni base sito
- In scope: definizioni i18n/locale/timezone
- In scope: definizioni integrazioni e feature flags se coerenti
- Out of scope: tutte le configurazioni future del CMS

## Deliverable

- elenco definizioni iniziali con categorie e default
- bootstrap o seed applicativo coerente
- evidenza nel backoffice explorer

## File o aree impattate

- `packages/core-pack/src/**`
- `apps/playground/**`
- documentazione settings

## Dipendenze

- politica settings definita

## Check da eseguire

- `npm test -w @trinacria-cms/core-pack`
- verifica manuale via API `/v1/settings/definitions`
- verifica manuale via backoffice

## Note operative

Priorita suggerita:

- site name
- public url
- locale
- timezone
- branding di base
- feature flag esplicite dove necessario

Direzione applicata:

- il catalogo iniziale viene provisionato dal plugin `core-pack` in `onInit`, quindi nasce dal plugin owner reale e resta idempotente;
- le chiavi bootstrap rispettano il formato canonico `<pluginId>:<domain>:<name>`;
- il set iniziale copre sito, URL pubblico, locale, timezone, branding minimo e una feature flag esplicita per il rollout editoriale;
- la panoramica settings del backoffice riconosce ora in modo esplicito le chiavi canonicali seedate dal core.

## Chiusura

- Changelog aggiornato: `si`
- Documentazione aggiornata: `si`
- File modificati:
  - `packages/core-pack/src/modules/settings/settings.bootstrap.ts`
  - `packages/core-pack/src/plugin/core-pack.plugin.ts`
  - `packages/core-pack/test/settings.bootstrap.test.ts`
  - `packages/admin-kernel/src/pages/settings-page.tsx`
  - `docs/cms/it/0005-core-pack-architettura-file-per-file.md`
  - `docs/cms/en/0005-core-pack-file-by-file.md`
  - `docs/cms/it/0013-settings-sicurezza-e-ownership-operativa.md`
  - `docs/cms/en/0013-settings-security-and-operational-ownership.md`
- Check eseguiti:
  - `npm run typecheck -w @trinacria-cms/core-pack`
  - `npm run build -w @trinacria-cms/core-pack`
  - `npm run test -w @trinacria-cms/core-pack`
  - `npm run typecheck -w @trinacria-cms/admin-kernel`
- Follow-up aperti:
  - smoke manuale playground/backoffice con Mongo disponibile per vedere il catalogo seedato via `/v1/settings/definitions`

# Bootstrap definizioni settings core-pack

## Meta

- ID: `task-settings-bootstrap-core-pack`
- Stato: `todo`
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

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

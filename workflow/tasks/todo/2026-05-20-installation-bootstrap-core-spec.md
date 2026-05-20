# Specifica installation e bootstrap core

## Meta

- ID: `2026-05-20-installation-bootstrap-core-spec`
- Stato: `draft`
- Area: `docs`
- Milestone: `M4.0`
- Owner: `enzo`
- Creato il: `2026-05-20`
- Ultimo aggiornamento: `2026-05-20`

## Obiettivo

Definire bootstrap e installazione iniziale: stato installato, admin user,
default roles, default permissions, settings baseline e provisioning idempotente.

## Contesto

Il CMS deve partire da un core minimo ma operativo. L'installazione deve essere
chiara, ripetibile e sicura prima di aggiungere plugin dominio.

## Scope

- In scope: installation state
- In scope: bootstrap admin user
- In scope: provisioning `core-pack`
- In scope: default roles, permissions e settings
- In scope: idempotenza e retry
- In scope: error model bootstrap
- Out of scope: installer UI completo

## Deliverable

- `docs/cms/specs/core-platform/installation-bootstrap.md`

## File o aree impattate

- `docs/cms/specs/core-platform/installation-bootstrap.md`
- `packages/core-pack/README.md`
- `apps/playground/README.md`
- `apps/backoffice/README.md`

## Check da eseguire

- `npx prettier --check docs workflow apps/playground/README.md apps/backoffice/README.md packages/core-pack/README.md`

## Note operative

La specifica deve chiarire cosa succede al primo boot e cosa succede ai boot
successivi.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `yes`
- Follow-up aperti:

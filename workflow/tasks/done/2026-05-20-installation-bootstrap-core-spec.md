# Specifica installation e bootstrap core

## Obiettivo

Definire bootstrap e installazione iniziale: stato installato, admin user,
default roles, default permissions, settings baseline e provisioning idempotente.

## Scope

- In scope: installation state
- In scope: bootstrap admin user
- In scope: provisioning `core-pack`
- In scope: default roles, permissions e settings
- In scope: idempotenza e retry
- In scope: error model bootstrap
- Out of scope: installer UI completo

## File o aree impattate

- `docs/cms/specs/core-platform/installation-bootstrap.md`
- `packages/core-pack/README.md`
- `apps/playground/README.md`
- `apps/backoffice/README.md`

## Check da eseguire

- `npx prettier --check docs workflow apps/playground/README.md apps/backoffice/README.md packages/core-pack/README.md`

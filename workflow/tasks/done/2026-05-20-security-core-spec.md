# Specifica security core

## Obiettivo

Definire il security core della piattaforma: utenti, ruoli, capability,
permission, policy, role grant, provisioning, admin guard e chiamate signed
plugin-to-core.

## Scope

- In scope: naming capability e permission
- In scope: modello utenti, ruoli e assegnazioni baseline
- In scope: ownership plugin delle permission
- In scope: grant per ruolo e contributi plugin
- In scope: provisioning security lifecycle-driven
- In scope: admin route guard
- In scope: signed plugin caller authentication
- In scope: policy allow/deny, wildcard e condizioni
- In scope: access policy per settings, secrets ed eventi protected
- Out of scope: implementazione di nuovi algoritmi auth

## File o aree impattate

- `docs/cms/specs/core-platform/security-core.md`
- `packages/kernel/README.md`
- `packages/core-pack/README.md`
- `packages/admin-kernel/README.md`

## Check da eseguire

- `npx prettier --check docs workflow packages/kernel/README.md packages/core-pack/README.md packages/admin-kernel/README.md`

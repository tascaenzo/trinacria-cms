# Specifica configuration registry e secrets core

## Obiettivo

Definire il configuration registry sicuro della piattaforma: settings,
definition, values, secrets, ownership, visibility, encryption, masking,
override, export/import, audit e accesso admin/plugin.

## Scope

- In scope: settings definition e value lifecycle
- In scope: plugin ownership
- In scope: visibility `public`, `protected`, `secret`
- In scope: secret masking e encryption at rest
- In scope: signed plugin access
- In scope: admin broker behavior
- In scope: audit di reveal, write e rotation
- In scope: namespace e canonical key dei settings
- In scope: export/import e override rules
- Out of scope: UI completa di editing settings plugin

## File o aree impattate

- `docs/cms/specs/core-platform/settings-core.md`
- `packages/core-pack/README.md`
- `docs/cms/en/0014-settings-end-to-end.md`
- `docs/cms/it/0014-settings-end-to-end.md`

## Check da eseguire

- `npx prettier --check docs workflow packages/core-pack/README.md`

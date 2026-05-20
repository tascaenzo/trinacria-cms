# Specifica configuration registry e secrets core

## Meta

- ID: `2026-05-20-settings-core-spec`
- Stato: `draft`
- Area: `docs`
- Milestone: `M4.0`
- Owner: `enzo`
- Creato il: `2026-05-20`
- Ultimo aggiornamento: `2026-05-20`

## Obiettivo

Definire il configuration registry sicuro della piattaforma: settings,
definition, values, secrets, ownership, visibility, encryption, masking,
override, export/import, audit e accesso admin/plugin.

## Contesto

Il dominio settings e gia avanzato, ma va ricondotto dentro la filosofia
plugin-first. La collection `settings` deve diventare storage centralizzato e
governato per configurazioni core/plugin, inclusi secret recuperabili solo dal
plugin owner o da policy esplicite.

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

## Deliverable

- `docs/cms/specs/core-platform/settings-core.md`
- `docs/cms/specs/core-platform/configuration-registry.md`

## File o aree impattate

- `docs/cms/specs/core-platform/settings-core.md`
- `packages/core-pack/README.md`
- `docs/cms/en/0014-settings-end-to-end.md`
- `docs/cms/it/0014-settings-end-to-end.md`

## Check da eseguire

- `npx prettier --check docs workflow packages/core-pack/README.md`

## Note operative

La specifica deve preservare l'isolamento dei secret e non trasformare il
backoffice in owner diretto di settings plugin. Il backoffice e broker operativo:
mostra metadata, masking e azioni, ma non possiede il reveal.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `yes`
- Follow-up aperti:

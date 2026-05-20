# Specifica contratto plugin CMS

## Meta

- ID: `2026-05-20-plugin-contract-spec`
- Stato: `draft`
- Area: `docs`
- Milestone: `M4.0`
- Owner: `enzo`
- Creato il: `2026-05-20`
- Ultimo aggiornamento: `2026-05-20`

## Obiettivo

Definire la forma target di un plugin CMS: manifest, capability, permission,
entity, settings, API, lifecycle e admin contribution.

## Contesto

La direzione scelta e WordPress-like/plugin-first. Serve un contratto leggibile
prima di implementare package dominio o nuove API core.

## Scope

- In scope: campi richiesti/opzionali del plugin contract
- In scope: lifecycle hook e responsabilita
- In scope: relazione con manifest backend e contribution backoffice
- In scope: DTO API operative plugin
- In scope: schema Mongo runtime plugin
- In scope: error model plugin operations
- Out of scope: API TypeScript definitiva

## Deliverable

- `docs/cms/specs/core-platform/plugin-contract.md`

## File o aree impattate

- `docs/cms/specs/core-platform/plugin-contract.md`
- `docs/cms/en/0007-build-a-plugin.md`
- `docs/cms/it/0007-creare-un-plugin.md`

## Check da eseguire

- `npx prettier --check docs workflow`

## Note operative

La specifica deve distinguere plugin semplici, plugin con CRUD standard e plugin
con UI custom.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `yes`
- Follow-up aperti:
  - Validare se `entities`, `settings`, `events` e `admin` entrano subito nel
    manifest backend o in registri separati.

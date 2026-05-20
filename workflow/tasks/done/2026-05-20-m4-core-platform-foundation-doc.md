# Documento fondativo M4 core platform

## Meta

- ID: `2026-05-20-m4-core-platform-foundation-doc`
- Stato: `done`
- Area: `docs`
- Milestone: `M4.0`
- Owner: `enzo`
- Creato il: `2026-05-20`
- Ultimo aggiornamento: `2026-05-20`

## Obiettivo

Sintetizzare la milestone M4.0 in un documento funzionale che faccia da base
architetturale per il CMS.

## Contesto

La milestone M4.0 deve diventare il riferimento solido per implementare il core:
kernel/core-pack separati, Mongo-first, configuration registry, namespace,
event bus, sicurezza, admin extensibility e API/SDK.

## Scope

- In scope: overview funzionale M4.0
- In scope: decisioni fondative
- In scope: superfici core da specificare
- Out of scope: implementazione codice

## Deliverable

- `docs/cms/specs/core-platform/m4-core-platform-foundation.md`
- draft collegati:
  - `docs/cms/specs/core-platform/configuration-registry.md`
  - `docs/cms/specs/core-platform/namespace-governance.md`
  - `docs/cms/specs/core-platform/plugin-event-bus.md`

## Check da eseguire

- `npx prettier --check docs workflow`

## Chiusura

- Changelog aggiornato: `yes`
- Documentazione aggiornata: `yes`
- Follow-up aperti:
  - trasformare i draft in specifiche complete durante M4.0

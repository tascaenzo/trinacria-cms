# Specifica plugin packaging e discovery

## Meta

- ID: `2026-05-20-plugin-packaging-discovery-spec`
- Stato: `draft`
- Area: `docs`
- Milestone: `M4.0`
- Owner: `enzo`
- Creato il: `2026-05-20`
- Ultimo aggiornamento: `2026-05-20`

## Obiettivo

Definire come un plugin viene impacchettato, scoperto, validato, installato,
abilitato, disabilitato e versionato.

## Contesto

La visione plugin-first richiede una forma chiara del package prima di ragionare
su marketplace, plugin locali o plugin ufficiali.

## Scope

- In scope: package shape
- In scope: posizione e struttura manifest
- In scope: discovery locale
- In scope: compatibility e versioning
- In scope: install, enable, disable e uninstall semantics
- In scope: plugin ufficiali vs plugin terzi
- Out of scope: marketplace remoto

## Deliverable

- `docs/cms/specs/core-platform/plugin-packaging-discovery.md`

## File o aree impattate

- `docs/cms/specs/core-platform/plugin-packaging-discovery.md`
- `packages/kernel/README.md`
- `apps/playground/README.md`

## Check da eseguire

- `npx prettier --check docs workflow packages/kernel/README.md apps/playground/README.md`

## Note operative

La specifica deve restare compatibile con npm workspaces e con l'avvio
`apps/playground`.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `yes`
- Follow-up aperti:

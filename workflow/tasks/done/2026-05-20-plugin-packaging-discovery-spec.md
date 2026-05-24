# Specifica plugin packaging e discovery

## Obiettivo

Definire come un plugin viene impacchettato, scoperto, validato, installato,
abilitato, disabilitato e versionato.

## Scope

- In scope: package shape
- In scope: posizione e struttura manifest
- In scope: discovery locale
- In scope: compatibility e versioning
- In scope: install, enable, disable e uninstall semantics
- In scope: plugin ufficiali vs plugin terzi
- Out of scope: marketplace remoto

## File o aree impattate

- `docs/cms/specs/core-platform/plugin-packaging-discovery.md`
- `packages/kernel/README.md`
- `apps/playground/README.md`

## Check da eseguire

- `npx prettier --check docs workflow packages/kernel/README.md apps/playground/README.md`

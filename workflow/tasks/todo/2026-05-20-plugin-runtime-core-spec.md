# Specifica plugin runtime core

## Meta

- ID: `2026-05-20-plugin-runtime-core-spec`
- Stato: `draft`
- Area: `docs`
- Milestone: `M4.0`
- Owner: `enzo`
- Creato il: `2026-05-20`
- Ultimo aggiornamento: `2026-05-20`

## Obiettivo

Definire il runtime core dei plugin: stati, transizioni, ordering, lifecycle,
rollback, enable/disable, failure handling e semantica install/uninstall.

## Contesto

Il kernel ha gia primitive runtime e state machine. Serve una specifica che
stabilisca il comportamento target prima di rafforzare o cambiare codice.

## Scope

- In scope: stati runtime e transizioni ammesse
- In scope: register, load, unload, reload, disable, enable
- In scope: ordering per dipendenze
- In scope: rollback e failure recovery
- In scope: differenza tra installed, enabled e loaded
- Out of scope: implementazione runtime

## Deliverable

- `docs/cms/specs/core-platform/plugin-runtime.md`

## File o aree impattate

- `docs/cms/specs/core-platform/plugin-runtime.md`
- `packages/kernel/README.md`
- `docs/cms/en/0003-runtime-orchestration-deep-dive.md`
- `docs/cms/it/0003-runtime-orchestrazione-deep-dive.md`

## Check da eseguire

- `npx prettier --check docs workflow`

## Note operative

La specifica deve distinguere operazioni amministrative, hook plugin e stato
persistito.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `yes`
- Follow-up aperti:

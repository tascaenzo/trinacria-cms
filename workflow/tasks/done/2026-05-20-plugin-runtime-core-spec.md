# Specifica plugin runtime core

## Obiettivo

Definire il runtime core dei plugin: stati, transizioni, ordering, lifecycle,
rollback, enable/disable, failure handling e semantica install/uninstall.

## Scope

- In scope: stati runtime e transizioni ammesse
- In scope: register, load, unload, reload, disable, enable
- In scope: ordering per dipendenze
- In scope: rollback e failure recovery
- In scope: differenza tra installed, enabled e loaded
- Out of scope: implementazione runtime

## File o aree impattate

- `docs/cms/specs/core-platform/plugin-runtime.md`
- `packages/kernel/README.md`
- `docs/cms/en/0003-runtime-orchestration-deep-dive.md`
- `docs/cms/it/0003-runtime-orchestrazione-deep-dive.md`

## Check da eseguire

- `npx prettier --check docs workflow`

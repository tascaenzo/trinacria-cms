# Specifica observability e operations core

## Obiettivo

Definire osservabilita e operativita core: health, event log, diagnostics,
runtime status, audit operativo, error context e azioni admin.

## Scope

- In scope: health snapshot
- In scope: plugin event log
- In scope: diagnostics e failure context
- In scope: operation audit
- In scope: admin operation feedback
- In scope: error model operativo
- Out of scope: integrazione con sistemi esterni di monitoring

## File o aree impattate

- `docs/cms/specs/core-platform/observability-operations.md`
- `packages/kernel/README.md`
- `packages/admin-kernel/README.md`

## Check da eseguire

- `npx prettier --check docs workflow packages/kernel/README.md packages/admin-kernel/README.md`

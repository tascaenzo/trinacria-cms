# Specifica observability e operations core

## Meta

- ID: `2026-05-20-observability-operations-core-spec`
- Stato: `draft`
- Area: `docs`
- Milestone: `M4.0`
- Owner: `enzo`
- Creato il: `2026-05-20`
- Ultimo aggiornamento: `2026-05-20`

## Obiettivo

Definire osservabilita e operativita core: health, event log, diagnostics,
runtime status, audit operativo, error context e azioni admin.

## Contesto

Il runtime plugin espone gia eventi, stato e diagnostica. Serve una specifica per
stabilire quali segnali sono contratti pubblici del core.

## Scope

- In scope: health snapshot
- In scope: plugin event log
- In scope: diagnostics e failure context
- In scope: operation audit
- In scope: admin operation feedback
- In scope: error model operativo
- Out of scope: integrazione con sistemi esterni di monitoring

## Deliverable

- `docs/cms/specs/core-platform/observability-operations.md`

## File o aree impattate

- `docs/cms/specs/core-platform/observability-operations.md`
- `packages/kernel/README.md`
- `packages/admin-kernel/README.md`

## Check da eseguire

- `npx prettier --check docs workflow packages/kernel/README.md packages/admin-kernel/README.md`

## Note operative

La specifica deve distinguere diagnostica tecnica, audit amministrativo e stato
mostrabile nel backoffice.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `yes`
- Follow-up aperti:

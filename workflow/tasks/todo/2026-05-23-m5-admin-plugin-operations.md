# M5 admin plugin operations

## Obiettivo

Aggiornare il backoffice per mostrare stato runtime, diagnostica e operazioni
plugin disponibili senza duplicare regole backend.

## Area

`backoffice`

## Milestone

`M5 - Plugin Runtime Foundation`

## Scope

- In scope: lista plugin con state, source, version e dependency status
- In scope: dettaglio failure reason e `lastFailurePhase`
- In scope: azioni `load`, `unload`, `reload`, `enable`, `disable`
- In scope: rendering delle `availableOperations` ricevute dal backend
- In scope: feedback operazione e refresh stato
- Out of scope: UI installazione plugin
- Out of scope: resource renderer generico

## File impattati

- `packages/admin-kernel/src/pages/plugins-page.tsx`
- `packages/admin-kernel/src/runtime/cms-sdk.ts`
- `packages/admin-kernel/src/i18n/it.json`
- `packages/admin-kernel/src/i18n/en.json`
- `apps/backoffice/src/**`

## Check

- `npm run build -w @trinacria-cms/admin-kernel`
- `npm run build -w @trinacria-cms/backoffice`

# M5 failure handling, rollback e runtime events

## Obiettivo

Garantire che il fallimento di un plugin sia isolato, diagnosticabile e non
lasci contribution parziali visibili.

## Area

`kernel`

## Milestone

`M5 - Plugin Runtime Foundation`

## Scope

- In scope: `lastFailurePhase`, `failureCount`, `statusReason`
- In scope: rollback best effort di hook e moduli
- In scope: rimozione contribution parziali dopo load fallito
- In scope: runtime events per success/failure
- In scope: error mapping verso API diagnostics
- Out of scope: event bus persistente completo
- Out of scope: retry automatico con backoff

## File impattati

- `packages/kernel/src/contracts/plugin-runtime.ts`
- `packages/kernel/src/runtime/in-memory-plugin-runtime.ts`
- `packages/kernel/src/runtime/plugin-contribution-registry.ts`
- `packages/kernel/src/runtime/kernel-health-service.ts`
- `packages/kernel/test/in-memory-plugin-runtime.test.ts`
- `packages/kernel/test/kernel-health-service.test.ts`

## Check

- `npm run typecheck -w @trinacria-cms/kernel`
- `npm run test -w @trinacria-cms/kernel`
- `npm run build -w @trinacria-cms/kernel`

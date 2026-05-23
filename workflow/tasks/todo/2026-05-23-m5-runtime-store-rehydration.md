# M5 runtime store rehydration

## Obiettivo

Reidratare lo stato runtime persistito durante bootstrap e renderlo coerente con
le source plugin correnti.

## Area

`kernel`

## Milestone

`M5 - Plugin Runtime Foundation`

## Scope

- In scope: lettura `PluginRuntimeStore.list()` al bootstrap/runtime init
- In scope: mantenere `disabled` come scelta operativa persistente
- In scope: candidare `loaded` persistito ad autoload controllato
- In scope: conservare diagnostica per `failed`
- In scope: gestire plugin persistiti ma non piu scoperti con `statusReason`
- In scope: test su in-memory store, DB-backed store e Mongo gated
- Out of scope: migration runner generico

## File impattati

- `packages/kernel/src/contracts/plugin-runtime-store.ts`
- `packages/kernel/src/runtime/plugin-runtime-store.ts`
- `packages/kernel/src/runtime/in-memory-plugin-runtime.ts`
- `packages/kernel/src/runtime/cms-starter.ts`
- `packages/kernel/test/plugin-runtime-store.test.ts`
- `packages/kernel/test/plugin-runtime-store.integration.test.ts`

## Check

- `npm run typecheck -w @trinacria-cms/kernel`
- `npm run test -w @trinacria-cms/kernel`
- `TRINACRIA_RUN_MONGO_INTEGRATION=1 npm run test:integration -w @trinacria-cms/kernel`
- `npm run build -w @trinacria-cms/kernel`

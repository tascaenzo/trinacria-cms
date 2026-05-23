# M5 discovery, registration e autoload

## Obiettivo

Collegare discovery configurata, registration runtime e autoload in una pipeline
bootstrap coerente.

## Area

`kernel`

## Milestone

`M5 - Plugin Runtime Foundation`

## Scope

- In scope: source `workspace`, `package`, `local-path`
- In scope: import entrypoint controllato
- In scope: manifest validation e compatibility check durante discovery
- In scope: registration dei plugin scoperti
- In scope: autoload via `loadMany()` quando `autoLoadPlugins !== false`
- In scope: diagnostica source `discovered`, `failed`, `disabled`
- Out of scope: marketplace remoto
- Out of scope: installazione npm runtime

## File impattati

- `packages/kernel/src/contracts/plugin-discovery.ts`
- `packages/kernel/src/runtime/plugin-discovery-service.ts`
- `packages/kernel/src/runtime/cms-starter.ts`
- `packages/kernel/test/plugin-discovery-service.test.ts`
- `packages/kernel/test/in-memory-plugin-runtime.test.ts`

## Check

- `npm run typecheck -w @trinacria-cms/kernel`
- `npm run test -w @trinacria-cms/kernel`
- `npm run build -w @trinacria-cms/kernel`

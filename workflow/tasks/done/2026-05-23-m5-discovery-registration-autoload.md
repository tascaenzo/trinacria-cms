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

## Esito

- Estratta `bootstrapDiscoveredPlugins()` come pipeline testabile per
  discovery, registration e autoload senza avviare il server HTTP.
- Aggiunto override opzionale `pluginDiscoveryService` in `CmsStarterOptions`
  per test e host applicativi avanzati.
- Verificato che i plugin scoperti vengano registrati e caricati con dependency
  ordering tramite `loadMany()`.
- Verificato che source fallite restino disponibili come diagnostica e che
  `autoLoadPlugins: false` registri senza caricare.

## Check eseguiti

- `npm run test -w @trinacria-cms/kernel -- cms-starter.test.ts`
- `npm run test -w @trinacria-cms/kernel -- plugin-discovery-service.test.ts`
- `npm run test -w @trinacria-cms/kernel -- in-memory-plugin-runtime.test.ts`
- `npm run typecheck -w @trinacria-cms/kernel`
- `npm run build -w @trinacria-cms/kernel`

# Implementazione contratti fondativi core

## Obiettivo

Implementare il primo blocco core dopo la chiusura delle specifiche M4.0:
manifest target, namespace validator e collision policy.

## Scope

- In scope: estendere `PluginManifest` con campi target minimi
- In scope: validare `displayName`, `description`, `entities`, `settings`,
  `events`, `admin`
- In scope: introdurre reserved namespace e validator canonico
- In scope: introdurre collision policy per plugin ID, entity, settings key,
  event name, admin route/resource e permission key
- In scope: allineare commenti/contratti `DbAdapter` alla direzione Mongo-first
- Out of scope: implementare event bus
- Out of scope: implementare configuration registry completo
- Out of scope: implementare UI admin resource generica

## File o aree impattate

- `packages/kernel/src/contracts/plugin-manifest.ts`
- `packages/kernel/src/runtime/plugin-manifest-validation.ts`
- `packages/kernel/src/runtime/plugin-namespace.ts`
- `packages/kernel/src/contracts/db-adapter.ts`
- `packages/kernel/src/runtime/entity-registry.ts`
- test kernel collegati

## Check da eseguire

- `npm run typecheck -w @trinacria-cms/kernel`
- `npm run test -w @trinacria-cms/kernel`
- `npm run build -w @trinacria-cms/kernel`

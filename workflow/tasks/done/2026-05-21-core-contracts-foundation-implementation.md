# Implementazione contratti fondativi core

## Meta

- ID: `2026-05-21-core-contracts-foundation-implementation`
- Stato: `done`
- Area: `kernel`
- Milestone: `M4`
- Owner: `enzo`
- Creato il: `2026-05-21`
- Ultimo aggiornamento: `2026-05-22`

## Obiettivo

Implementare il primo blocco core dopo la chiusura delle specifiche M4.0:
manifest target, namespace validator e collision policy.

## Contesto

Le specifiche M4.0 definiscono l'ordine di implementazione. Il primo step deve
stabilizzare i contratti che bloccano runtime, security, Mongo storage,
configuration registry, event bus e admin contribution.

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

## Specifiche di riferimento

- `docs/cms/specs/core-platform/README.md`
- `docs/cms/specs/core-platform/plugin-contract.md`
- `docs/cms/specs/core-platform/namespace-governance.md`
- `docs/cms/specs/core-platform/plugin-entity-mongo.md`
- `docs/cms/specs/core-platform/sdk-api-contract.md`

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

## Acceptance criteria

- Il manifest accetta e valida i blocchi target definiti dalla specifica.
- Reserved namespace e collision policy sono centralizzati.
- I test coprono naming valido, naming non valido e collisioni principali.
- Il contratto storage non promette piu una astrazione multi-database.
- Nessuna API dominio viene introdotta.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `si`
- Follow-up aperti: milestone M4.0 completata, passare allo Step 2 implementativo (Runtime plugin)

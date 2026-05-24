# M5 runtime state machine e available operations

## Obiettivo

Stabilizzare la state machine runtime e rendere deterministica la disponibilita
delle operazioni plugin.

## Area

`kernel`

## Milestone

`M5 - Plugin Runtime Foundation`

## Scope

- In scope: transizioni valide/invalide per tutti gli stati runtime
- In scope: `availableOperations` per `load`, `unload`, `reload`, `enable`,
  `disable`
- In scope: errori deterministici per operazioni non disponibili
- In scope: test unitari su stati e transizioni
- Out of scope: UI admin
- Out of scope: persistence rehydration

## File impattati

- `packages/kernel/src/contracts/plugin-runtime.ts`
- `packages/kernel/src/runtime/in-memory-plugin-runtime.ts`
- `packages/kernel/src/runtime/kernel-system-service.ts`
- `packages/kernel/test/in-memory-plugin-runtime.test.ts`
- `packages/kernel/test/kernel-system-service.test.ts`

## Check

- `npm run typecheck -w @trinacria-cms/kernel`
- `npm run test -w @trinacria-cms/kernel`
- `npm run build -w @trinacria-cms/kernel`

## Esito

- `unload` puo recuperare un plugin in stato `failed` quando il fallimento e
  avvenuto durante unload e restano risorse runtime da pulire.
- `availableOperations` segue le transizioni runtime effettive: gli stati
  transitori non espongono operazioni mutative non ammesse.
- Aggiunti test su recovery da unload fallito e disponibilita operazioni per
  ogni stato runtime.

## Check eseguiti

- `npm run test -w @trinacria-cms/kernel -- in-memory-plugin-runtime.test.ts`
- `npm run test -w @trinacria-cms/kernel -- kernel-system-service.test.ts`
- `npm run typecheck -w @trinacria-cms/kernel`
- `npm run build -w @trinacria-cms/kernel`

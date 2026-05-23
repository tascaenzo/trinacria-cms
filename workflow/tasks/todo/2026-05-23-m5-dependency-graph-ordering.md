# M5 dependency graph e ordering plugin

## Obiettivo

Completare dependency graph, diagnostica dependency e ordinamento topologico per
`loadMany()`.

## Area

`kernel`

## Milestone

`M5 - Plugin Runtime Foundation`

## Scope

- In scope: dependency required e optional
- In scope: stati dependency `ok`, `missing`, `disabled`, `version-mismatch`
- In scope: cycle detection
- In scope: ordering stabile per `loadMany()`
- In scope: warning diagnostici per dependency opzionali
- Out of scope: unload automatico dei plugin dipendenti quando una dependency
  viene disabilitata

## File impattati

- `packages/kernel/src/contracts/plugin-runtime.ts`
- `packages/kernel/src/runtime/in-memory-plugin-runtime.ts`
- `packages/kernel/src/runtime/semver.ts`
- `packages/kernel/test/in-memory-plugin-runtime.test.ts`
- `packages/kernel/test/semver.test.ts`

## Check

- `npm run typecheck -w @trinacria-cms/kernel`
- `npm run test -w @trinacria-cms/kernel`
- `npm run build -w @trinacria-cms/kernel`

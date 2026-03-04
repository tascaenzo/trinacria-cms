# 0003 - Allineamento `@trinacria/schema`: documentazione vs runtime installato

## Stato verificato

Data verifica: 2026-03-02

Nel repository, la documentazione Trinacria su schema (`docs/trinacria/it/0004-schema.md`) include nuove capability:

- `s.string({ semver: true })`
- `s.string({ semverRange: true })`
- `.superRefine((value, ctx) => ctx.addIssue(...))`
- `safeParse(input, { mode: "first" | "all" })`
- `registerStringValidator(...)`

Nel package realmente installato nel progetto (`node_modules/@trinacria/schema`, versione `0.1.1-alpha.0`) queste API **non risultano ancora disponibili** nei tipi/esportazioni runtime.

## Impatto sul core CMS

Per il validator `PluginManifest` abbiamo quindi adottato un approccio ibrido:

- shape validation con `@trinacria/schema` (`s.object`, `s.array`, `strict`, `refine`)
- controlli semver/range mantenuti localmente (`packages/kernel/src/runtime/semver.ts`)

Questo evita regressioni e mantiene il codice pronto alla migrazione appena la libreria pubblica espone le nuove API.

## Cosa e stato gia allineato

- validazione dichiarativa manifest con schema
- strict mode su oggetti
- dedup capability/dependencies
- self-dependency check
- errore normalizzato via `ValidationError` -> `PluginManifestError`

## Migrazione da fare quando `@trinacria/schema` viene rilasciato con le nuove API

1. Sostituire in `plugin-manifest-validation.ts`:
- `s.string(...).refine(isValidVersion)` -> `s.string({ semver: true })`
- `s.string(...).refine(isValidVersionRange)` -> `s.string({ semverRange: true })`

2. Sostituire refine cross-field:
- `.refine(...)` root-level -> `.superRefine(...)` con path puntuale su `dependencies[i].pluginId`

3. Sostituire parser semver locale:
- rimuovere `packages/kernel/src/runtime/semver.ts` se non piu necessario

4. Eventuale modalita collect-all:
- usare `safeParse(input, { mode: "all" })` dove serve feedback completo

## Verifica post-migrazione attesa

- typecheck del package core
- test validator manifest aggiornati
- rimozione codice custom non necessario

# 0016 - M5 Runtime plugin foundation

Questa pagina e il punto di ingresso per gli sviluppatori che devono lavorare
sul runtime M5. Non ripete tutte le specifiche: spiega come leggerle, quali
contratti sono gia disponibili e come estenderli senza rompere la semantica
runtime.

## Obiettivo della milestone

M5 deve rendere reale il runtime plugin:

- discovery da sorgenti configurate
- validazione manifest e compatibilita
- dependency ordering
- load/unload/reload
- enable/disable
- persistenza stato runtime
- diagnostica leggibile
- API, SDK e backoffice coerenti

Stato corrente: questi blocchi sono disponibili e coperti da check M5; eventuali
estensioni devono mantenere allineati runtime, OpenAPI, SDK e backoffice.

Non si sviluppano ancora domini editoriali, content type o workflow di
pubblicazione.

## Documenti da leggere prima di scrivere codice

1. [`../specs/core-platform/m5-plugin-runtime-implementation.md`](../specs/core-platform/m5-plugin-runtime-implementation.md)
2. [`../specs/core-platform/plugin-runtime.md`](../specs/core-platform/plugin-runtime.md)
3. [`../specs/core-platform/plugin-packaging-discovery.md`](../specs/core-platform/plugin-packaging-discovery.md)
4. [`../specs/core-platform/plugin-contract.md`](../specs/core-platform/plugin-contract.md)
5. [`../specs/core-platform/namespace-governance.md`](../specs/core-platform/namespace-governance.md)
6. [`0015-operazioni-plugin-e-troubleshooting.md`](./0015-operazioni-plugin-e-troubleshooting.md)

## File principali da conoscere

Kernel contracts:

- `packages/kernel/src/contracts/plugin-runtime.ts`
- `packages/kernel/src/contracts/plugin-runtime-store.ts`
- `packages/kernel/src/contracts/plugin-discovery.ts`
- `packages/kernel/src/contracts/plugin-manifest.ts`

Kernel runtime:

- `packages/kernel/src/runtime/in-memory-plugin-runtime.ts`
- `packages/kernel/src/runtime/plugin-runtime-store.ts`
- `packages/kernel/src/runtime/plugin-discovery-service.ts`
- `packages/kernel/src/runtime/plugin-contribution-registry.ts`
- `packages/kernel/src/runtime/plugin-manifest-validation.ts`
- `packages/kernel/src/runtime/plugin-namespace.ts`
- `packages/kernel/src/runtime/cms-starter.ts`

API e admin:

- `packages/kernel/src/runtime/kernel-system-service.ts`
- `packages/kernel/src/http/kernel-system.controller.ts`
- `packages/sdk/src/runtime/**`
- `packages/admin-kernel/src/pages/plugins-page.tsx`
- `packages/admin-kernel/src/pages/plugin-contributions-page.tsx`

Test:

- `packages/kernel/test/in-memory-plugin-runtime.test.ts`
- `packages/kernel/test/plugin-runtime-store.test.ts`
- `packages/kernel/test/plugin-runtime-store.integration.test.ts`
- `packages/kernel/test/plugin-discovery-service.test.ts`
- `packages/kernel/test/kernel-system-service.test.ts`

## Sequenza consigliata

1. Chiudere state machine e available operations.
2. Chiudere dependency graph e ordering.
3. Collegare discovery, registration e autoload.
4. Aggiungere reidratazione da runtime store.
5. Completare failure handling e rollback contribution.
6. Allineare API, OpenAPI e SDK.
7. Aggiornare backoffice.
8. Aggiornare troubleshooting e changelog.

La sequenza sopra e stata usata per chiudere M5. Per nuove estensioni resta
valido lo stesso ordine: prima runtime/API, poi SDK, poi admin, infine docs.

Ogni step deve lasciare il repository in uno stato verificabile.

## Regole pratiche per gli sviluppatori

- Il backend decide se una operazione e disponibile; la UI mostra solo quella
  decisione.
- `loaded` e l'unico stato che rende contribution disponibili.
- `disabled` e una scelta operativa persistente, non un errore.
- `failed` deve essere diagnosticabile e recuperabile.
- Le dependency opzionali non bloccano il load, ma devono comparire nei warning.
- Le dependency obbligatorie mancanti, disabilitate o fuori range bloccano il
  load.
- Il bootstrap non deve rompersi per il fallimento di un singolo plugin.
- Le contribution parziali devono essere rimosse dopo un load fallito.
- Gli eventi plugin devono essere letti via `GET /v1/system/plugins/:pluginId/events?limit=20`
  o via SDK con `query.limit`.

## Check minimi

Per task kernel:

```bash
npm run typecheck -w @trinacria-cms/kernel
npm run test -w @trinacria-cms/kernel
npm run build -w @trinacria-cms/kernel
```

Per task SDK:

```bash
npm run build -w @trinacria-cms/sdk
npm run test -w @trinacria-cms/sdk
```

Per task backoffice:

```bash
npm run build -w @trinacria-cms/admin-kernel
npm run build -w @trinacria-cms/backoffice
```

Per persistenza Mongo:

```bash
TRINACRIA_RUN_MONGO_INTEGRATION=1 npm run test:integration -w @trinacria-cms/kernel
```

## Anti-pattern da evitare

- hardcodare regole runtime dentro il backoffice
- rendere visibili contribution prima dello stato `loaded`
- cancellare record persistiti non scoperti senza diagnostica
- trasformare M5 in un dominio editoriale
- aggiungere marketplace remoto o installazione npm runtime
- ignorare OpenAPI/SDK quando cambia un DTO

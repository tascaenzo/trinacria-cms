# Repository: comandi e workflow CI

Questo documento elenca i comandi definiti nel `package.json` root del CMS e i controlli eseguiti dalla CI.

## Comandi di sviluppo

| Comando | Scopo |
| --- | --- |
| `npm run dev` | Compila il monorepo e avvia i watcher di tutti i workspace tramite Turborepo. |
| `npm run dev:stream` | Avvia gli stessi watcher con log testuali mescolati, adatti a terminali non interattivi. |
| `npm run dev:playground` | Compila il monorepo e avvia Playground e i watcher delle sue dipendenze. |
| `npm run dev:backoffice` | Compila il monorepo e avvia Backoffice e i watcher delle sue dipendenze. |
| `npm run storybook` | Avvia Storybook di Trinacria UI. |

`npm run dev` usa la UI del terminale di Turborepo: seleziona un task per leggerne i log senza mescolarli con quelli degli altri watcher. Vite fornisce HMR al Backoffice, `tsx watch` riavvia il Playground e i workspace libreria usano build TypeScript in watch per mantenere aggiornato `dist`.

## Comandi di qualita`

| Comando | Scopo |
| --- | --- |
| `npm run format` | Verifica la formattazione con Biome. |
| `npm run format:write` | Applica la formattazione Biome. |
| `npm run lint` | Esegue controlli Biome di formattazione, lint e import in tutti i workspace tramite Turborepo. |
| `npm run typecheck` | Esegue il typecheck dei workspace tramite Turborepo e quello E2E. |
| `npm run build` | Compila tutti i workspace rispettando le dipendenze tramite Turborepo. |
| `npm run test` | Esegue tutti i test unitari dei workspace tramite Turborepo. |
| `npm run test:integration` | Esegue le suite di integrazione MongoDB e S3 abilitate dall'ambiente. |
| `npm run check` | Esegue il gate locale completo: formattazione, lint, typecheck, test unitari e validazione del grafo delle dipendenze dei workspace. |
| `npm run dependencies:check` | Verifica che gli import interni abbiano la corrispondente dipendenza nel manifest del workspace. |

## Comandi E2E e SDK

- `npm run e2e` esegue Playwright dopo la build automatica `pree2e`.
- `npm run e2e:ci` e` l'alias Playwright usato in CI e compila anch'esso prima di partire.
- `npm run e2e:ui` apre l'interfaccia di Playwright.
- `npm run sdk:snapshot`, `npm run sdk:generate`, `npm run sdk:build`, `npm run sdk:test` e `npm run sdk:check` operano sull'SDK generato.

## Workflow CI

Il workflow attivo e` [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml). Esegue:

1. `npm ci`
2. format globale e lint, typecheck e build solo dei package impattati
3. build Storybook e verifica dell'SDK generato
4. test unitari e di integrazione solo dei package impattati con MongoDB e MinIO, piu` validazione del grafo delle dipendenze dei workspace
5. test E2E con Playwright

Nel root di questo CMS non sono inclusi un hook Git locale, un workflow Changesets o un comando di release. Non usare tali comandi finche` non vengono aggiunti intenzionalmente con la relativa automazione.

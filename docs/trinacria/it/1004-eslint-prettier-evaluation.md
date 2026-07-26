# Repository: Biome + Turborepo

Il repository usa Biome per linting, formattazione e organizzazione degli import e Turborepo per orchestrare i task dei workspace.

## Perche` questa toolchain

- Standard comune di stile e qualita` nei package.
- Linting e formattazione piu` rapidi tramite una configurazione root unica.
- Grafo di build consapevole delle dipendenze, parallelismo e cache locale dei task.

## Comandi

Gli script root sono:

```json
{
  "build": "turbo run build",
  "typecheck": "turbo run typecheck",
  "test": "turbo run test",
  "lint": "turbo run lint",
  "format": "biome format .",
  "format:write": "biome format --write .",
  "check": "npm run format && npm run lint && npm run typecheck && npm run test && npm run dependencies:check"
}
```

Ogni workspace mantiene i propri script `build`, `typecheck`, `lint` e, dove applicabile, `test`. Il lint dei workspace usa `biome check .`, mentre la configurazione root si applica a JavaScript, TypeScript, JSX, TSX e CSS. Il preset raccomandato di Biome e` attivo; le regole di accessibilita` e degli effect React che richiederebbero una revisione applicativa sono disabilitate esplicitamente in `biome.json` fino a quando tale lavoro non sara` pianificato.

Turborepo rispetta le dipendenze dichiarate dai workspace tramite `turbo.json`. Mantiene in cache locale i task deterministici `generate`, `build`, `typecheck`, `lint` e test, dichiara gli input d'ambiente di build e integrazione e lascia `dev` persistente e senza cache. La generazione SDK e` un task cacheabile indipendente, richiesto dalla build dell'SDK.

## CI e grafo delle dipendenze

La CI mantiene globali i controlli di formattazione e dell'SDK generato ed esegue i task Turborepo di lint, typecheck, build e test solo per i package impattati dalla PR o dal push. Viene scaricata l'intera cronologia Git, cosi` il filtro dei package impattati puo` risolvere il merge base. `npm run dependencies:check` verifica che ogni import interno `@trinacria-cms/*` sia dichiarato nel manifest del suo workspace.

La cache remota non e` volutamente attiva: richiede token e configurazione team Turborepo di proprieta` del progetto. Quando i segreti CI saranno disponibili, Turborepo li usera` senza richiedere modifiche al codice sorgente.

## Integrazione con il flusso branch

- `unstable`: esegui `lint` + `test` su ogni PR.
- `develop`: blocca merge se `format` o `lint` falliscono.
- `main`: promuovi solo se pipeline pulita, poi release stabile.

## Nota operativa

Quando cambia la toolchain, aggiorna insieme:

- `package.json`
- `package-lock.json`
- `biome.json` e `turbo.json`
- CI (`.github/workflows/*.yml`)
- `.vscode/settings.json` e `.vscode/extensions.json`

cosi` eviti mismatch tra lockfile e script CI.

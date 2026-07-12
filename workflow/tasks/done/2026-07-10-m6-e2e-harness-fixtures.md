# M6 E2E Harness And Fixtures

Stato: `completed`

## Obiettivo

Fornire un runner Playwright riproducibile per playground, backoffice e Mongo isolato.

## Scope completato

- Playwright Chromium con un solo worker per i flussi stateful
- database dedicato con guard `_e2e` e reset prima/dopo la suite
- backend production-like e backoffice preview avviati dal runner
- trace, screenshot, video e report HTML sui failure
- esecuzione CI con browser installato e artifact report

## Check

- `npm run e2e:typecheck`: verde
- `npm run e2e:ci`: 6 test verdi
- database di sviluppo escluso dal reset tramite guard esplicita

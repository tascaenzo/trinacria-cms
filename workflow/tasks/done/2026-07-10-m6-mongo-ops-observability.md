# M6 Mongo Operations And Observability

## Obiettivo

Validare database e superfici operative necessarie a una release production-ready.

## Scope

- test integration Mongo reale obbligatorio in CI
- smoke backup/restore su database temporaneo
- readiness healthy/degraded/down
- `/metrics` e `/ops/checklist` protetti da token
- request id e log JSON senza dati sensibili
- procedura disaster recovery documentata e provata

## Check

- `TRINACRIA_RUN_MONGO_INTEGRATION=1 npm run test:integration`
- `npm run e2e -- --grep "readiness|observability|mongo"`

## Avanzamento

- [x] test Mongo reale obbligatorio in CI
- [x] database E2E dedicato e protetto da guard sul suffisso `_e2e`
- [x] readiness pubblica e superfici metrics/checklist protette da token
- [x] smoke backup/restore logico su database temporaneo isolato
- [x] scansione log JSON per password e token auth/email
- [x] stati readiness degraded/down via processi HTTP isolati

## Verifica completata

- `TRINACRIA_RUN_MONGO_INTEGRATION=1 npm run test:integration`: 1 test Mongo reale passato
- `npm run e2e:ci`: readiness, observability, leakage e backup/restore passati

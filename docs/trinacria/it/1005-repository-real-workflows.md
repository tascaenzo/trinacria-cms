# Repository: workflow attivi

Il repository ha un solo workflow GitHub Actions attivo: [CI](../../../.github/workflows/ci.yml).

Parte su push e pull request. La CI avvia MongoDB e MinIO, quindi esegue:

1. `npm ci`
2. `npm run format`
3. `npm run lint`
4. `npm run typecheck`
5. `npm run build`
6. `npm run storybook:build`
7. `npm run sdk:check`
8. `npm run test`
9. `npm run test:integration`
10. `npm run e2e:ci`

Usa gli stessi comandi root in locale prima di aprire una pull request. I test di integrazione richiedono `TRINACRIA_RUN_MONGO_INTEGRATION=1`; gli smoke test S3 richiedono inoltre le variabili S3 configurate in CI.

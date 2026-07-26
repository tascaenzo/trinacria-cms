# Repository: Active Workflows

The repository has one active GitHub Actions workflow: [CI](../../../.github/workflows/ci.yml).

It runs on pushes and pull requests. CI provisions MongoDB and MinIO, then runs:

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

Use the same root commands locally before opening a pull request. Integration tests require `TRINACRIA_RUN_MONGO_INTEGRATION=1`; S3 smoke tests additionally require the S3 variables configured in CI.

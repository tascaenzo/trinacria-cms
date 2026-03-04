# Trinacria CMS

Modular headless CMS built on top of Trinacria.

## Vision

Trinacria CMS targets two usage modes:

- product baseline: install `core` and start quickly
- developer platform: extend behavior through plugins

The project keeps a strict separation between kernel contracts and concrete implementations.

## Repository layout

- `apps/playground`: development and integration playground
- `apps/api`: headless API runtime with plugin manager and content endpoints
- `apps/admin`: official admin dashboard (planned)
- `apps/example-frontend`: frontend integration sample (planned)
- `packages/kernel`: kernel contracts, runtime primitives, default modules, and DB abstraction
- `packages/core-pack`: official baseline plugin pack (users/roles/permissions/settings)
- `docs/cms/en`: official CMS docs in English
- `docs/cms/it`: Italian CMS docs
- `docs/trinacria`: local imported Trinacria docs (framework reference)

## Architecture model

### `@trinacria-cms/kernel`

Contains contracts, lifecycle orchestration, DI primitives, plugin/module runtime, storage-agnostic interfaces, typed runtime errors, and plugin security policy support.

### `@trinacria-cms/core-pack`

Official baseline plugin pack loaded by the kernel runtime. It starts as the default CMS feature set and evolves incrementally.

## Development workflow

Branch strategy:

1. `unstable`: daily development
2. `develop`: integration branch via PR from `unstable`
3. `main`: stable releases via PR from `develop`

## Local setup

Requirements:

- Node.js 20+
- npm 11+
- Docker (for Mongo local runtime)

Install and run playground:

```bash
npm install
docker compose up -d mongo
npm run dev -w @trinacria-cms/playground
```

Run API app:

```bash
npm run dev -w @trinacria-cms/api
```

Optional Mongo UI (mongo-express):

```bash
docker compose --profile tools up -d mongo-express
```

UI endpoint: `http://localhost:8081`

## Quality checks

```bash
npm run lint
npm run format
npm run build
npm run test -w @trinacria-cms/kernel
npm run test:integration
```

## Documentation

Start here:

- `docs/cms/en/README.md` (official)
- `docs/cms/it/README.md` (Italian)

Trinacria framework reference:

- `docs/trinacria/README.md`

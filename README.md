# Trinacria CMS

Modular headless CMS built on top of Trinacria, the underlying framework/library
that provides the DI runtime, module lifecycle, HTTP integration and schema
tooling used by this repository.

## Vision

Trinacria CMS targets two usage modes:

- product baseline: install `core-pack` and start quickly
- developer platform: extend behavior through plugins

The project keeps a strict separation between:

- Trinacria framework primitives (`@trinacria/*`)
- CMS kernel contracts and runtime glue
- official baseline CMS functionality (`core-pack`)
- domain plugins such as editorial, commerce, media, SEO, booking, or analytics

## Repository layout

- `apps/playground`: thin backend playground for kernel + core-pack integration
- `apps/backoffice`: thin Vite host for the shared admin runtime
- `packages/kernel`: CMS runtime contracts, plugin orchestration, namespace governance, Mongo-first storage core
- `packages/core-pack`: official baseline plugin pack: auth, users, roles, permissions, API keys, settings, installation
- `packages/sdk`: zero-dependency HTTP client generated from the OpenAPI snapshot
- `packages/admin-kernel`: shared backoffice application runtime, pages, route registry, SDK wiring
- `packages/trinacria-ui`: reusable React design system and backoffice presentation components
- `docs/cms/en`: official CMS docs in English
- `docs/cms/it`: Italian CMS docs
- `docs/trinacria`: local imported Trinacria docs (framework reference)

Detailed package ownership map:
[docs/cms/architecture/package-map.md](/Users/enzo/Desktop/trinacria-cms/docs/cms/architecture/package-map.md).

## Architecture model

### `@trinacria-cms/kernel`

Contains CMS contracts, lifecycle orchestration around Trinacria modules,
plugin/module runtime, Mongo-first storage contracts, typed runtime errors, and
plugin security policy support.

### `@trinacria-cms/core-pack`

Official baseline plugin pack loaded by the kernel runtime. It starts as the default CMS feature set and evolves incrementally.

It should stay focused on platform-level CMS capabilities: installation, auth,
users, roles, permissions, settings, API keys, and security provisioning.
Application domains such as editorial or commerce should live in separate
plugins.

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
npm run dev:playground
```

Run backoffice:

```bash
npm run dev:backoffice
```

Run Storybook for `trinacria-ui`:

```bash
npm run storybook
```

Optional Mongo UI (mongo-express):

```bash
docker compose --profile tools up -d mongo-express
```

UI endpoint: `http://localhost:8081`

Operational endpoints:

- playground API: `http://127.0.0.1:3000`
- OpenAPI snapshot source: `http://127.0.0.1:3000/openapi.json`
- Swagger UI: `http://127.0.0.1:3000/docs`
- backoffice host: `http://127.0.0.1:4174`

## Quality checks

```bash
npm run lint
npm run format
npm run build
npm run typecheck -w @trinacria-cms/admin-kernel
npm run typecheck -w @trinacria-cms/backoffice
npm run test -w @trinacria-cms/kernel
npm run test -w @trinacria-cms/core-pack
npm run test:integration
```

## Smoke Baseline

Baseline M1 verified on `2026-04-06`:

- `docker compose ps`: Mongo and mongo-express up and healthy
- `npm run build -w @trinacria-cms/playground`: ok
- `npm run typecheck -w @trinacria-cms/backoffice`: ok
- `npm run dev -w @trinacria-cms/playground`: ok outside sandbox, API ready on `:3000`
- `npm run dev -w @trinacria-cms/backoffice`: ok outside sandbox, Vite ready on `127.0.0.1:4174`

Sandbox note:

- inside the Codex sandbox, `tsx watch` and `vite` can fail with `EPERM` on IPC socket bind or local port bind; this is an environment limitation, not a repository regression

## Workflow operativo

La gestione del lavoro attivo ora vive in [workflow/README.md](/Users/enzo/Desktop/trinacria-cms/workflow/README.md).

Struttura principale:

- `workflow/tasks/todo`
- `workflow/tasks/in-progress`
- `workflow/tasks/done`
- `workflow/changelog`
- `workflow/milestones`

## Documentation

Start here:

- [docs/cms/README.md](/Users/enzo/Desktop/trinacria-cms/docs/cms/README.md)
- [docs/cms/architecture/plugin-first-cms-direction.md](/Users/enzo/Desktop/trinacria-cms/docs/cms/architecture/plugin-first-cms-direction.md)
- [docs/cms/specs/core-platform/README.md](/Users/enzo/Desktop/trinacria-cms/docs/cms/specs/core-platform/README.md)
- `docs/cms/en/README.md` (official)
- `docs/cms/it/README.md` (Italian)
- [docs/trinacria-ui-design-system.md](/Users/enzo/Desktop/trinacria-cms/docs/trinacria-ui-design-system.md)

Trinacria framework reference:

- `docs/trinacria/README.md`

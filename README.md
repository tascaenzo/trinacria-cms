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
- `packages/core-pack`: official baseline plugin pack: auth, users, roles, permissions, settings, installation
- `packages/sdk`: zero-dependency HTTP client generated from the OpenAPI snapshot
- `packages/admin-kernel`: shared backoffice application runtime, pages, route registry, SDK wiring
- `packages/trinacria-ui`: reusable React design system and backoffice presentation components
- `docs/cms/en`: official CMS docs in English
- `docs/cms/it`: Italian CMS docs
- `docs/trinacria`: local imported Trinacria docs (framework reference)

Detailed package ownership map:
[docs/cms/architecture/package-map.md](docs/cms/architecture/package-map.md).

## Architecture model

### `@trinacria-cms/kernel`

Contains CMS contracts, lifecycle orchestration around Trinacria modules,
plugin/module runtime, Mongo-first storage contracts, typed runtime errors, and
plugin security policy support.

### `@trinacria-cms/core-pack`

Official baseline plugin pack loaded by the kernel runtime. It starts as the default CMS feature set and evolves incrementally.

It should stay focused on platform-level CMS capabilities: installation, auth,
users, roles, permissions, settings, and security provisioning.
Application domains such as editorial or commerce should live in separate
plugins.

### Developer plugin API

Plugin-facing helpers live in `@trinacria-cms/kernel/plugin-api`. Use them to
build manifests, admin contributions, security declarations, settings
definitions, response envelopes, and schema-like contracts. `core-pack` keeps
compatibility re-exports and owns the signed settings request helpers.

Sensitive cross-plugin communication is documented in
[docs/plugin-secure-events.md](docs/plugin-secure-events.md).
User lifecycle events and email flows are documented in
[docs/plugin-user-events-and-email-flows.md](docs/plugin-user-events-and-email-flows.md).

## Development workflow

Branch strategy:

1. feature branches: scoped work, with CI on every push
2. `unstable`: daily integration via PR from feature branches
3. `develop`: release-candidate integration via PR from `unstable`
4. `main`: stable releases via PR from `develop`

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

MongoDB configuration:

- `MONGO_URI` is the canonical CMS application connection string.
- When `MONGO_URI` is set, the app ignores the split Mongo fallback values for
  connection purposes.
- `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`, and `MONGO_DATABASE` are used by
  the bundled `docker-compose.yml` to initialize the local Mongo container; keep
  them aligned with `MONGO_URI` in local development.
- `MONGO_HOST` and `MONGO_PORT` are optional fallback values for environments
  that do not provide `MONGO_URI`.

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
npm run typecheck
npm run test
npm run test:integration
npm run storybook:build
```

Install Chromium once and run the production-readiness browser/API suite:

```bash
npx playwright install chromium
npm run e2e
```

The E2E harness uses and resets only the dedicated `trinacria_cms_e2e` Mongo database. Override
`E2E_MONGO_URI` only with a database name ending in `_e2e`; the reset guard rejects every other
database name.

## Production Hardening

The backend app applies a stricter security profile when `NODE_ENV=production`
or `NODE_ENV=staging`:

- global `securityHeaders`, `rateLimit`, and `requestTimeout` middleware are enabled
- `HTTP_CORS_ORIGINS` is required and cannot contain `*`
- cookie-authenticated mutating requests are rejected unless `Origin`/`Referer`
  matches `CMS_CSRF_TRUSTED_ORIGINS`, `HTTP_CORS_ORIGINS`, or the configured public origins
- `/openapi.json` and `/docs` are disabled by default
- `CMS_STRICT_JWT_SECRET_REQUIRED` is forced to `true`
- `CMS_JWT_SECRET` must be a strong non-placeholder value, or loaded from
  `CMS_JWT_SECRET_FILE` for Docker/Kubernetes-style secret mounts

Production secret values should be injected by the runtime platform or a secret
manager, not committed to `.env`.

Full deployment runbook and hardening checklist:

- [docs/cms/it/0020-runbook-deploy-production.md](docs/cms/it/0020-runbook-deploy-production.md)
- [docs/cms/it/0021-checklist-hardening-security.md](docs/cms/it/0021-checklist-hardening-security.md)

## Observability

The backend host exposes a minimal production observability surface:

- structured JSON logs by default (`LOG_FORMAT=json`)
- request ids emitted as `x-request-id`
- request/error metrics at `GET /metrics`
- readiness at `GET /ready`
- operational checklist at `GET /ops/checklist`

`/metrics` and `/ops/checklist` can be protected with
`OBSERVABILITY_TOKEN`; send it as `Authorization: Bearer <token>`.
`/ready` stays suitable for infrastructure readiness probes.

The checklist covers:

- `/health`
- database connectivity
- plugin runtime state and required dependencies
- auth module readiness
- backoffice contribution registry
- login manual verification state
- settings registry

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

La gestione del lavoro attivo vive in [workflow/](workflow/README.md).

- `workflow/tasks/todo` — task pronti
- `workflow/tasks/done` — task completati
- `workflow/tasks/backlog` — task futuri
- `workflow/changelog/CHANGELOG.md` — log per milestone
- `workflow/milestones/` — milestone attive e completate

## Documentation

Start here:

- [docs/cms/README.md](docs/cms/README.md)
- [docs/cms/architecture/plugin-first-cms-direction.md](docs/cms/architecture/plugin-first-cms-direction.md)
- [docs/cms/specs/core-platform/README.md](docs/cms/specs/core-platform/README.md)
- `docs/cms/en/README.md` (official)
- `docs/cms/it/README.md` (Italian)
- [docs/trinacria-ui-design-system.md](docs/trinacria-ui-design-system.md)

Trinacria framework reference:

- `docs/trinacria/README.md`

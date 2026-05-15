# AGENTS

## Monorepo facts that matter

- Package manager is `npm` with workspaces (not pnpm/turbo). Use `npm run <script> -w <workspace>` for scoped work.
- Primary runtime flow: `apps/playground` boots CMS (`startCmsApp`) from `@trinacria-cms/kernel` and loads `@trinacria-cms/core-pack`.
- `apps/backoffice` is intentionally thin; real admin behavior lives in `packages/admin-kernel`.

## High-value commands

- Install: `npm install`
- Full build: `npm run build`
- Lint + format check: `npm run lint` and `npm run format`
- Workspace typechecks used in CI: `npm run typecheck -w @trinacria-cms/kernel` and `npm run typecheck -w @trinacria-cms/core-pack`
- Unit tests used in CI: `npm run test -w @trinacria-cms/kernel` and `npm run test -w @trinacria-cms/core-pack`
- Integration tests: `npm run test:integration` (runs root `test/**/*.integration.test.ts` first, then kernel integration tests)

## Integration test prerequisites

- CI and local integration flows expect MongoDB at `MONGO_URI`.
- Default local stack is from `docker-compose.yml`; quickest path: `docker compose up -d mongo`.
- Default URI pattern (also used by CI): `mongodb://trinacria:trinacria@127.0.0.1:27017/trinacria_cms?authSource=admin`.

## SDK generation rules (easy to get wrong)

- Do not hand-edit `packages/sdk/src/generated/*`; it is regenerated.
- OpenAPI snapshot source defaults to `http://127.0.0.1:3000/openapi.json` and can be overridden via `CMS_OPENAPI_URL`.
- Canonical flow after backend contract changes: `npm run sdk:snapshot` -> `npm run sdk:generate` -> `npm run sdk:check`.
- `sdk:check` fails if generated files differ from committed `packages/sdk/src/generated`.

## Repo-specific gotchas

- Root ESLint config ignores tests (`**/test/**`, `**/*.test.*`, etc.), so lint is not a signal for test files.
- `packages/trinacria-ui` storybook scripts force `HOME=.storybook-home`; preserve this when adjusting storybook commands.

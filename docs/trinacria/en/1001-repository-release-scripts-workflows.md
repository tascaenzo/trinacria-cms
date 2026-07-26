# Repository Commands and CI Workflow

This document lists the commands currently defined in the CMS root `package.json` and the checks run by CI.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Builds the monorepo, then starts all workspace watchers through Turborepo. |
| `npm run dev:stream` | Starts the same watchers with plain, interleaved logs for non-interactive terminals. |
| `npm run dev:playground` | Builds the monorepo, then starts Playground and its dependency watchers. |
| `npm run dev:backoffice` | Builds the monorepo, then starts Backoffice and its dependency watchers. |
| `npm run storybook` | Starts the Trinacria UI Storybook. |

`npm run dev` uses Turborepo's terminal UI: select a task to inspect its logs without mixing the output from the other watchers. Vite provides HMR for the Backoffice, `tsx watch` restarts the Playground, and library workspaces use TypeScript watch builds so their `dist` output stays current.

## Quality commands

| Command | Purpose |
| --- | --- |
| `npm run format` | Checks formatting with Biome. |
| `npm run format:write` | Applies Biome formatting. |
| `npm run lint` | Runs Biome format, lint, and import checks for all workspaces through Turborepo. |
| `npm run typecheck` | Runs workspace type checks through Turborepo plus E2E type checking. |
| `npm run build` | Builds all workspaces in dependency order through Turborepo. |
| `npm run test` | Runs all workspace unit tests through Turborepo. |
| `npm run test:integration` | Runs the opt-in MongoDB and S3 integration suites. |
| `npm run check` | Runs the complete local quality gate: format, lint, typecheck, unit tests, and workspace dependency graph validation. |
| `npm run dependencies:check` | Verifies that internal workspace imports have matching manifest dependencies. |

## E2E and SDK commands

- `npm run e2e` runs Playwright after the automatic `pree2e` build.
- `npm run e2e:ci` is the CI-oriented Playwright alias and also builds first.
- `npm run e2e:ui` opens the Playwright UI.
- `npm run sdk:snapshot`, `npm run sdk:generate`, `npm run sdk:build`, `npm run sdk:test`, and `npm run sdk:check` operate on the generated SDK.

## CI workflow

The active workflow is [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml). It runs:

1. `npm ci`
2. global format plus affected-only lint, typecheck, and build
3. Storybook build and generated-SDK check
4. affected-only unit and integration tests with MongoDB and MinIO, plus workspace dependency graph validation
5. Playwright E2E tests

There is no bundled local Git hook, Changesets workflow, or release command in this CMS root. Those commands should not be used unless they are intentionally added back with their supporting automation.

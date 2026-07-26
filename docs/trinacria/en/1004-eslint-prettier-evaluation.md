# Repository: Biome + Turborepo

This repository uses Biome for linting, formatting, and import organization, and Turborepo to orchestrate workspace tasks.

## Why this tooling

- A shared style and quality baseline across packages.
- Faster linting and formatting through a single root configuration.
- A dependency-aware build graph, parallel execution, and local task caching.

## Commands

The root scripts are:

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

Each workspace retains its own `build`, `typecheck`, `lint`, and (where applicable) `test` scripts. Workspace lint uses `biome check .`, while the root configuration applies to JavaScript, TypeScript, JSX, TSX, and CSS. The recommended Biome preset is active; accessibility and React-effect rules that would require an application-level remediation are explicitly disabled in `biome.json` until that work is planned.

Turborepo respects declared workspace dependencies through `turbo.json`. It caches deterministic `generate`, `build`, `typecheck`, `lint`, and test tasks locally, declares build and integration environment inputs, and keeps `dev` persistent and uncached. The SDK generation is an independent cached task consumed by the SDK build.

## CI and dependency graph

CI keeps formatting and generated-SDK checks global, and runs Turborepo lint, typecheck, build, and test tasks only for packages affected by the PR or push. Full Git history is fetched so the affected package filter can resolve the merge base. `npm run dependencies:check` validates that every internal `@trinacria-cms/*` source import is declared in its workspace manifest.

Remote caching is intentionally not enabled in this repository: it requires a project-owned Turborepo token and team configuration. Once those CI secrets are provisioned, Turborepo will use them without a source-code change.

## Integration with the branch flow

- `unstable`: run `lint` + `test` on every PR.
- `develop`: block merge when `format` or `lint` fails.
- `main`: promote only after green pipelines, then stable release.

## Operational note

When changing tooling, update together:

- `package.json`
- `package-lock.json`
- `biome.json` and `turbo.json`
- CI (`.github/workflows/*.yml`)
- `.vscode/settings.json` and `.vscode/extensions.json`

so you avoid lockfile/CI mismatch.

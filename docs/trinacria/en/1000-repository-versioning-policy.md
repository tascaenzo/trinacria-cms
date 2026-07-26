# Repository Versioning Policy

This document describes the intended versioning policy for publishable packages. Changesets and automated publishing are not currently configured in this CMS root.

## Strategy

- Versioning mode: independent (each package can bump independently)
- Versioning convention: SemVer (`MAJOR.MINOR.PATCH`)
- Base branch: `main`
- Non-published workspaces: `playground`, `api-prisma-postgresql`, `api-mongoose-mongodb`, `api-events-redis`, `api-events-rabbitmq`

## Proposed workflow for package changes

1. Implement the code changes.
2. Record the intended version impact until a release tool is introduced.

3. Select affected package(s) and bump type:

- `patch`: backward-compatible fixes/internal improvements
- `minor`: backward-compatible features
- `major`: breaking changes

4. Commit the code and its release note in the same PR.

## Future release flow on `main`

When a release workflow is added, it should create a reviewable release PR, publish from `main`, and create package tags.

## Notes

- Do not run undocumented `changeset` or release commands: they are not defined in the current root `package.json`.
- Changelog notes should be concise and user-facing.
- For breaking changes, include migration notes in the changeset body.

## Related docs

- [`1001 - Repository Commands and CI Workflow`](./1001-repository-release-scripts-workflows.md)
- [`1003 - Repository Branching Workflow`](./1003-repository-branching-workflow.md)
- [`1005 - Repository: Real active workflows`](./1005-repository-real-workflows.md)

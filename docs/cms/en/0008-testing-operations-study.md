# 0008 - Testing, operations, and technical governance

## Goal

Turn the project into a robust base for real delivery and advanced software engineering learning.

## Recommended testing pyramid

1. Unit tests

Target:

- service business rules
- pure helper logic
- schema validation edge cases

2. Integration tests

Target:

- repository behavior with real adapter
- module DI wiring
- entity/index registration

3. API tests

Target:

- users endpoints end-to-end
- envelope shape consistency
- status codes and error mapping

4. Runtime orchestration tests

Target:

- register/load/unload/reload flows
- missing/cyclic dependency handling
- rollback behavior on hook or module failure

## Minimum required scenarios

- create user with valid payload
- duplicate email conflict
- get missing user -> not found
- update user status
- runtime health with loaded plugin
- db health configured vs not configured
- openapi endpoint availability

## Architecture quality checklist

- are kernel/plugin boundaries respected?
- are dependencies resolved by DI tokens?
- are domain schemas separated from API DTOs?
- are errors typed and mapped to API responses?
- are manifest and capabilities coherent?

## Runtime operations view

Operational endpoints:

- `/health`
- `/health/dependencies`
- `/openapi.json`
- `/docs`

Key indicators:

- plugins in `failed` or `disabled`
- dependency edges in `missing` or `version-mismatch`
- `db.ok = false`

Typical actions:

- reload plugin after fixing failures
- disable unstable plugin
- inspect failure phase and disable reason

## Plugin governance rules

- consistent capability naming (`area.action`)
- disciplined semantic versioning
- plugin changelog per release
- explicit `requiresCore` compatibility management

## Suggested study method

1. Guided reverse engineering

Read contracts first, runtime second, plugin implementation third.

2. Controlled experiments

Trigger expected failures (dependency missing, invalid schema) and observe runtime/API behavior.

3. Refactoring with measurable goals

Reduce complexity and verify impact on readability and testability.

4. Living documentation

Record architectural decisions in `docs/cms/it` and `docs/cms/en`.

## Suggested roadmap after this phase

1. implement full roles/permissions/settings modules
2. add capability-based authorization policies
3. add runtime event tracing and metrics
4. add CI e2e suite with Mongo container

## Conclusion

A plugin-based CMS is only as strong as its contracts, tests, and operations discipline. This project is a strong platform to train all three.

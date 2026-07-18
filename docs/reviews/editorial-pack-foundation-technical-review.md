# Editorial Pack Foundation — Technical Review

> Branch reviewed: `feat/editorial-pack-foundation`
>
> Review target: architecture, package boundaries, domain modeling, build workflow, production readiness, and technical risks.

## Executive summary

The foundation is technically credible and shows a stronger architectural direction than a typical early-stage CMS implementation.

The most valuable choices are:

- explicit separation between framework primitives, CMS kernel, baseline platform features, and domain packs;
- a thin Editorial Pack composition root;
- domain invariants implemented in the service layer rather than delegated entirely to controllers or persistence;
- idempotent bootstrap behavior for default content types;
- attention to production hardening, observability, and end-to-end verification.

The main long-term risk is not the current implementation quality, but increasing coupling between workspaces. If every domain pack directly depends on the kernel, core pack, SDK, UI, and other domain packs, the monorepo could become a distributed monolith.

### Current assessment

| Area | Assessment |
| --- | --- |
| Architecture | 8/10 |
| Package boundaries | 8.5/10 |
| Maintainability potential | High |
| Editorial Pack production readiness | 6/10 |

## What is working well

### 1. Clear architectural boundaries

The repository distinguishes between:

- Trinacria framework primitives;
- CMS runtime and kernel contracts;
- baseline CMS functionality in `core-pack`;
- domain packages such as editorial, media, commerce, SEO, and booking;
- shared administration runtime and presentation components.

Keeping editorial behavior out of `core-pack` is the correct direction. It protects the platform kernel from progressively absorbing domain-specific concerns.

### 2. Thin composition root

`EditorialPackRootModule` composes the Editorial Pack modules without containing domain logic.

This is desirable because the root remains an explicit wiring point instead of becoming a service locator or an implicit runtime container.

### 3. Meaningful domain validation

`ContentTypesService` already enforces important invariants:

- reserved field keys;
- duplicate field keys;
- unique content type keys at application level;
- at least one workflow state;
- exactly one initial state;
- unique state and transition keys;
- transitions referencing known states.

This is a good foundation for keeping domain rules close to the application/domain layer.

### 4. Conservative default-content bootstrap

The default content type bootstrap is idempotent and avoids overwriting user-owned content models.

Automatic baseline upgrades are restricted to content types created by `system:editorial-pack`, which is a sound principle for an installable CMS package.

### 5. Production-oriented platform work

The project already documents and implements concerns that are often postponed too long:

- restrictive CORS configuration;
- CSRF protections for cookie-authenticated mutations;
- rate limiting and request timeouts;
- strong production secret requirements;
- production disabling of documentation endpoints;
- structured logs, metrics, readiness, and operational checklists;
- browser/API end-to-end verification.

## Main technical risks

### 1. Excessive coupling between internal packages

`@trinacria-cms/editorial-pack` currently depends directly on:

- `@trinacria-cms/core-pack`;
- `@trinacria-cms/kernel`;
- `@trinacria-cms/media-pack`;
- `@trinacria-cms/sdk`;
- `@trinacria-cms/trinacria-ui`.

For a domain package, this is a broad dependency surface.

Questions to resolve:

- Does the Editorial Pack backend need a direct dependency on the UI package?
- Should the backend depend directly on the HTTP SDK?
- Can media integration use a kernel-level contract or capability token rather than importing `media-pack` concretely?
- Can authentication and authorization integration use public ports instead of concrete `core-pack` exports?

Recommended direction:

- isolate backend and admin dependencies;
- prefer public contracts, tokens, and capabilities over concrete pack-to-pack imports;
- consider separate `editorial-pack` and `editorial-pack-admin` packages, or strongly isolated subpath exports.

### 2. Build orchestration will not scale well

The root build script manually sequences all workspaces, while the Editorial Pack rebuilds several dependencies during `prebuild` and `pretypecheck`.

Likely consequences as the repository grows:

- repeated builds;
- slower CI and local feedback;
- manually maintained dependency ordering;
- difficulty running checks only for affected packages.

Recommended direction:

- introduce an explicit task graph;
- use Turborepo, Nx, or a lightweight internal workspace dependency runner;
- cache package builds and run only affected tasks where possible.

### 3. Workspace-local lint is not active

The Editorial Pack currently exposes a placeholder lint script.

Each workspace should independently support:

- build;
- typecheck;
- lint;
- unit tests;
- integration tests where relevant.

Root-level linting is useful, but package-local scripts make CI composition and ownership clearer.

### 4. Content type key uniqueness is vulnerable to races

The current service-level pattern checks for an existing key and then creates the record.

Two concurrent requests can both pass the check before either write completes.

Required protections:

1. retain service-level validation for a clear user-facing error;
2. enforce a unique MongoDB index on the content type key within its namespace or tenant;
3. translate duplicate-key persistence errors into a typed conflict/domain error.

### 5. Destructive schema changes need an explicit strategy

Updating a content type can invalidate existing entries when operations include:

- removing a populated field;
- changing a field from singular to multiple or vice versa;
- changing field type;
- removing workflow states used by existing entries;
- changing workflows while entries are in intermediate states;
- removing transitions required by current processes.

Recommended direction:

Introduce a change-planning API before applying schema changes.

```ts
type ContentTypeChangePlan = {
  compatible: boolean;
  warnings: ChangeWarning[];
  requiredMigrations: MigrationStep[];
};
```

Suggested operations:

- `validate`;
- `dry-run`;
- `apply`;
- eventually `rollback` where feasible.

### 6. Workflow validation is structurally correct but semantically limited

Current validation ensures that references and keys are valid. It may also be useful to detect or report:

- unreachable states;
- an initial state with no usable outgoing transitions;
- workflows that can become permanently blocked;
- duplicate transitions with equivalent semantics;
- missing publishable or terminal states where the selected workflow policy requires them;
- transitions without authorization policy;
- states with no recovery path.

Not all conditions should be hard errors. Separate:

- structural errors;
- semantic warnings;
- configurable editorial policies.

### 7. Default taxonomy is too specific for the system baseline

The default `article` model includes hardcoded Italian category values while other labels are in English.

For a reusable platform baseline, prefer one of these approaches:

- no default taxonomy values;
- configurable taxonomy presets;
- localized presets stored outside the core domain model;
- demo data only in the playground or examples.

### 8. Baseline upgrades need versioning and provenance

The current bootstrap adds missing fields to system-owned content types. Over time, this needs stronger tracking.

Potential issue: a field intentionally removed by an administrator may be re-added because it is interpreted as missing.

Recommended additions:

- preset version;
- migration history;
- field provenance;
- distinction between untouched system fields and user-modified fields;
- audit records for automatic baseline upgrades.

## Recommended priorities

### P0 — before declaring the foundation stable

- [ ] Add unique database indexes and typed duplicate-key handling.
- [ ] Add focused tests for reserved fields, duplicate fields, workflow invariants, and concurrency conflicts.
- [ ] Define a strategy for destructive content model changes.
- [ ] Verify namespace, tenant, and ownership isolation rules where applicable.
- [ ] Formalize contracts for media, authentication, authorization, and cross-pack communication.
- [ ] Ensure entry writes validate against an immutable or versioned content type schema.

### P1 — before expanding the editorial domain significantly

- [ ] Separate Editorial Pack backend concerns from admin/UI concerns.
- [ ] Introduce a monorepo task graph and build caching.
- [ ] Enable real workspace-local lint checks.
- [ ] Version system presets and bootstrap migrations.
- [ ] Introduce domain events for content type and entry lifecycle operations.
- [ ] Add optimistic concurrency control to mutable editorial records.

### P2 — platform maturity

- [ ] Add plugin capability negotiation.
- [ ] Add formal migration and rollback APIs.
- [ ] Add editorial audit history.
- [ ] Add revisions and content versioning.
- [ ] Add scheduling, preview, and publication pipelines as independent capabilities.
- [ ] Add workflow simulation and validation diagnostics for administrators.

## Suggested architectural guardrails

To prevent the plugin ecosystem from becoming tightly coupled, consider enforcing these rules:

1. Domain packs may depend on the kernel public API.
2. Direct domain-pack-to-domain-pack imports should be exceptional and documented.
3. Cross-pack communication should prefer capabilities, ports, commands, or events.
4. Admin code should not leak UI/runtime dependencies into backend-only entrypoints.
5. Public exports should be intentionally curated; internal implementation paths should remain private.
6. Persistence-level invariants must complement, not replace, domain validation.
7. Content model changes must be planned and evaluated against existing data before application.

## Proposed follow-up review cycle

For each significant feature branch, repeat the analysis using the following structure:

1. scope and intended behavior;
2. architecture and package boundaries;
3. domain invariants;
4. persistence and concurrency;
5. security and authorization;
6. backward compatibility and migration impact;
7. tests and operational readiness;
8. prioritized recommendations.

This document should evolve as findings are implemented. Completed findings can be linked to commits, pull requests, tests, or architecture decision records.

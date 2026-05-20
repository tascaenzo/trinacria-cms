# 0000 - Learning path and mental model

## Goal

Understand Trinacria CMS as a software platform built on top of the Trinacria
framework libraries, not just as a set of classes. The focus is to learn how to
design, extend, and operate a plugin-first CMS architecture.

## Architecture in one sentence

- `@trinacria/*` is the framework foundation (DI, modules, HTTP, schema).
- `@trinacria-cms/kernel` is the CMS-specific engine (contracts + runtime + infrastructure tokens).
- `@trinacria-cms/core-pack` is the first official plugin (baseline domains: users, roles, permissions, settings).

Key principle: business logic belongs to plugins, platform governance belongs to the kernel.

## Why this split matters

1. Lower coupling

Plugins depend on stable contracts, not runtime internals.

2. Independent evolution

Kernel lifecycle and operations can evolve without rewriting domain modules.

3. Parallel delivery

Multiple teams can build plugins in parallel with one architectural language.

## Four-layer model

1. `Trinacria Foundation`

Framework primitives: DI, modules, lifecycle, HTTP, schema and tooling.

2. `Contracts`

Interfaces, types, and tokens that define allowed behaviors.

3. `Runtime`

Plugin state machine, lifecycle orchestration, module bridge, rollback, errors.

4. `Plugin Domain`

Business modules (`users`, `roles`, `editorial`, `commerce`, etc.) built on kernel contracts.

5. `App Bootstrap`

`startCmsApp` wires HTTP, providers, and plugin registration/loading.

## Engineering skills trained by this project

- contract-driven design
- advanced DI and module visibility
- runtime-safe plugin systems
- storage-agnostic architecture
- consistent API design (schema + envelope + OpenAPI)
- production operations mindset (health, dependency graph, observability)

## Suggested study method

1. Start with kernel contracts.
2. Move to runtime implementation.
3. Study `core-pack` as reference plugin code.
4. Run the playground and inspect API + Mongo behavior.
5. Implement your own plugin with chapter `0007`.

## 45-minute lab

1. Start Mongo.
2. Start playground.
3. Call `POST /v1/users`.
4. Call `GET /v1/users`.
5. Inspect Mongo records and canonical `id` format.
6. Inspect `GET /health` and dependency snapshot.

This single lab connects contracts, runtime, API, and persistence in one flow.

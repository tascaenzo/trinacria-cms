# 0000 - Vision and Boundaries

## Goal

Build a modular headless CMS with:

- a small stable kernel
- API + TypeScript SDK
- an official admin dashboard that plugins can extend

## Boundaries

Inside `core`:

- container + lifecycle
- plugin/module registry
- auth/rbac/workspace/settings contracts

Inside `core-pack`:

- runtime integration with Trinacria (by design)
- default storage implementation (for example Mongo)
- users, roles, permissions, settings store
- base admin APIs

## Framework decision

- `core` stays framework-agnostic.
- `core-pack` intentionally depends on Trinacria as the official CMS implementation layer.

## Outcome

This separation keeps the official baseline as `core + core-pack` while still allowing alternative packs (for example Postgres) without rewriting plugins.

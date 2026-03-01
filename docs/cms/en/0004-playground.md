# 0004 - Development Playground

## Goal

Provide a dedicated app for experiments (`apps/playground`) without polluting product packages.

## Principles

- Framework base: Trinacria (`@trinacria/core`, `@trinacria/http`).
- CMS core: `@trinacria-cms/core`.
- Default implementation: `@trinacria-cms/core-pack`.
- `core-pack` explicitly depends on Trinacria (official architecture choice).

## Runtime

- Base endpoint: `GET /health`.
- Bootstrap: register `core-pack` in the CMS kernel, then start Trinacria HTTP server.

## Mongo in development

Mongo runs in Docker (`docker-compose.yml`) for future persistence tests, while current `core-pack` is in-memory.

Start:

```bash
docker compose up -d mongo
npm run dev -w @trinacria-cms/playground
```

# 0004 - Playground di Sviluppo

## Obiettivo

Avere un'app dedicata agli esperimenti (`apps/playground`) senza sporcare i package di prodotto.

## Principi

- Base tecnica: Trinacria (`@trinacria/core`, `@trinacria/http`).
- Core CMS: `@trinacria-cms/core`.
- Implementazione default: `@trinacria-cms/core-pack`.
- `core-pack` dipende da Trinacria in modo esplicito (scelta architetturale ufficiale).

## Runtime

- Endpoint base: `GET /health`.
- Bootstrap: registra `core-pack` nel kernel CMS e avvia server HTTP Trinacria.

## Mongo in sviluppo

Mongo gira in Docker (`docker-compose.yml`) per test futuri di persistenza, ma il `core-pack` attuale e in-memory.

Avvio:

```bash
docker compose up -d mongo
npm run dev -w @trinacria-cms/playground
```

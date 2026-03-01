# 0000 - Visione e Boundary

## Obiettivo

Costruire un CMS headless modulare con:

- kernel stabile e piccolo
- API + SDK TypeScript
- dashboard admin ufficiale estendibile da plugin

## Boundary

Dentro `core`:

- container + lifecycle
- registry plugin/module
- contratti auth/rbac/workspace/settings

Dentro `core-pack`:

- integrazione runtime con Trinacria (by design)
- implementazione storage default (es. Mongo)
- users, roles, permissions, settings store
- API amministrative base

## Decisione framework

- `core` resta agnostico dal framework.
- `core-pack` dipende da Trinacria in modo intenzionale, come implementazione ufficiale del CMS.

## Outcome

Con questa separazione puoi tenere la base ufficiale `core + core-pack` ma creare anche pack alternativi (es. Postgres) senza riscrivere i plugin.

# trinacria-cms

Monorepo per un CMS headless basato su Trinacria.

## Struttura

- `apps/playground`: app di sviluppo/esperimenti (Trinacria + core + core-pack)
- `apps/admin`: dashboard React
- `apps/example-frontend`: frontend di esempio per developer
- `packages/core`: kernel tecnico (plugin contracts, RBAC/settings contracts, registry)
- `packages/core-pack`: bundle funzionale base (users, roles/permissions, settings, plugin default)
- `packages/plugin-content`: estensione contenuti
- `packages/plugin-media`: estensione media
- `packages/plugin-auth`: estensione auth
- `packages/sdk`: client SDK TS per consumare le API

## Naming

- Pacchetti CMS: `@trinacria-cms/*`
- Dipendenze framework: `@trinacria/*`

## Modello Architetturale

- `core` contiene contratti e runtime minimo agnostico.
- `core-pack` implementa la base pronta all'uso su Trinacria (utenze, ruoli/permessi, impostazioni, plugin first-party).
- I plugin estendono il CMS senza gonfiare il kernel.

## Documentazione Trinacria locale

Per rendere lo sviluppo con LLM piu autonomo, e presente una copia locale della documentazione Trinacria in:

- `docs/trinacria/`
- indice: `docs/README.md`

Include documentazione tecnica in inglese/italiano, assets e riferimenti root (`README`, `CHANGELOG`, `LICENSE`).

## Quick start

```bash
npm install
docker compose up -d mongo
npm run dev -w @trinacria-cms/playground
```

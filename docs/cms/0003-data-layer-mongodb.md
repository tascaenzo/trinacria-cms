# 0003 - Data Layer MongoDB

## Scelta

MongoDB e coerente con un CMS modulare per:

- schema flessibile per tipi contenuto dinamici
- metadati plugin/moduli naturalmente serializzabili
- buon fit con payload JSON delle API

## Uso Mongoose

Mongoose e ammesso come dipendenza principale del data layer per:

- validazione runtime
- middleware model-level
- migrazione progressiva di schema

Regola: niente dipendenze ODM/ORM aggiuntive oltre Mongoose.

## Collezioni core suggerite (fase 1)

- `system_settings`
- `system_plugins`
- `users`
- `roles`
- `permissions`
- `content_entries`
- `content_schemas`
- `media_assets`

## Strategia schema

- `content_entries` con struttura semi-dinamica (`fields` JSON + metadati standard).
- `content_schemas` versionati per plugin/module.
- indici minimi obbligatori su `slug`, `status`, `updatedAt`, `pluginId`.

## Multi-tenant (fase futura)

Prevedere da subito `tenantId` opzionale nei documenti core per evitare refactor invasivi.

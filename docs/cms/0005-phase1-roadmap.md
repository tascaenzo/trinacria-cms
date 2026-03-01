# 0005 - Roadmap Fase 1

## Deliverable

1. Core contracts + runtime minimo (`packages/core`)
2. Core-pack iniziale (users, roles/permissions, settings)
3. API bootstrap con auth base e health endpoint
4. Plugin `content` con CRUD base
5. SDK minimale per auth + content CRUD
6. Admin React con login + lista contenuti

## Sequenza consigliata

1. Stabilizzare i contratti core.
2. Implementare kernel/bootstrap plugin.
3. Integrare MongoDB + Mongoose + migrazioni iniziali.
4. Implementare RBAC e settings.
5. Costruire plugin content.
6. Rilasciare SDK.
7. Costruire dashboard admin.

## Definition of done fase 1

- installazione plugin first-party via manifest
- creazione tipo contenuto base
- CRUD contenuti protetto da RBAC
- SDK usabile da app esterna
- admin capace di gestire contenuti e media base

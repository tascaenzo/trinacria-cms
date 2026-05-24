# Trinacria CMS - Manuale Didattico (Italiano)

Questa sezione e progettata come un manuale tecnico progressivo, con un taglio da progettazione software di basso livello.

Obiettivo: capire come Trinacria CMS viene costruito sopra le librerie
framework Trinacria, poi come si incastrano kernel CMS, `core-pack` e futuri
plugin dominio.

Direzione architetturale: [plugin-first CMS direction](../architecture/plugin-first-cms-direction.md)

Glossario terminologico unico: [GLOSSARY.md](../GLOSSARY.md)

## Percorso di studio consigliato

1. [0000 - Metodo di studio e modello mentale](./0000-percorso-didattico.md)
2. [0001 - Kernel: architettura, confini e API pubbliche](./0001-kernel-modelli-strutture.md)
3. [0002 - Kernel file per file + esempi dal codice reale](./0002-kernel-file-per-file.md)
4. [0003 - Runtime deep dive: state machine, dependency graph, rollback](./0003-runtime-orchestrazione-deep-dive.md)
5. [0004 - Persistence: EntityRegistry, DbAdapter, Mongo adapter](./0004-persistence-mongo-e-entity.md)
6. [0005 - Core-pack file per file: users, roles, permissions, modello embedded](./0005-core-pack-architettura-file-per-file.md)
7. [0006 - Identity end-to-end: utenti, ruoli, permessi, policy rules (embedded)](./0006-users-end-to-end.md)
8. [0007 - Come progettare un nuovo plugin in modo professionale](./0007-creare-un-plugin.md)
9. [0008 - Testing, operazioni e governance tecnica](./0008-testing-operazioni-studio.md)
10. [0009 - Modelli teorici, strutture dati e logiche formali](./0009-modelli-teorici-strutture-dati.md)
11. [0010 - Atlante codice: mappe file -> responsabilita -> flussi](./0010-atlante-codice-e-flussi.md)
12. [0011 - SDK ufficiale, discovery runtime e API key](./0011-sdk-api-keys-discovery.md)
13. [0012 - Schema Mongo operativo](./0012-schema-db-mongo-operativo.md)
14. [0013 - Settings: sicurezza e ownership operativa](./0013-settings-sicurezza-e-ownership-operativa.md)
15. [0014 - Settings end-to-end](./0014-settings-end-to-end.md)
16. [0015 - Operazioni plugin e troubleshooting](./0015-operazioni-plugin-e-troubleshooting.md)
17. [0016 - M5 Runtime plugin foundation](./0016-m5-runtime-plugin-foundation.md)
18. [0017 - Cache e indurimento autenticazione](./0017-cache-e-indurimento-autenticazione.md)
19. [0018 - Milestone settings runtime hardening](./0018-settings-runtime-hardening.md)

## Cosa trovi in questo manuale

- Mappa completa della struttura codice reale (`packages/kernel`, `packages/core-pack`, `packages/sdk`, `apps/playground`, `apps/backoffice`).
- Spiegazione dettagliata delle responsabilita di ogni file chiave.
- Spiegazione modulo per modulo di service esportati, controller ed endpoint HTTP esposti.
- Descrizione del formato standard delle response (`data`, `error`, `meta`) e di come viene generato dal kernel.
- Descrizione del modello SDK ufficiale pubblicabile, dell'overlay generato in monorepo e della discovery runtime (`/v1/system/*`).
- Documentazione del modello API key come identita macchina di primo livello, integrata con ruoli, permessi e policy rules.
- Esempi di codice presi dalle implementazioni reali con connessione diretta ai file.
- Analisi teorica dei modelli che stanno dietro le scelte implementative.
- Linee guida su tradeoff, anti-pattern, test strategy e operativita.

## A chi serve

- Sviluppatori che vogliono estendere Trinacria CMS con plugin custom.
- Team che vogliono costruire un ecosistema modulare con confini tecnici rigorosi.
- Studenti di ingegneria informatica che vogliono un caso studio concreto di architettura framework.

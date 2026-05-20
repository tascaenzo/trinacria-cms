# 0000 - Metodo di studio e modello mentale

## 1. Perche questo progetto e un buon caso universitario

Trinacria CMS non e solo un'applicazione web. E un sistema composto da:

- una libreria/framework base (`@trinacria/*`);
- un kernel infrastrutturale (`@trinacria-cms/kernel`);
- plugin caricabili a runtime (`@trinacria-cms/core-pack` e futuri plugin);
- uno strato HTTP/OpenAPI;
- un'astrazione persistence indipendente dal database concreto.

Questa composizione lo rende un caso didattico completo per studiare:

- modularita ad alto livello;
- dependency injection con token;
- lifecycle orchestration con rollback;
- progettazione API rigorosa;
- design by contract.

## 2. Modello mentale: separare piattaforma e dominio

### Fondazione (Trinacria)

Trinacria fornisce il motore base:

- dependency injection;
- moduli;
- lifecycle applicativo;
- plugin HTTP;
- schema runtime-first;
- tooling.

Il CMS non deve duplicare questa base, ma specializzarla.

### Piattaforma CMS (Kernel)

Il kernel decide le regole del sistema:

- come si registra un plugin;
- quando un plugin puo essere caricato o disabilitato;
- come vengono esposte dipendenze e stato runtime;
- come un plugin accede al database senza dipendere dal driver concreto.

### Dominio (Plugin)

Il plugin implementa business logic:

- modello dati del dominio (`users`, `posts`, `media`, ...);
- API HTTP e DTO;
- regole applicative;
- capability dichiarate nel manifest.

Regola d'oro: il kernel non conosce il business, il plugin non decide le regole infrastrutturali globali.

## 3. Vista a strati (dal basso livello al prodotto)

1. `Contracts` (`packages/kernel/src/contracts`)

- definiscono interfacce e tipi pubblici.
- sono il "linguaggio comune" tra moduli.

2. `Runtime` (`packages/kernel/src/runtime`)

- implementa l'orchestrazione reale dei plugin.
- fa enforcement di compatibilita, dipendenze e transizioni di stato.

3. `HTTP + API Envelope` (`packages/kernel/src/http`, `api-contract.ts`)

- uniforma la superficie REST e la documentazione OpenAPI.

4. `core-pack` (`packages/core-pack/src`)

- implementazione riferimento di moduli dominio.
- baseline piattaforma: utenti, ruoli, permessi, settings, API keys.

5. Plugin dominio futuri

- implementano funzionalita come editoriale, ecommerce, media, SEO.
- non devono essere assorbiti dal core.

6. `Playground` (`apps/playground/src/main.ts`)

- bootstrap completo per test end-to-end.

## 4. Metodo di lettura consigliato (pratico)

1. Leggi prima i contratti, senza codice runtime.

Obiettivo: capire cosa e promesso pubblicamente.

2. Leggi runtime con un focus su failure handling.

Obiettivo: capire come il sistema reagisce quando qualcosa va male.

3. Leggi `core-pack` come "cliente" del kernel.

Obiettivo: vedere se i contratti sono davvero ergonomici.

4. Avvia playground e verifica i flussi con richieste reali.

Obiettivo: collegare teoria e comportamento runtime osservabile.

## 5. Esercizio base (45-60 minuti)

1. Avvia Mongo in locale.
2. Avvia playground (`apps/playground`).
3. Esegui `POST /v1/users`.
4. Esegui `GET /v1/users`.
5. Verifica `GET /health` e `GET /health/dependencies`.
6. Apri `/openapi.json` e `/docs`.

Competenze allenate in un unico esercizio:

- wiring DI;
- persistenza via adapter;
- envelope API;
- osservabilita runtime;
- coerenza schema/OpenAPI.

## 6. Domande guida da portare in ogni capitolo

- quale e il contratto pubblico e quale e il dettaglio interno?
- dove si trova il confine tra plugin e kernel?
- cosa succede in caso di errore? (rollback? stato failed? disable?)
- questa scelta facilita o complica il lavoro dei futuri plugin developer?

## 7. Criterio di maturita architetturale

Una feature e ben progettata se:

- e posizionata nel layer corretto;
- usa contratti/tokens, non accoppiamenti diretti;
- e testabile isolatamente;
- espone errori semanticamente utili;
- migliora, non degrada, la leggibilita del sistema.

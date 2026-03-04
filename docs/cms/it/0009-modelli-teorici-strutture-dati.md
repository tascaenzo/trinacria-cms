# 0009 - Modelli teorici, strutture dati e logiche formali

Questo capitolo collega implementazione e teoria software.

## 1. Runtime plugin come automa a stati finiti

Implementazione concreta:

- `PluginState`
- `ALLOWED_TRANSITIONS`
- `transition(pluginId, nextState)`

Modello teorico:

- FSM/LTS dove gli stati sono i lifecycle state plugin.
- le azioni (`load`, `unload`, `disable`) inducono transizioni.

Perche e corretto:

- le precondizioni sono codificate in modo esplicito;
- le transizioni invalide sono rilevate deterministicamente.

## 2. Dependency management come teoria dei grafi

Implementazione concreta:

- `assertDependencyGraphWithoutCycles`
- `sortByDependencies`
- `describeDependencies`

Modello teorico:

- grafo diretto `G = (V, E)` dove:
  - `V` = plugin registrati
  - `E` = dipendenze required
- aciclicita richiesta per load deterministico.

Algoritmo usato:

- DFS con set `visiting` e `visited`.

Interpretazione:

- `visiting` = pila ricorsiva corrente.
- incontrare nodo in `visiting` => ciclo.

## 3. Rollback come compensating transactions

Implementazione concreta:

- `rollbackFailedLoad`
- `unregisterModules` in ordine inverso

Modello teorico:

- SAGA/compensazione locale.

Differenza da transazione ACID:

- non c'e lock globale sull'intero sistema;
- si applicano azioni compensative per ripristinare consistenza operativa.

## 4. DI come grafo diretto aciclico di provider

Implementazione concreta:

- token in `core-tokens.ts`
- provider nei module file (`factoryProvider`, `classProvider`, `httpProvider`)

Modello teorico:

- ogni provider e un nodo computazionale;
- le dipendenze token sono archi;
- la risoluzione DI richiede ordine topologico coerente.

## 5. API design come algebra dei contratti

Implementazione concreta:

- `ApiSuccessResponse<T>`
- `ApiErrorResponse`
- `createPluginApiResponder`

Modello teorico:

- ADT (algebraic data type) a due varianti principali: success o error.
- `meta` e un contesto opzionale che trasporta informazioni trasversali (`pluginId`, paging).

Beneficio:

- client SDK piu semplici e composibili.

## 6. Persistence abstraction come pattern Ports & Adapters

Implementazione concreta:

- porta: `DbAdapter`, `DbRepository`
- adapter: `MongoDbAdapter`

Modello teorico:

- Hexagonal Architecture:
  - dominio dipende da porta astratta;
  - infrastruttura implementa adapter concreto.

Conseguenza:

- il plugin rimane portabile tra backend diversi.

## 7. Canonical ID come funzione deterministica

Implementazione concreta:

- `buildCanonicalId(pluginId, entityName, storageId)`

Modello teorico:

- funzione totale `f: P x E x S -> I`
  - `P`: insieme plugin
  - `E`: insieme entity
  - `S`: insieme storage id
  - `I`: spazio id canonici

Proprieta desiderate:

- determinismo
- leggibilita
- assenza collisioni locali (dato storageId univoco)

## 8. Schema runtime come validazione contrattuale

Implementazione concreta:

- `@trinacria/schema` in DTO e domain schema
- `parse(...)` su input e record letti

Modello teorico:

- Design by Contract:
  - precondizione: input valido
  - postcondizione: output conforme

Effetto:

- elimina classi di bug silenziosi su shape/typing.

## 9. Health model come funzione di stato composto

Implementazione concreta:

- `deriveStatus(records, dependencies, db)`

Modello teorico:

- `status = h(runtime_state, dependency_state, db_state)`

Output classificato:

- `ok`, `degraded`, `down`.

Utilita:

- semplifica alerting e SLO operativi.

## 10. Versioning/compatibilita come logica predicativa

Implementazione concreta:

- `satisfiesVersion(version, range)`
- `assertPluginCompatibility(manifest, coreVersion)`

Modello teorico:

- predicato booleano su tuple `(coreVersion, requiresCore)`.
- se falso, plugin non entra nella pipeline di attivazione.

## 11. Osservazioni critiche per evoluzioni future

- FSM attuale e locale al nodo: in multi-node servira coordinamento distribuito.
- Retry policy semplice: servono metriche e circuit breaking per produzione.
- Capability model statico: utile introdurre policy engine dinamico su `AuthzService`.

## 12. Conclusione

Le implementazioni attuali non sono solo "scelte pratiche": derivano da modelli teorici classici (automi, grafi, contratti, adapters) applicati a un CMS plugin-first.

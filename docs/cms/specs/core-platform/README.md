# Specifiche core platform

Questa directory raccoglie le specifiche documentali da chiudere prima di
procedere con l'implementazione della piattaforma core plugin-first.

## Fase corrente

Milestone: `M4.0 - Core Platform Specifications`

Obiettivo: chiarire contratti, confini e comportamenti core prima di creare
nuovi package dominio o nuove API.

## Specifiche previste

| File                                  | Focus                                                             | Stato   |
| ------------------------------------- | ----------------------------------------------------------------- | ------- |
| `low-level-specification-standard.md` | standard obbligatorio per specifiche implementabili M4.0          | `draft` |
| `m4-core-platform-foundation.md`      | overview funzionale della milestone core e decisioni fondative    | `draft` |
| `core-boundaries.md`                  | confini tra Trinacria, kernel, core-pack e plugin dominio         | `draft` |
| `public-plugin-api.md`                | API pubbliche per sviluppatori plugin                             | `draft` |
| `plugin-contract.md`                  | manifest, lifecycle, capability, permission, settings, admin      | `draft` |
| `plugin-runtime.md`                   | stati, transizioni, ordering, rollback, enable/disable            | `draft` |
| `security-core.md`                    | capability, permission, policy, provisioning, guards, signed call | `draft` |
| `plugin-entity-mongo.md`              | Mongo storage core, entity, schema, repository, namespace         | `draft` |
| `settings-core.md`                    | configuration registry, settings, secrets, visibility, audit      | `draft` |
| `configuration-registry.md`           | draft funzionale del registro configurazioni e secret             | `draft` |
| `namespace-governance.md`             | namespace, alias, reserved names, ownership e collision policy    | `draft` |
| `plugin-event-bus.md`                 | event bus opzionale, subscription policy e delivery               | `draft` |
| `admin-contribution-resource.md`      | route, navigation, resource registry, UI custom                   | `draft` |
| `installation-bootstrap.md`           | setup iniziale, admin user, core-pack provisioning                | `draft` |
| `plugin-packaging-discovery.md`       | package shape, manifest location, compatibility, discovery        | `draft` |
| `observability-operations.md`         | health, event log, diagnostics, runtime status                    | `draft` |
| `sdk-api-contract.md`                 | OpenAPI, API envelope, SDK generation, compatibility              | `draft` |

## Ordine di lettura

Questo e l'ordine consigliato per capire le specifiche senza perdere il filo
architetturale.

1. [`low-level-specification-standard.md`](./low-level-specification-standard.md)
   - spiega quale livello di dettaglio deve avere ogni specifica M4.0
2. [`m4-core-platform-foundation.md`](./m4-core-platform-foundation.md)
   - sintetizza le decisioni fondative della milestone
3. [`core-boundaries.md`](./core-boundaries.md)
   - chiarisce cosa appartiene a Trinacria, kernel, core-pack, plugin,
     admin-kernel e trinacria-ui
4. [`public-plugin-api.md`](./public-plugin-api.md)
   - raccoglie le API pubbliche da usare concretamente nello sviluppo plugin
5. [`plugin-contract.md`](./plugin-contract.md)
   - definisce la forma target di un plugin CMS
6. [`namespace-governance.md`](./namespace-governance.md)
   - definisce namespace, alias, reserved names e collision policy
7. [`plugin-runtime.md`](./plugin-runtime.md)
   - definisce stati, lifecycle, dependency ordering e rollback
8. [`security-core.md`](./security-core.md)
   - definisce utenti, ruoli, permission, capability, policy e provisioning
9. [`plugin-entity-mongo.md`](./plugin-entity-mongo.md)
   - definisce Mongo storage core, entity registry, repository e indici
10. [`settings-core.md`](./settings-core.md)

- definisce il settings core come configuration registry sicuro

11. [`configuration-registry.md`](./configuration-registry.md)
    - approfondisce settings, secrets, visibility, masking, reveal e audit
12. [`plugin-event-bus.md`](./plugin-event-bus.md)
    - definisce comunicazione inter-plugin opzionale tramite eventi
13. [`admin-contribution-resource.md`](./admin-contribution-resource.md)
    - definisce navigation, route, resource, widget e UI custom
14. [`installation-bootstrap.md`](./installation-bootstrap.md)
    - definisce primo setup, admin user e provisioning baseline
15. [`plugin-packaging-discovery.md`](./plugin-packaging-discovery.md)
    - definisce shape package, discovery locale/configurata e compatibility
16. [`observability-operations.md`](./observability-operations.md)
    - definisce health, diagnostics, audit e operation events
17. [`sdk-api-contract.md`](./sdk-api-contract.md)
    - definisce API envelope, error model, OpenAPI e SDK generation

## Ordine di implementazione consigliato

L'ordine di implementazione non coincide perfettamente con l'ordine di lettura:
prima vanno messi in piedi i contratti che bloccano gli altri moduli.

| Step | Area                   | Specifiche principali                                                 | Output implementativo atteso                                   |
| ---- | ---------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1    | Contratti fondativi    | `core-boundaries.md`, `plugin-contract.md`, `namespace-governance.md` | manifest target, namespace validator, collision policy         |
| 2    | Runtime plugin         | `plugin-runtime.md`, `plugin-packaging-discovery.md`                  | state machine, operations API, discovery locale/configurata    |
| 3    | Security baseline      | `security-core.md`                                                    | permission parser, roles/grants/policy provisioning completo   |
| 4    | Mongo storage core     | `plugin-entity-mongo.md`                                              | entity registry, collection naming, index sync, repository API |
| 5    | Configuration registry | `settings-core.md`, `configuration-registry.md`                       | settings registry, secret storage, reveal/rotate policy        |
| 6    | Event bus              | `plugin-event-bus.md`, `observability-operations.md`                  | event declaration, publish/subscribe, audit events             |
| 7    | Admin extensibility    | `admin-contribution-resource.md`, `security-core.md`                  | route/resource/widget registry capability-aware                |
| 8    | Bootstrap piattaforma  | `installation-bootstrap.md`, `security-core.md`, `settings-core.md`   | primo setup idempotente, admin user, baseline config           |
| 9    | API/SDK hardening      | `sdk-api-contract.md`, tutte le specifiche con endpoint               | OpenAPI/SDK coerenti con i nuovi contratti                     |

## Dipendenze tra specifiche

```text
foundation
  -> boundaries
  -> plugin contract
      -> namespace governance
      -> runtime
      -> security
      -> Mongo storage
      -> settings/configuration registry
      -> event bus
      -> admin extensibility
      -> packaging/discovery
      -> operations
      -> API/SDK
```

Dipendenze critiche:

- `plugin-contract.md` dipende da `core-boundaries.md`
- `plugin-runtime.md` dipende da `plugin-contract.md` e `namespace-governance.md`
- `security-core.md` dipende da `plugin-contract.md`
- `plugin-entity-mongo.md` dipende da `namespace-governance.md`
- `settings-core.md` dipende da `security-core.md` e `namespace-governance.md`
- `plugin-event-bus.md` dipende da `plugin-contract.md`, `security-core.md` e
  `namespace-governance.md`
- `admin-contribution-resource.md` dipende da `security-core.md` e
  `plugin-contract.md`
- `sdk-api-contract.md` dipende da tutte le specifiche che espongono endpoint

## Decisioni chiuse

- Il manifest plugin e la fonte dichiarativa canonica: `entities`, `settings`,
  `events` e `admin` stanno nel manifest backend. Registry e cache sono
  derivabili.
- `DbAdapter` resta solo come nome/compat layer interno temporaneo; la semantica
  target e Mongo-first e non multi-database.
- L'event bus parte in-process con delivery `sync`/`async`; `deferred`, broker
  esterni e persistenza delivery restano evoluzioni future.
- Il kernel possiede runtime diagnostics/runtime events; `core-pack` possiede lo
  storage audit centralizzato.

## Criterio per iniziare il codice

Si puo iniziare una implementazione quando lo step corrispondente ha:

- specifica in stato almeno `draft`
- acceptance criteria presenti
- error model presente
- storage/API/DTO definiti se applicabili
- gap rispetto al codice attuale esplicitati

Per implementazioni ampie o condivise, lo stato target deve diventare
`approved`.

## Regola di fase

Finche queste specifiche non sono chiuse, non si implementano nuovi package
dominio. Le modifiche ammesse sono documentali e di pianificazione.

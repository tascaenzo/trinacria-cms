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

## Regola di fase

Finche queste specifiche non sono chiuse, non si implementano nuovi package
dominio. Le modifiche ammesse sono documentali e di pianificazione.

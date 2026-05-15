# Trinacria CMS - Unified Terminology Glossary

This glossary is the single source of truth for terminology used in `docs/cms/it` and `docs/cms/en`.

## Canonical Terms

| Concept                          | Canonical Term          | Italian Usage                           | English Usage                        | Notes                                                                      |
| -------------------------------- | ----------------------- | --------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------- |
| Framework core                   | `kernel`                | `kernel`                                | `kernel`                             | Keep lowercase unless sentence start.                                      |
| Official baseline plugin         | `core-pack`             | `core-pack`                             | `core-pack`                          | Always hyphenated. Never `core pack`.                                      |
| Plugin metadata file             | `Plugin Manifest`       | `manifest plugin`                       | `plugin manifest`                    | Refers to `id`, `version`, `requiresCore`, `capabilities`, `dependencies`. |
| Runtime lifecycle engine         | `Plugin Runtime`        | `runtime plugin`                        | `plugin runtime`                     | Component implementing register/load/unload/reload/disable.                |
| Lifecycle phase model            | `State Machine`         | `state machine`                         | `state machine`                      | Keep English technical term in both languages.                             |
| Dependency representation        | `Dependency Graph`      | `dependency graph` / `grafo dipendenze` | `dependency graph`                   | Prefer `dependency graph` in chapter titles for symmetry.                  |
| Failure recovery                 | `Rollback`              | `rollback`                              | `rollback`                           | Keep technical term in English.                                            |
| Isolation context                | `Namespace`             | `namespace`                             | `namespace`                          | Includes plugin and optional workspace dimension.                          |
| Domain entity catalog            | `Entity Registry`       | `EntityRegistry` / `registro entita`    | `EntityRegistry` / `entity registry` | Code identifier remains `EntityRegistry`.                                  |
| Persistence abstraction          | `DbAdapter`             | `DbAdapter`                             | `DbAdapter`                          | Keep code identifier in docs.                                              |
| Data access unit                 | `Repository`            | `repository`                            | `repository`                         | Layer between service and adapter.                                         |
| Transport contracts              | `DTO`                   | `DTO`                                   | `DTO`                                | Use for API input/output schemas.                                          |
| Response contract                | `API Envelope`          | `API envelope`                          | `API envelope`                       | Success/error standardized payload.                                        |
| Canonical application identifier | `Canonical ID`          | `id canonico`                           | `canonical ID`                       | Distinct from storage `_id`.                                               |
| Database native identifier       | `Storage ID`            | `id storage`                            | `storage ID`                         | Usually Mongo `_id`.                                                       |
| App startup boundary             | `Starter` / `Bootstrap` | `starter` / `bootstrap`                 | `starter` / `bootstrap`              | When referring to code file, use `cms-starter.ts`.                         |
| Dependency injection handle      | `Token`                 | `token DI`                              | `DI token`                           | Use `CORE_TOKENS.*` for concrete references.                               |
| Capability export                | `Capability`            | `capability`                            | `capability`                         | Naming rule: `area.action`.                                                |
| Host application                 | `Host App`              | `app host`                              | `host app`                           | Application that bootstraps kernel + plugins.                              |
| Health snapshot model            | `Health Snapshot`       | `snapshot health`                       | `health snapshot`                    | Aggregates runtime + dependency + DB status.                               |

## Naming Rules

1. Always use `core-pack` with hyphen.
2. In English prose prefer `plugin ID` and `canonical ID`.
3. Keep code identifiers as-is: `DbAdapter`, `EntityRegistry`, `PluginRuntime`, `CORE_TOKENS`.
4. Use `API envelope` consistently for success/error response structure.
5. Use `state machine` and `dependency graph` as canonical technical labels.

## Chapter Alignment (IT <-> EN)

| Italian Chapter                                | English Chapter                              | Alignment |
| ---------------------------------------------- | -------------------------------------------- | --------- |
| `0000-percorso-didattico.md`                   | `0000-learning-path.md`                      | aligned   |
| `0001-kernel-modelli-strutture.md`             | `0001-kernel-models-structures.md`           | aligned   |
| `0002-kernel-file-per-file.md`                 | `0002-kernel-file-by-file.md`                | aligned   |
| `0003-runtime-orchestrazione-deep-dive.md`     | `0003-runtime-orchestration-deep-dive.md`    | aligned   |
| `0004-persistence-mongo-e-entity.md`           | `0004-persistence-mongo-and-entity.md`       | aligned   |
| `0005-core-pack-architettura-file-per-file.md` | `0005-core-pack-file-by-file.md`             | aligned   |
| `0006-users-end-to-end.md`                     | `0006-users-end-to-end.md`                   | aligned   |
| `0007-creare-un-plugin.md`                     | `0007-build-a-plugin.md`                     | aligned   |
| `0008-testing-operazioni-studio.md`            | `0008-testing-operations-study.md`           | aligned   |
| `0009-modelli-teorici-strutture-dati.md`       | `0009-theoretical-models-data-structures.md` | aligned   |
| `0010-atlante-codice-e-flussi.md`              | `0010-code-atlas-and-flows.md`               | aligned   |

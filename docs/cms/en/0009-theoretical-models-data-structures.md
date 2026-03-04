# 0009 - Theoretical models, data structures, and formal logic

This chapter links implementation choices to software engineering theory.

## Plugin runtime as a finite state machine

Implementation elements:

- `PluginState`
- `ALLOWED_TRANSITIONS`
- transition validation logic

Model:

- states + actions + transition relation.

## Dependencies as directed graphs

Implementation elements:

- cycle checks
- topological sorting in `loadMany`
- graph snapshots from `describeDependencies`

Model:

- directed graph where nodes are plugins and edges are required dependencies.

## Rollback as compensating transactions

Implementation elements:

- `rollbackFailedLoad`
- reverse module unregistration

Model:

- best-effort compensation pattern (not global ACID transaction).

## DI as a dependency graph

Implementation elements:

- tokens
- providers (`factoryProvider`, `classProvider`, `httpProvider`)

Model:

- providers as nodes, token dependencies as edges.

## Persistence as Ports and Adapters

Implementation elements:

- `DbAdapter` interface (port)
- `MongoDbAdapter` concrete implementation (adapter)

Model:

- domain depends on ports, infrastructure plugs adapters.

## Canonical IDs as deterministic mapping

Implementation element:

- `buildCanonicalId(pluginId, entityName, storageId)`

Model:

- deterministic function from plugin/entity/storage id to stable CMS id.

## Health as derived composite state

Implementation element:

- health status derivation from runtime + dependencies + DB checks.

Model:

- classifier function over multiple subsystem states.

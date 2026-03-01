# 0005 - DB abstraction and plugin isolation

## Goal

Prevent plugins from touching the global database directly and block writes outside their own domain.

## Core contracts

The `core` provides storage-agnostic DB contracts:

- `DbClient`
- `DbCollection`
- `NamespacedDbFactory`

Plugins should use these contracts instead of raw Mongoose/driver APIs.

## Namespace isolation

When a plugin is registered, the kernel injects an isolated DB client into its scope:

- if the DB provider supports `forNamespace(...)`, plugin namespace is used
- otherwise the kernel auto-prefixes collection names (`pluginId__collectionName`)

This prevents collisions across plugins and reduces unauthorized writes.

## Practical rule

- default path: plugins use core abstract ports only
- storage-specific exceptions: allowed only with explicit manifest capability

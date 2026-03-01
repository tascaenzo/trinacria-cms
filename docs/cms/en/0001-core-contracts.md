# 0001 - Core Contracts

These contracts are defined in `packages/core/src/contracts`.

## Container and providers

- `Container`: register/resolve/has/createScope
- `ProviderDefinition`: token + value + allowOverride
- `CORE_TOKENS`: standard tokens (config, logger, db, events, auth, settings, settingsStore, workspaceResolver, rbac)

## Workspace

- `WorkspaceContext`: `workspaceId`, optional `pluginId`, `userId`
- `WorkspaceResolver`: resolves the current workspace context

## Settings

- `SettingsStore`: raw persistence (`get`, `set`, `delete`, `list`)
- `SettingsService`: high-level runtime API
- Supported scopes: `global`, `workspace`, `plugin`, `user`

## Auth and RBAC

- `AuthProvider`: authenticates input and returns `AuthResult`
- `Principal`: authenticated identity
- `RbacService`: permission checks through `hasPermission`

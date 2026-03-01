# 0001 - Contratti Core

Questi contratti sono definiti in `packages/core/src/contracts`.

## Container e provider

- `Container`: register/resolve/has/createScope
- `ProviderDefinition`: token + value + allowOverride
- `CORE_TOKENS`: token standard (config, logger, db, events, auth, settings, settingsStore, workspaceResolver, rbac)

## Workspace

- `WorkspaceContext`: `workspaceId`, opzionale `pluginId`, `userId`
- `WorkspaceResolver`: risolve il contesto workspace corrente

## Settings

- `SettingsStore`: persistenza raw (`get`, `set`, `delete`, `list`)
- `SettingsService`: API ad alto livello per il runtime
- Scopes supportati: `global`, `workspace`, `plugin`, `user`

## Auth e RBAC

- `AuthProvider`: autentica input e restituisce `AuthResult`
- `Principal`: identita autenticata
- `RbacService`: verifica permessi tramite `hasPermission`

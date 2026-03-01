# 0002 - Workspace e Settings

## Risoluzione settings

`DefaultSettingsService` usa la precedence:

1. user
2. plugin
3. workspace
4. global

La prima entry trovata viene restituita.

## Linee guida implementazione (`core-pack`)

- Collezione: `system_settings`
- Chiave logica: `scope + workspaceId + pluginId + userId + namespace + key`
- Optimistic locking: campo `version`
- Audit: `updatedAt`, `updatedBy`

## Policy minime

- Niente letture cross-workspace senza permesso esplicito.
- Namespace obbligatorio per tutti i settings plugin.
- Validazione schema per namespace lato core-pack.

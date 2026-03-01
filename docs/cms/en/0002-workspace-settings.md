# 0002 - Workspace and Settings

## Settings resolution

`DefaultSettingsService` uses this precedence:

1. user
2. plugin
3. workspace
4. global

The first matching entry is returned.

## Implementation guidance (`core-pack`)

- Collection: `system_settings`
- Logical key: `scope + workspaceId + pluginId + userId + namespace + key`
- Optimistic locking: `version` field
- Audit: `updatedAt`, `updatedBy`

## Minimum policies

- No cross-workspace reads without explicit permission.
- Namespace is mandatory for every plugin setting.
- Namespace schema validation lives in core-pack.

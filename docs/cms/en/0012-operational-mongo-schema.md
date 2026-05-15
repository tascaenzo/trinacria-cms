# 0012 - Operational Mongo schema

This document is a quick reference, intended more as an operational schema than a theoretical chapter.

## 1. Physical naming rule

### Kernel namespace

- pattern: `kernel__<entity>`

Example:

- `kernel__installed_plugins`

### Regular plugin namespace

- pattern: `plugin_<normalizedPluginId>__<entity>`

Examples:

- `plugin_core_pack__users`
- `plugin_core_pack__roles`

## 2. Current collection map

| Collection                            | Logical namespace | Logical entity      | Purpose                                         |
| ------------------------------------- | ----------------- | ------------------- | ----------------------------------------------- |
| `kernel__installed_plugins`           | `kernel`          | `installed_plugins` | persistent runtime state for installed plugins  |
| `plugin_core_pack__users`             | `core-pack`       | `users`             | users and embedded role assignments             |
| `plugin_core_pack__roles`             | `core-pack`       | `roles`             | roles and embedded grants                       |
| `plugin_core_pack__permissions`       | `core-pack`       | `permissions`       | canonical permission catalog                    |
| `plugin_core_pack__role_policy_rules` | `core-pack`       | `role_policy_rules` | advanced policy rules                           |
| `plugin_core_pack__api_keys`          | `core-pack`       | `api_keys`          | machine credentials and attached authz material |
| `plugin_core_pack__settings`          | `core-pack`       | `settings`          | definitions, values, and encrypted secrets      |

## 3. Compact diagram

```mermaid
erDiagram
  "kernel__installed_plugins" ||--o{ "plugin_core_pack__permissions" : "sourcePluginId"
  "kernel__installed_plugins" ||--o{ "plugin_core_pack__roles" : "ownerPluginId"
  "plugin_core_pack__users" ||--o{ "users.roleAssignments[]" : "embedded"
  "plugin_core_pack__roles" ||--o{ "roles.permissionGrants[]" : "embedded"
  "plugin_core_pack__roles" ||--o{ "plugin_core_pack__role_policy_rules" : "roleCode"
  "plugin_core_pack__api_keys" ||--o{ "plugin_core_pack__roles" : "roleCodes[]"
  "plugin_core_pack__api_keys" ||--o{ "plugin_core_pack__permissions" : "permissionKeys[]"
```

## 4. Guiding fields by collection

### `kernel__installed_plugins`

Key fields:

- `id`
- `pluginId`
- `version`
- `state`
- `enabled`
- `failureCount`
- `disabledReason`
- `manifest`
- `updatedAt`

Main indexes:

- unique `pluginId`
- `state`
- `enabled`
- `updatedAt desc`

### `plugin_core_pack__users`

Key fields:

- `id`
- `email`
- `username`
- `status`
- `roleAssignments[]`

Main indexes:

- unique `id`
- unique `email`
- unique `username`

### `plugin_core_pack__roles`

Key fields:

- `id`
- `code`
- `ownerPluginId`
- `status`
- `permissions[]`
- `permissionGrants[]`

Main indexes:

- unique `id`
- unique `code`
- `ownerPluginId`
- `status`

### `plugin_core_pack__permissions`

Key fields:

- `id`
- `key`
- `sourcePluginId`
- `status`

Main indexes:

- unique `id`
- unique `key`
- `sourcePluginId`
- `status`

### `plugin_core_pack__role_policy_rules`

Key fields:

- `id`
- `roleCode`
- `effect`
- `permissionPattern`
- `conditions[]`
- `sourcePluginId`

Main indexes:

- unique `id`
- `roleCode`
- `sourcePluginId`

### `plugin_core_pack__api_keys`

Key fields:

- `id`
- `lookupId`
- `name`
- `kind`
- `status`
- `hash`
- `roleCodes[]`
- `permissionKeys[]`
- `policyRules[]`
- `expiresAt`
- `lastUsedAt`

Main indexes:

- unique `id`
- unique `lookupId`
- `status`
- `kind`
- `expiresAt`

### `plugin_core_pack__settings`

Key fields:

- `id`
- `key`
- `kind`
- `ownerPluginId`
- `status`
- `schema`
- `defaultValue`
- `value`
- `cipherText`
- `algorithm`
- `keyVersion`
- `version`

Main indexes:

- unique `id`
- unique `(kind, key)`
- `ownerPluginId + kind`
- `key`

## 5. Invariants that must not be violated

- `_id` stays storage-internal and must not leak through business APIs
- every record must expose a canonical `id`
- security data must track plugin ownership
- secrets must never be stored in clear text
- join-like relations are materialized as embedded arrays where the model requires it

## 6. Quick debugging map

If a problem concerns:

- plugin runtime state: inspect `kernel__installed_plugins`
- user role assignments: inspect `plugin_core_pack__users.roleAssignments[]`
- role grants: inspect `plugin_core_pack__roles.permissionGrants[]`
- advanced policies: inspect `plugin_core_pack__role_policy_rules`
- machine integrations: inspect `plugin_core_pack__api_keys`
- plugin configuration: inspect `plugin_core_pack__settings`

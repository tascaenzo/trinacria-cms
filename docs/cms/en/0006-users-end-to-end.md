# 0006 - Identity end-to-end: users, roles, permissions, policy rules (embedded model)

This chapter describes the full identity flow, including advanced authorization policies.

## 1. Data model for this step

Main entities:

- `users`
- `roles`
- `permissions`
- `role_policy_rules`
- `api_keys`

Embedded relations:

- `users.roleAssignments[]`
- `roles.permissionGrants[]`

Ownership fields:

- `permissions.sourcePluginId`
- `role_policy_rules.sourcePluginId`
- `roles.ownerPluginId`
- `users.roleAssignments[].sourcePluginId`
- `roles.permissionGrants[].sourcePluginId`

## 2. Effective permission resolution

`UserAccessService` pipeline:

1. read `users.roleAssignments`
2. keep active roles
3. read `roles.permissionGrants`
4. keep active permissions
5. return unique keys

Formula:

`effectivePermissions(user) = ActivePermissions( EmbeddedGrants( ActiveRoles( EmbeddedUserAssignments(user) ) ) )`

## 3. Authorization rule resolution

`UserAccessService#resolveUserAuthorizationRules(...)` builds final rules from:

- exact allow rules derived from active grants
- wildcard/conditional policy rules from `role_policy_rules`

## 4. Advanced authz behavior

`CorePackAuthzService` implements:

- canonical key matching `<pluginId>:<resource>:<action>`
- wildcard patterns `<pluginId>:<resource|*>:<action|*>`
- precedence: `deny` before `allow`
- supported conditions:
  - `resource_id_required`
  - `resource_id_equals_subject`

Beyond user subjects, the system also supports machine subjects:

- format: `api-key:<id>`
- authz material: `roleCodes[]`, `permissionKeys[]`, `policyRules[]`
- resolution path: `ApiKeysService` -> `CorePackAuthzService`

This makes the same authorization engine usable for:

- JWT-backed user sessions
- server-to-server integrations through API keys

## 5. Active APIs

- `POST /v1/users/:id/roles`
- `GET /v1/users/:id/roles`
- `DELETE /v1/users/:id/roles/:roleCode`
- `GET /v1/users/:id/permissions`
- `GET /v1/api-keys`
- `POST /v1/api-keys`
- `POST /v1/api-keys/:id/rotate`
- `POST /v1/api-keys/:id/revoke`

## 6. Extended manifest security

In plugin manifests, beside `permissions/roles/grants`, you can now declare:

- `policyRules[]`

with fields:

- `roleCode`
- `effect` (`allow` | `deny`)
- `permissionPattern`
- `conditions[]`

## 7. Plugin lifecycle

On load:

- provisions `permissions/roles/policyRules` + grants embedded inside roles

On unregister:

- deprovisions owned contributions (including embedded assignments/grants)

## 8. Conclusion

Identity now includes advanced enforcement: classic grants plus wildcard/deny/condition-based policies, while preserving plugin ownership boundaries and deterministic cleanup.

In addition, the model now supports first-class machine identities through API keys without introducing a separate permission engine: the subject changes, while the formal authorization logic stays the same.

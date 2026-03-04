# 0006 - Identity end-to-end: utenti, ruoli, permessi, policy rules (modello embedded)

Questo capitolo descrive il flusso identity completo, includendo il nuovo livello authz avanzato.

## 1. Modello dati di questo step

Entita principali:

- `users`
- `roles`
- `permissions`
- `role_policy_rules`

Relazioni embedded:

- `users.roleAssignments[]`
- `roles.permissionGrants[]`

Ownership tracking:

- `permissions.sourcePluginId`
- `role_policy_rules.sourcePluginId`
- `roles.ownerPluginId`
- `users.roleAssignments[].sourcePluginId`
- `roles.permissionGrants[].sourcePluginId`

## 2. Risoluzione permessi effettivi

Pipeline `UserAccessService`:

1. leggi `users.roleAssignments`
2. filtra ruoli attivi
3. leggi `roles.permissionGrants`
4. filtra permission attive
5. ritorna set unico di key

Formula:

`effectivePermissions(user) = ActivePermissions( EmbeddedGrants( ActiveRoles( EmbeddedUserAssignments(user) ) ) )`

## 3. Risoluzione regole authz

`UserAccessService#resolveUserAuthorizationRules(...)` costruisce regole finali da:

- allow esatti derivati dai grants attivi
- policy rules wildcard/conditional da `role_policy_rules`

## 4. Authz avanzato

`CorePackAuthzService` implementa:

- match su key canonica `<pluginId>:<resource>:<action>`
- wildcard pattern `<pluginId>:<resource|*>:<action|*>`
- precedence: `deny` prima di `allow`
- condizioni supportate:
  - `resource_id_required`
  - `resource_id_equals_subject`

## 5. API attive

- `POST /v1/users/:id/roles`
- `GET /v1/users/:id/roles`
- `DELETE /v1/users/:id/roles/:roleCode`
- `GET /v1/users/:id/permissions`

## 6. Manifest security esteso

Nel manifest plugin, oltre a `permissions/roles/grants`, e ora supportato:

- `policyRules[]`

con campi:

- `roleCode`
- `effect` (`allow` | `deny`)
- `permissionPattern`
- `conditions[]`

## 7. Lifecycle plugin

Su load:

- provisioning `permissions/roles/policyRules` + grants embedded nei ruoli

Su unregister:

- deprovisioning contributi owned (incluse assegnazioni/grants embedded)

## 8. Conclusione

Il sistema identity ora include enforcement avanzato: grants classici + policy wildcard/deny/condition-based, mantenendo ownership per plugin e cleanup deterministico.

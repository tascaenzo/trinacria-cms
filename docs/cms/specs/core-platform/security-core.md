# Security core

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-20`

## Decisione

Il security core e il contratto trasversale che collega utenti, ruoli,
permission, capability, policy, plugin provisioning, admin guards e chiamate
plugin-to-core signed.

Il kernel definisce i contratti e i punti di integrazione. `core-pack`
implementa la baseline ufficiale: utenti, ruoli, permission, grants, policy
rules, API keys e provisioning security dichiarato dai plugin.

## Responsabilita

| Area                    | Owner                      | Responsabilita                               |
| ----------------------- | -------------------------- | -------------------------------------------- |
| Permission key contract | `@trinacria-cms/kernel`    | Parsing, matching, ownership, wildcard       |
| Authz service contract  | `@trinacria-cms/kernel`    | Interfaccia di verifica permessi             |
| Admin route guard       | `@trinacria-cms/kernel`    | Contratto guard route core/admin             |
| Users                   | `@trinacria-cms/core-pack` | Identita umane                               |
| Roles                   | `@trinacria-cms/core-pack` | Ruoli baseline e plugin-owned                |
| Permission provisioning | `@trinacria-cms/core-pack` | Sync manifest security                       |
| Policy rules            | `@trinacria-cms/core-pack` | Allow/deny, wildcard, condizioni             |
| API keys                | `@trinacria-cms/core-pack` | Identita macchina                            |
| Plugin signed calls     | `@trinacria-cms/core-pack` | Autenticazione plugin owner per secret/write |
| Backoffice visibility   | `packages/admin-kernel`    | Rendering capability-aware                   |

## Modello dati

### Permission

```ts
export interface PermissionDocument {
  id: string;
  key: string;
  sourcePluginId: string;
  displayName: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

`key` usa il formato:

```text
<pluginId>:<resource>:<action>
```

### Role

```ts
export interface RoleDocument {
  id: string;
  code: string;
  name: string;
  description?: string;
  ownerPluginId?: string;
  permissionGrants: RolePermissionGrant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RolePermissionGrant {
  sourcePluginId: string;
  permissionKeys: string[];
  grantedAt: Date;
}
```

### User role assignment

```ts
export interface UserRoleAssignment {
  roleCode: string;
  assignedAt: Date;
  assignedBy?: string;
}
```

### Policy rule

```ts
export interface RolePolicyRuleDocument {
  id: string;
  roleCode: string;
  sourcePluginId: string;
  effect: "allow" | "deny";
  permissionPattern: string;
  conditions: PluginPolicyCondition[];
  createdAt: Date;
  updatedAt: Date;
}
```

## Contratti TypeScript target

```ts
export interface AuthzSubject {
  type: "user" | "api_key" | "plugin";
  id: string;
  roleCodes?: readonly string[];
  pluginId?: string;
}

export interface AuthzCheckRequest {
  subject: AuthzSubject;
  permission: string;
  resourceId?: string;
  context?: Record<string, unknown>;
}

export interface AuthzDecision {
  allowed: boolean;
  reason: "allow" | "deny" | "missing_permission" | "condition_failed";
  matchedRule?: string;
}

export interface AuthzService {
  can(request: AuthzCheckRequest): Promise<AuthzDecision>;
}
```

## API HTTP target

| Method | Path                               | Permission                     | Response              |
| ------ | ---------------------------------- | ------------------------------ | --------------------- |
| `GET`  | `/v1/security/permissions`         | `core-pack:permissions:read`   | `PermissionDto[]`     |
| `GET`  | `/v1/security/roles`               | `core-pack:roles:read`         | `RoleDto[]`           |
| `POST` | `/v1/security/roles`               | `core-pack:roles:write`        | `RoleDto`             |
| `POST` | `/v1/security/roles/{code}/grants` | `core-pack:roles:write`        | `RoleDto`             |
| `GET`  | `/v1/security/policy-rules`        | `core-pack:policy-rules:read`  | `RolePolicyRuleDto[]` |
| `POST` | `/v1/security/policy-rules`        | `core-pack:policy-rules:write` | `RolePolicyRuleDto`   |

Tutte le response usano `ApiSuccessResponse` o `ApiErrorResponse`.

## DTO request/response

```ts
export interface CreateRoleRequestDto {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateRoleGrantRequestDto {
  sourcePluginId: string;
  permissionKeys: string[];
}

export interface CreatePolicyRuleRequestDto {
  roleCode: string;
  effect: "allow" | "deny";
  permissionPattern: string;
  conditions?: PluginPolicyCondition[];
}
```

## Storage Mongo

Collections:

| Collection                       | Owner       | Note                      |
| -------------------------------- | ----------- | ------------------------- |
| `cms_core_permissions`           | `core-pack` | permission provisionate   |
| `cms_core_roles`                 | `core-pack` | ruoli e grant embedded    |
| `cms_core_role_policy_rules`     | `core-pack` | allow/deny e wildcard     |
| `cms_core_user_role_assignments` | `core-pack` | opzionale se non embedded |

Indici minimi:

| Collection                   | Index                      | Unique |
| ---------------------------- | -------------------------- | ------ |
| `cms_core_permissions`       | `{ key: 1 }`               | yes    |
| `cms_core_permissions`       | `{ sourcePluginId: 1 }`    | no     |
| `cms_core_roles`             | `{ code: 1 }`              | yes    |
| `cms_core_role_policy_rules` | `{ roleCode: 1 }`          | no     |
| `cms_core_role_policy_rules` | `{ permissionPattern: 1 }` | no     |

## Security e permission

Regole:

1. Una permission dichiarata da un plugin deve appartenere al suo `pluginId`.
2. Un plugin puo contribuire grant solo per permission che possiede.
3. Un ruolo plugin-owned puo essere modificato solo dal plugin owner o da admin
   con permission core elevata.
4. `deny` prevale su `allow`.
5. Le condizioni vengono valutate dopo il match del pattern.
6. Ogni provisioning produce audit.

## Eventi

| Evento                            | Visibility  | Payload                       |
| --------------------------------- | ----------- | ----------------------------- |
| `core.security.permission.synced` | `audit`     | `{ pluginId, permissionKey }` |
| `core.security.role.updated`      | `audit`     | `{ roleCode, actorId }`       |
| `core.security.policy.matched`    | `protected` | `{ subjectId, permission }`   |

## Errori

| Code                            | HTTP | Quando                     |
| ------------------------------- | ---- | -------------------------- |
| `security_permission_invalid`   | 400  | key non valida             |
| `security_permission_ownership` | 409  | permission non posseduta   |
| `security_role_not_found`       | 404  | ruolo assente              |
| `security_policy_rule_invalid`  | 400  | pattern/condition invalide |
| `security_access_denied`        | 403  | decisione negativa         |

## Lifecycle

Security provisioning avviene dopo il load plugin e prima di marcare il plugin
come operativo per le superfici admin protette.

Se il provisioning fallisce, il plugin entra in `failed` con phase
`security-provisioning`.

## Compatibilita e versioning

Permission key e role code sono contratti persistenti. Rinominare una permission
richiede migrazione esplicita e compatibilita di policy.

## Acceptance criteria

- permission format e ownership sono implementabili
- ruoli, grant e policy hanno schema Mongo e DTO
- API admin security hanno permission e response definite
- provisioning plugin ha lifecycle chiaro
- errori e audit sono definiti

## Out of scope

- SSO enterprise
- ABAC complesso fuori dalle condizioni iniziali
- UI avanzata di role designer

## Gap rispetto al codice attuale

- Il codice ha gia permission parser, policy wildcard e provisioning.
- La phase `security-provisioning` non e ancora esplicitata nel lifecycle type.
- L'audit event bus non e ancora un contratto trasversale.

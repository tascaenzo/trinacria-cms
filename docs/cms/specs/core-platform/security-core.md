# Security core

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-22`

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

### Accesso alle API security

| Endpoint                                | Permission                     | Chi puo fare |
| --------------------------------------- | ------------------------------ | ------------ |
| `GET /v1/security/permissions`          | `core-pack:permissions:read`   | admin bearer |
| `GET /v1/security/roles`                | `core-pack:roles:read`         | admin bearer |
| `POST /v1/security/roles`               | `core-pack:roles:write`        | admin bearer |
| `POST /v1/security/roles/{code}/grants` | `core-pack:roles:write`        | admin bearer |
| `GET /v1/security/policy-rules`         | `core-pack:policy-rules:read`  | admin bearer |
| `POST /v1/security/policy-rules`        | `core-pack:policy-rules:write` | admin bearer |

### Regole

1. Una permission dichiarata da un plugin deve appartenere al suo `pluginId`.
2. Un plugin puo contribuire grant solo per permission che possiede.
3. Un ruolo plugin-owned puo essere modificato solo dal plugin owner o da admin
   con permission core elevata.
4. `deny` prevale su `allow`.
5. Le condizioni vengono valutate dopo il match del pattern.
6. Ogni provisioning produce audit.
7. Il backoffice puo leggere permission, ruoli e policy rules ma non puo creare
   permission per conto di terze parti.
8. Solo admin con permission elevata puo assegnare grant a ruoli non posseduti.
9. Le chiamate plugin-to-core per operazioni sensibili devono essere signed.

### Audit

Ogni operazione su permission, ruolo, grant e policy rule genera audit:

- attore (admin ID o plugin ID)
- risorsa modificata
- azione (create, update, delete)
- esito
- timestamp

Gli audit sono persistiti in `cms_core_audit_events` con retention 90 giorni.

## Eventi

### Eventi di security

| Nome canonico                     | Owner     | Visibility  | Delivery | Payload                               | Quando                  |
| --------------------------------- | --------- | ----------- | -------- | ------------------------------------- | ----------------------- |
| `core.security.permission.synced` | core-pack | `audit`     | `sync`   | `{ pluginId, permissionKey, action }` | provisioning permission |
| `core.security.role.updated`      | core-pack | `audit`     | `sync`   | `{ roleCode, actorId, changes }`      | ruolo modificato        |
| `core.security.policy.matched`    | core-pack | `protected` | `sync`   | `{ subjectId, permission, decision }` | policy valutata         |
| `core.security.grant.created`     | core-pack | `audit`     | `sync`   | `{ roleCode, permissionKeys }`        | grant aggiunto          |
| `core.security.access.denied`     | core-pack | `audit`     | `sync`   | `{ subjectId, permission, reason }`   | accesso negato          |

### Delivery e retry

- Tutti `sync` (in-process).
- Nessun retry automatico: se la pubblicazione fallisce, l'errore e loggato ma non blocca l'operazione.
- Idempotency: non richiesta per eventi di security audit.
- Audit policy: eventi `audit` persistiti in `cms_core_audit_events` con retention 90 giorni. Eventi `protected` non persistiti.

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

- Permission key e role code sono contratti persistenti. Rinominare una permission
  richiede migrazione esplicita e compatibilita di policy.
- Nuove permission possono essere aggiunte senza breaking change.
- Le policy rules con `permissionPattern` usano wildcard supportato. Cambiare la sintassi dei pattern e breaking.
- I DTO (`RoleDto`, `PermissionDto`, `PolicyRuleDto`) possono ricevere nuovi campi opzionali.
- Rimuovere o rinominare un error code e breaking.

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

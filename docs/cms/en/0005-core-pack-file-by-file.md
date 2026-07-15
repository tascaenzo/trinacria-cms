# 0005 - Core-pack file-by-file: users, roles, permissions, settings, embedded model

This chapter documents `packages/core-pack/src` after the advanced authz extension.

## 1. Package map

- `modules/users/`: users
- `modules/roles/`: roles + embedded grants
- `modules/permissions/`: permission catalog
- `modules/security/`: provisioning, user access, authz, policy rules, API keys
- `modules/settings/`: plugin definitions, values, and encrypted secrets

## 2. Security module: key files

- `security-provisioning.service.ts`: manifest security sync
- `security/user-access/user-roles.schemas.ts` / `security/user-access/user-roles.repository.ts` (assignments embedded in `users`)
- `security/role-policy-rules/role-policy-rules.schemas.ts` / `security/role-policy-rules/role-policy-rules.repository.ts`
- `security/user-access/user-access.service.ts`
- `security/user-access/user-access.controller.ts`
- `security/api-keys/api-keys.schemas.ts` / `security/api-keys/api-keys.repository.ts`
- `security/api-keys/api-key-hashing.service.ts`
- `security/api-keys/api-keys.service.ts`
- `security/api-keys/api-keys.controller.ts`
- `core-pack-authz.service.ts`
- `openapi-tags.ts`: centralized OpenAPI tags (`Security` and `Api Keys`)

## 3. New responsibilities

1. manage user-role assignments without join collections (`users.roleAssignments[]`)
2. support role policy rules (`allow`/`deny`, wildcard, conditions)
3. resolve final per-user authz rules
4. expose `CORE_TOKENS.AUTHZ_SERVICE`
5. provide plugin settings management with strong secret isolation
6. issue machine credentials (`api_keys`) reusable from the SDK or standard REST clients

## 4. Current security entities

- `permissions`
- `roles`
- `role_policy_rules`
- `api_keys`

Embedded relations:

- `roles.permissionGrants[]` (replaces `role_grants`)
- `users.roleAssignments[]` (replaces `user_roles`)

## 5. Settings module: key files

- `settings.schemas.ts`: one unified `settings` entity with discriminator `kind` (`definition`, `value`, `secret`) plus indexes.
- `settings.service.ts`: application logic (key ownership, default fallback, secret masking).
- `settings/definitions/settings-definitions.repository.ts`: definition projection over unified collection.
- `settings/values/settings-values.repository.ts`: value projection over unified collection.
- `settings/secrets/settings-secrets.repository.ts`: secret projection over unified collection.
- `settings/secrets/settings-secrets-crypto.service.ts`: AES-256-GCM encryption/decryption.
- `settings/auth/settings-plugin-auth.ts`: request canonicalization + HMAC-SHA256 signing.
- `settings/auth/settings-plugin-auth-key-provider.ts`: `PluginAuthKeyProvider` contract + default env provider.
- `settings/auth/settings-plugin-auth.service.ts`: timestamp/nonce/signature verification with anti-replay.
- `settings/auth/settings-plugin-auth.middleware.ts`: stores authenticated plugin caller in `ctx.state`.
- `settings.controller.ts`: REST API with middleware enforcement on sensitive routes.

## 6. Plugin caller authentication protocol (settings)

Required headers:

- `x-cms-plugin-id`
- `x-cms-plugin-ts`
- `x-cms-plugin-nonce`
- `x-cms-plugin-signature`

Signature model:

1. canonical string with `METHOD`, `PATH`, `timestamp`, `nonce`, `pluginId`, `sha256(body)`;
2. HMAC-SHA256 with plugin shared secret;
3. server validates signature + timestamp skew + nonce uniqueness.

Runtime configuration:

- `CMS_PLUGIN_AUTH_KEYS_JSON`: map `{ pluginId: secret }`
- `CMS_PLUGIN_AUTH_MAX_SKEW_SECONDS`: allowed clock drift (default 300s)
- `PluginAuthKeyProvider`: DI extension point to resolve secrets from Vault/KMS instead of env.

Practical effect:

- plugins cannot impersonate other plugins on protected settings routes;
- secrets can be read only by the owner plugin (strong isolation, not only logical isolation).

## 7. Conclusion

`core-pack` now acts as a full IAM + configuration plugin with advanced authorization, manifest-driven provisioning, and strong secrets isolation through signed plugin caller authentication.

## 8. Module-by-module: exported services and exposed APIs

### 8.1 Auth

Responsibilities:

- local JWT authentication
- current-user resolution
- `httpOnly` cookie issuance

Exported services:

- `CORE_PACK_JWT_AUTH_SERVICE_TOKEN` -> `JwtAuthService`

Exposed APIs:

| Method | Endpoint          | Purpose                                                              | Auth       |
| ------ | ----------------- | -------------------------------------------------------------------- | ---------- |
| `POST` | `/v1/auth/login`  | email/password login, returns access token + refresh token + cookies | public     |
| `GET`  | `/v1/auth/me`     | resolve authenticated user                                           | bearer JWT |
| `POST` | `/v1/auth/logout` | client-side session termination and cookie cleanup                   | bearer JWT |

### 8.2 Installation

Responsibilities:

- first-install bootstrap
- initial admin creation
- installation state persistence
- local password hashing

Exported services:

- `CORE_PACK_INSTALLATION_SERVICE_TOKEN` -> `InstallationService`
- `PASSWORD_HASHING_SERVICE_TOKEN` -> `PasswordHashingService`

Exposed APIs:

| Method | Endpoint                | Purpose                                      | Auth             |
| ------ | ----------------------- | -------------------------------------------- | ---------------- |
| `GET`  | `/v1/install/status`    | CMS installation status                      | public           |
| `POST` | `/v1/install/bootstrap` | create first admin and finalize installation | public, one-shot |

Structural note:

- local credentials live in `local_credentials`, not in the public `users` record;
- this keeps identity/profile concerns separate from login mechanism concerns.

### 8.3 Users

Responsibilities:

- baseline user CRUD
- active/suspended lifecycle

Exported services:

- `USERS_SERVICE_TOKEN` -> capability `users.service`

Exposed APIs:

| Method  | Endpoint               | Purpose                  | Auth      |
| ------- | ---------------------- | ------------------------ | --------- |
| `GET`   | `/v1/users`            | list users               | admin JWT |
| `GET`   | `/v1/users/:id`        | get user detail          | admin JWT |
| `POST`  | `/v1/users`            | create user              | admin JWT |
| `PATCH` | `/v1/users/:id/status` | activate or suspend user | admin JWT |

### 8.4 Permissions

Responsibilities:

- canonical permission catalog
- permission activation/deactivation

Exported services:

- `PERMISSIONS_SERVICE_TOKEN` -> capability `permissions.service`

Exposed APIs:

| Method  | Endpoint                     | Purpose                        | Auth      |
| ------- | ---------------------------- | ------------------------------ | --------- |
| `GET`   | `/v1/permissions`            | list permissions               | admin JWT |
| `GET`   | `/v1/permissions/:id`        | get permission detail          | admin JWT |
| `POST`  | `/v1/permissions`            | create permission              | admin JWT |
| `PATCH` | `/v1/permissions/:id/status` | activate or disable permission | admin JWT |

### 8.5 Roles

Responsibilities:

- role catalog
- embedded permission grants
- active/disabled role lifecycle

Exported services:

- `ROLES_SERVICE_TOKEN` -> capability `roles.service`

Exposed APIs:

| Method  | Endpoint               | Purpose                  | Auth      |
| ------- | ---------------------- | ------------------------ | --------- |
| `GET`   | `/v1/roles`            | list roles               | admin JWT |
| `GET`   | `/v1/roles/:id`        | get role detail          | admin JWT |
| `POST`  | `/v1/roles`            | create role              | admin JWT |
| `PATCH` | `/v1/roles/:id/status` | activate or disable role | admin JWT |

### 8.6 Security

Responsibilities:

- user-role assignment
- effective permission resolution
- policy rule CRUD
- manifest provisioning for security, settings, and i18n
- authorization engine exported to the kernel

Exported services:

- `CORE_PACK_USER_ACCESS_SERVICE_TOKEN` -> `UserAccessService`
- `CORE_PACK_ROLE_POLICY_RULES_SERVICE_TOKEN` -> `RolePolicyRulesService`
- `CORE_PACK_AUTHZ_SERVICE_TOKEN` -> `CorePackAuthzService`
- `API_KEYS_SERVICE_TOKEN` -> `ApiKeysService`
- `CORE_PACK_MANIFEST_PROVISIONING_SERVICE_TOKEN` -> `CorePackManifestProvisioningService`
- `CORE_TOKENS.PLUGIN_MANIFEST_PROVISIONER` -> public lifecycle token
- `CORE_TOKENS.AUTHZ_SERVICE` -> public alias to `CorePackAuthzService`

Exposed APIs:

| Method   | Endpoint                                   | Purpose                            | Auth      |
| -------- | ------------------------------------------ | ---------------------------------- | --------- |
| `GET`    | `/v1/users/:id/roles`                      | list user role assignments         | admin JWT |
| `POST`   | `/v1/users/:id/roles`                      | assign role to user                | admin JWT |
| `DELETE` | `/v1/users/:id/roles/:roleCode`            | remove role from user              | admin JWT |
| `GET`    | `/v1/users/:id/permissions`                | resolve effective user permissions | admin JWT |
| `GET`    | `/v1/roles/:roleCode/policy-rules`         | list role policy rules             | admin JWT |
| `POST`   | `/v1/roles/:roleCode/policy-rules`         | create policy rule                 | admin JWT |
| `PATCH`  | `/v1/roles/:roleCode/policy-rules/:ruleId` | update policy rule                 | admin JWT |
| `DELETE` | `/v1/roles/:roleCode/policy-rules/:ruleId` | delete policy rule                 | admin JWT |
| `GET`    | `/v1/api-keys`                             | list issued API keys               | admin JWT |
| `GET`    | `/v1/api-keys/:id`                         | get API key metadata               | admin JWT |
| `POST`   | `/v1/api-keys`                             | issue a new API key                | admin JWT |
| `POST`   | `/v1/api-keys/:id/rotate`                  | rotate an existing API key         | admin JWT |
| `POST`   | `/v1/api-keys/:id/revoke`                  | revoke an API key                  | admin JWT |

Structural note:

- API keys inherit roles, permission keys, and policy rules;
- `CorePackAuthzService` treats `api-key:<id>` as a first-class machine subject;
- this allows the same authorization engine to serve both JWT users and server-to-server integrations.

### 8.7 Settings

Responsibilities:

- setting definitions
- explicit values and default resolution
- encrypted secrets
- plugin settings snapshot export
- signed plugin-caller authentication

Exported services:

- `SETTINGS_SERVICE_TOKEN` -> capability `settings.service`
- `SETTINGS_PLUGIN_AUTH_SERVICE_TOKEN` -> `SettingsPluginAuthService`
- `SETTINGS_SECRETS_CRYPTO_SERVICE_TOKEN` -> `SettingsSecretsCryptoService`

Exposed APIs:

| Method | Endpoint                           | Purpose                                    | Auth                                |
| ------ | ---------------------------------- | ------------------------------------------ | ----------------------------------- |
| `GET`  | `/v1/settings/definitions`         | list definitions                           | admin bearer or signed plugin auth  |
| `GET`  | `/v1/settings/definitions/:key`    | get definition detail                      | admin bearer or signed plugin auth  |
| `POST` | `/v1/settings/definitions`         | create/update definition                   | signed plugin auth                  |
| `GET`  | `/v1/settings/values/:key`         | resolve explicit value or default          | admin bearer or signed plugin auth  |
| `PUT`  | `/v1/settings/values/:key`         | create/update value                        | signed plugin auth                  |
| `GET`  | `/v1/settings/secrets/:key`        | read masked secret metadata                | admin bearer or signed owner plugin |
| `PUT`  | `/v1/settings/secrets/:key`        | create/update encrypted secret             | signed plugin auth                  |
| `POST` | `/v1/settings/secrets/:key/reveal` | owner-only secret reveal                   | signed plugin auth                  |
| `GET`  | `/v1/settings/export/:pluginId`    | export plugin snapshot with masked secrets | signed plugin auth                  |

Updated operational policy:

- the backoffice may read definitions, resolved values, and masked secret metadata;
- reveal, export, and writes remain owner-scoped through `SettingsPluginAuth`;
- any future write UX must stay plugin-aware and must not turn the backoffice into a bypass over plugin ownership;
- operational reference: `docs/cms/en/0013-settings-security-and-operational-ownership.md`.

Initial `core-pack` bootstrap catalog:

- `core-pack:site:name`
- `core-pack:site:url`
- `core-pack:cms:locale`
- `core-pack:cms:timezone`
- `core-pack:branding:tagline`
- `core-pack:branding:logo_url`
- `core-pack:features:editorial_workflow`

## 9. Core-pack HTTP response style

All business controllers in `core-pack` use `createPluginApiResponder(CORE_PACK_PLUGIN_ID)`.

This produces a uniform envelope:

### 9.1 Success response

```json
{
  "data": {
    "id": "core-pack:users:abc123"
  },
  "meta": {
    "pluginId": "core-pack"
  }
}
```

### 9.2 List response

```json
{
  "data": [{ "id": "1" }, { "id": "2" }],
  "meta": {
    "pluginId": "core-pack",
    "count": 2,
    "limit": 20,
    "offset": 0
  }
}
```

### 9.3 Error response

```json
{
  "error": {
    "code": "not_found",
    "message": "User \"missing\" not found"
  },
  "meta": {
    "pluginId": "core-pack"
  }
}
```

Operational meaning:

- `data`: business payload
- `error.code`: stable machine-facing code for SDK/UI
- `error.message`: human-readable text
- `error.details`: optional structured diagnostics
- `meta.pluginId`: response origin
- `meta.count`: list cardinality
- `meta.limit` / `meta.offset`: pagination echo

How it is generated:

1. controller validates `params`, `query`, and `body`;
2. the service returns a domain value or throws;
3. `responder.success(...)` or `responder.list(...)` builds the success envelope;
4. `responder.fromError(...)` maps the failure into a stable `error.code`;
5. `response(...)` is used only when custom HTTP headers are needed, such as `Set-Cookie` in `auth/login` and `auth/logout`.

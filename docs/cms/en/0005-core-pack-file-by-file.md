# 0005 - Core-pack file-by-file: users, roles, permissions, settings, embedded model

This chapter documents `packages/core-pack/src` after the advanced authz extension.

## 1. Package map

- `modules/users/`: users
- `modules/roles/`: roles + embedded grants
- `modules/permissions/`: permission catalog
- `modules/security/`: provisioning, user access, authz, policy rules
- `modules/settings/`: plugin definitions, values, and encrypted secrets

## 2. Security module: key files

- `security-provisioning.service.ts`: manifest security sync
- `user-roles.schemas.ts` / `user-roles.repository.ts` (assignments embedded in `users`)
- `role-policy-rules.schemas.ts` / `role-policy-rules.repository.ts`
- `user-access.service.ts`
- `user-access.controller.ts`
- `core-pack-authz.service.ts`

## 3. New responsibilities

1. manage user-role assignments without join collections (`users.roleAssignments[]`)
2. support role policy rules (`allow`/`deny`, wildcard, conditions)
3. resolve final per-user authz rules
4. expose `CORE_TOKENS.AUTHZ_SERVICE`
5. provide plugin settings management with strong secret isolation

## 4. Current security entities

- `permissions`
- `roles`
- `role_policy_rules`

Embedded relations:

- `roles.permissionGrants[]` (replaces `role_grants`)
- `users.roleAssignments[]` (replaces `user_roles`)

## 5. Settings module: key files

- `settings.schemas.ts`: 3 entities (`settings_definitions`, `settings_values`, `settings_secrets`) plus indexes.
- `settings.service.ts`: application logic (key ownership, default fallback, secret masking).
- `settings-secrets-crypto.service.ts`: AES-256-GCM encryption/decryption.
- `settings-plugin-auth.ts`: request canonicalization + HMAC-SHA256 signing.
- `settings-plugin-auth-key-provider.ts`: `PluginAuthKeyProvider` contract + default env provider.
- `settings-plugin-auth.service.ts`: timestamp/nonce/signature verification with anti-replay.
- `settings-plugin-auth.middleware.ts`: stores authenticated plugin caller in `ctx.state`.
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

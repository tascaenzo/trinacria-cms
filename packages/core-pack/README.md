# @trinacria-cms/core-pack

Official baseline plugin pack for Trinacria CMS.

`core-pack` is a regular kernel plugin and currently provides:

- users
- roles
- permissions
- plugin security provisioning (`permissions/roles/grants` from plugin manifest)
- advanced authz policies (`allow`/`deny`, wildcard patterns, conditions)
- settings definitions/values/secrets (encrypted secrets + masked export)

## Security model implemented

- `permissions` are plugin-owned (`sourcePluginId`)
- `roles` can be plugin-owned (`ownerPluginId`)
- `roles.permissionGrants[]` stores per-plugin grant contributions (embedded)
- `role_policy_rules` enables wildcard and conditional allow/deny rules
- `users.roleAssignments[]` links users to roles for effective permission resolution (embedded)
- provisioning is lifecycle-driven through `PluginSecurityProvisioner`

## Settings secret isolation

Sensitive settings routes are protected by signed plugin caller authentication.

Required request headers:

- `x-cms-plugin-id`
- `x-cms-plugin-ts` (unix seconds)
- `x-cms-plugin-nonce` (single-use random string)
- `x-cms-plugin-signature` (HMAC-SHA256 over canonical request payload)

Environment variables:

- `CMS_PLUGIN_AUTH_KEYS_JSON`: JSON map `{ "<pluginId>": "<shared-secret>" }`
- `CMS_PLUGIN_AUTH_MAX_SKEW_SECONDS`: allowed timestamp drift (default `300`)
- `CMS_SETTINGS_MASTER_KEY`: master key for AES-256-GCM encryption at rest
- `CMS_SETTINGS_MASTER_KEY_VERSION`: key version persisted with ciphertext metadata

Implementation note:

- key resolution is abstracted behind `PluginAuthKeyProvider`
- default implementation: `EnvPluginAuthKeyProvider`
- you can replace it with Vault/KMS/SecretManager provider via DI token `CORE_PACK_SETTINGS_PLUGIN_AUTH_KEY_PROVIDER`

## Scripts

```bash
npm run dev -w @trinacria-cms/core-pack
npm run build -w @trinacria-cms/core-pack
npm run typecheck -w @trinacria-cms/core-pack
npm run test -w @trinacria-cms/core-pack
```

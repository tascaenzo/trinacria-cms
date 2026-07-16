# @trinacria-cms/core-pack

Official baseline plugin pack for Trinacria CMS.

`core-pack` is a regular kernel plugin and currently provides:

- users
- roles
- permissions
- manifest provisioning (security, settings, and package-local i18n assets)
- advanced authz policies (`allow`/`deny`, wildcard patterns, conditions)
- settings definitions/values/secrets (encrypted secrets + masked export)
- grouped settings APIs for operator-facing forms

`core-pack` should remain the platform baseline. Domain functionality such as
editorial, commerce, media, SEO, booking, or analytics should be implemented as
separate plugins.

## User lifecycle events

`core-pack` emits public, non-sensitive user lifecycle events for plugin
integrations and future workflow automation:

- `core-pack:user-created`
- `core-pack:user-profile-updated`
- `core-pack:user-status-changed`
- `core-pack:user-invited`
- `core-pack:user-invite-accepted`

The payloads contain only identifiers and state metadata. Sensitive links,
tokens, credentials, and personal data must stay out of public events. See
[`../../docs/plugin-user-events-and-email-flows.md`](../../docs/plugin-user-events-and-email-flows.md).

## Security model implemented

- `permissions` are plugin-owned (`sourcePluginId`)
- `roles` can be plugin-owned (`ownerPluginId`)
- `roles.permissionGrants[]` stores per-plugin grant contributions (embedded)
- `role_policy_rules` enables wildcard and conditional allow/deny rules
- `users.roleAssignments[]` links users to roles for effective permission resolution (embedded)
- provisioning is lifecycle-driven through `PluginManifestProvisioner`

## Plugin translations

Plugins declare lightweight i18n namespace metadata in their manifest. The
actual `en.json`, `it.json`, and other source files remain in each plugin
package and are imported during plugin load (or deferred installation).
Every namespace must include an English fallback. Core writes one small record
per message to `i18n_messages`, indexed by plugin, namespace, locale, and key.

Clients can resolve only the needed surface with:

- `GET /v1/i18n/:locale?namespace=<namespace>`
- `GET /v1/i18n/:locale?surface=admin` for all installed Backoffice namespaces

The response merges English first and the requested locale second. This makes
the records suitable for external sites/apps and for translation automation.

Resolved dictionaries are cached for five minutes by locale, namespace, and
surface. Provisioning and uninstall invalidate the `i18n_messages` cache
namespace; configure Redis for cache invalidation shared by multiple app
instances.

Core Pack's complete Backoffice catalog (`en` and `it`) is the canonical
`src/admin-i18n/` source. Its manifest carries only the `admin` descriptor;
the package runtime imports the files into granular records. The Backoffice
reuses the same catalog only before authentication or if the remote registry
is temporarily unavailable.

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

Operator-facing settings should use grouped non-secret endpoints:

- `GET /v1/settings/groups`
- `GET /v1/settings/groups/:groupId`
- `PATCH /v1/settings/groups/:groupId`

Low-level technical definitions such as auth lockout, JWT cookie names, cache
adapter configuration, and encryption policy remain available to the runtime but
are intentionally hidden from the main backoffice settings workspace.

Implementation note:

- key resolution is abstracted behind `PluginAuthKeyProvider`
- default implementation: `EnvPluginAuthKeyProvider`
- you can replace it with Vault/KMS/SecretManager provider via DI token `CORE_PACK_SETTINGS_PLUGIN_AUTH_KEY_PROVIDER`

## Plugin API compatibility

The public helper API for plugin authors now belongs to
`@trinacria-cms/kernel/plugin-api`. `core-pack` still re-exports those helpers
from `@trinacria-cms/core-pack/plugin-api` for compatibility.

Use the kernel package for generic manifest/admin/security/settings helpers. Use
`@trinacria-cms/core-pack/plugin-api` only when you need the core-pack-specific
signed settings request helpers such as `createSignedPluginRequest`.

## Scripts

```bash
npm run dev -w @trinacria-cms/core-pack
npm run build -w @trinacria-cms/core-pack
npm run typecheck -w @trinacria-cms/core-pack
npm run test -w @trinacria-cms/core-pack
```

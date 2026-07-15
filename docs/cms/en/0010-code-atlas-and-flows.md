# 0010 - Code atlas: file -> responsibility -> flow maps

Quick navigation map of the real codebase, updated for plugin-contributed security and the new SDK/browser layer in the monorepo.

## 1. Kernel contracts

- `packages/kernel/src/contracts/plugin-runtime.ts`
  - runtime API, states, runtime lifecycle hooks (`onAfterLoad`, `onBeforeUnregister`)

- `packages/kernel/src/contracts/plugin-manifest.ts`
  - plugin manifest + `security` section (`permissions`, `roles`, `grants`)

- `packages/kernel/src/contracts/plugin-security-provisioner.ts`
  - provisioning contract (`provision`, `deprovision`)

## 2. Kernel runtime

- `runtime/in-memory-plugin-runtime.ts`
  - register/load/unload/reload/disable/unregister
  - state machine, dependency checks, rollback

- `runtime/plugin-manifest-validation.ts`
  - manifest validation and security ownership checks

- `runtime/cms-starter.ts`
  - app bootstrap and runtime hook wiring to `PluginManifestProvisioner`
  - also registers built-in `kernelHealth` and `system` endpoints

- `runtime/permission-key.ts`
  - canonical permission key parser/validator (`<pluginId>:<resource>:<action>`)

- `runtime/kernel-system-service.ts`
  - runtime discovery service used by SDKs, CLIs, and admin UIs
  - exposes installed plugin snapshots and published capability catalogs

## 3. Core-pack plugin

- `plugin/core-pack.manifest.ts`
  - baseline security declaration (`admin` + core-pack grants)

- `modules/core-pack-root.module.ts`
  - composes users + security + settings + i18n

## 4. Core-pack IAM domains

### Users

- `modules/users/*`
  - classic vertical slice

### Permissions

- `modules/permissions/*`
  - ownership via `sourcePluginId`
  - legacy key normalization support

### Roles

- `modules/roles/*`
  - owner metadata (`ownerPluginId`)
  - role permission hydration from embedded grants (`permissionGrants[]`)

### Embedded grants

- `modules/roles/grants/role-grants.schemas.ts`
- `modules/roles/grants/role-grants.repository.ts`

## 5. Manifest provisioning module

- `modules/security/security-provisioning.service.ts`
  - load-time synchronization of security, settings, and i18n bundles
  - unregister-time safe cleanup of manifest-owned resources

- `modules/security/security.module.ts`
  - exports `CORE_TOKENS.PLUGIN_MANIFEST_PROVISIONER`
  - also registers the `api_keys` domain and machine-subject authorization support

- `modules/security/api-keys/*`
  - issuance, rotation, revocation, hashing, and authz-rule resolution for API keys

## 6. Mongo infrastructure

- `core-pack-mongo.module.ts`
  - mongoose lifecycle + registry/adapter providers

- `mongo-db-adapter.ts`
  - CRUD, canonical IDs, health checks, index translation, update compatibility

## 7. Flow: plugin load with manifest provisioning

1. `cms-starter.ts` builds runtime with lifecycle hooks
2. `in-memory-plugin-runtime.ts#loadInternal`
3. plugin modules are registered
4. runtime `onAfterLoad` hook runs
5. `PluginManifestProvisioner` is resolved
6. `provision(manifest)` syncs security, settings, and i18n resources

## 8. Flow: plugin unregister

1. `runtime.unregister(pluginId)`
2. runtime `onBeforeUnregister` hook
3. `deprovision(manifest)`
4. owned security/settings/i18n contributions are removed or disabled
5. runtime plugin record is deleted

## 9. Flow: `GET /v1/roles`

1. `roles.controller.ts#listRoles`
2. `roles.service.ts#listRoles`
3. `roles.repository.ts#list`
4. `roles/grants/role-grants.repository.ts#listByRoleCodes` (reads embedded `roles.permissionGrants[]`)
5. service merges `permissions[]`
6. standardized API envelope

## 10. Flow: `GET /health`

1. `kernel-health.controller.ts`
2. `kernel-health-service.ts#snapshot`
3. runtime + dependency graph + DB health aggregation
4. final status (`ok/degraded/down`)

## 11. Flow: `GET /v1/system/plugins`

1. `kernel-system.controller.ts#listInstalledPlugins`
2. `kernel-system-service.ts#listInstalledPlugins`
3. snapshot is read from `PluginRuntime.list()`
4. response is serialized as the standard `data[] + meta.pluginId = "kernel"` envelope

## 12. Flow: API key -> runtime authz

1. an external integration sends `x-api-key`
2. the auth/authz layer resolves the machine subject
3. `api-keys.service.ts#authenticate` validates format, hash, and key status
4. `core-pack-authz.service.ts` delegates to `ApiKeysService`
5. role assignments, permission keys, and policy rules attached to the key are merged

## 13. Monorepo SDK and published SDK

- `packages/sdk/src/runtime/*`
  - zero-dependency low-level client
  - abstract transport (`fetch` or custom transport)
  - shared error model
  - support for both `Authorization: Bearer` and `x-api-key`

- `packages/sdk/src/generated/*`
  - OpenAPI-generated files per tag
  - grouped APIs: `auth`, `installation`, `users`, `roles`, `permissions`, `settings`, `security`, `apiKeys`, `kernelHealth`, `system`

- `packages/sdk/src/official/*`
  - static catalog shipped by the published package
  - describes which official plugins and API groups are always available without local regeneration

- `packages/sdk/scripts/snapshot-openapi.mjs`
  - downloads `/openapi.json`
  - applies a small normalization layer for query parameters not emitted yet by the current HTTP generator

- `packages/sdk/scripts/generate-sdk.mjs`
  - emits request/response types
  - emits separated API files per domain

Operational model:

1. `@trinacria-cms/sdk` is the publishable base package, usable even outside the monorepo
2. in a monorepo, the OpenAPI-derived layer can be regenerated for custom plugins or custom application modules
3. the generated result is an overlay on top of the official runtime package, not a replacement for it

## 14. Backoffice host app

- `apps/backoffice/src/main.tsx`
  - imports `@trinacria-cms/admin-kernel`
  - imports `@trinacria-cms/trinacria-ui/theme.css`
  - mounts the shared backoffice runtime

- `apps/backoffice/src/backoffice.init.ts`
  - defines mount-time API base URL
  - registers monorepo-local backoffice modules

- `apps/backoffice/src/custom-backoffice-modules.ts`
  - local extension point for plugin admin modules
  - keeps the host app thin while `admin-kernel` owns shell/runtime behavior

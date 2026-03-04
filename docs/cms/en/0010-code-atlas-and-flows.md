# 0010 - Code atlas: file -> responsibility -> flow maps

Quick navigation map of the real codebase, updated for plugin-contributed security.

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
  - app bootstrap and runtime hook wiring to `PluginSecurityProvisioner`

- `runtime/permission-key.ts`
  - canonical permission key parser/validator (`<pluginId>:<resource>:<action>`)

## 3. Core-pack plugin

- `plugin/core-pack.manifest.ts`
  - baseline security declaration (`admin` + core-pack grants)

- `modules/core-pack-root.module.ts`
  - composes users + security + settings

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

- `modules/roles/role-grants.schemas.ts`
- `modules/roles/role-grants.repository.ts`

## 5. Security provisioning module

- `modules/security/security-provisioning.service.ts`
  - load-time delta sync
  - unregister-time safe cleanup

- `modules/security/security.module.ts`
  - exports `CORE_TOKENS.PLUGIN_SECURITY_PROVISIONER`

## 6. Mongo infrastructure

- `core-pack-mongo.module.ts`
  - mongoose lifecycle + registry/adapter providers

- `mongo-db-adapter.ts`
  - CRUD, canonical IDs, health checks, index translation, update compatibility

## 7. Flow: plugin load with security

1. `cms-starter.ts` builds runtime with lifecycle hooks
2. `in-memory-plugin-runtime.ts#loadInternal`
3. plugin modules are registered
4. runtime `onAfterLoad` hook runs
5. `PluginSecurityProvisioner` is resolved
6. `provision(manifest)` syncs `permissions/roles` + embedded grants

## 8. Flow: plugin unregister

1. `runtime.unregister(pluginId)`
2. runtime `onBeforeUnregister` hook
3. `deprovision(manifest)`
4. owned contributions are removed/disabled
5. runtime plugin record is deleted

## 9. Flow: `GET /v1/roles`

1. `roles.controller.ts#listRoles`
2. `roles.service.ts#listRoles`
3. `roles.repository.ts#list`
4. `role-grants.repository.ts#listByRoleCodes` (reads embedded `roles.permissionGrants[]`)
5. service merges `permissions[]`
6. standardized API envelope

## 10. Flow: `GET /health`

1. `kernel-health.controller.ts`
2. `kernel-health-service.ts#snapshot`
3. runtime + dependency graph + DB health aggregation
4. final status (`ok/degraded/down`)

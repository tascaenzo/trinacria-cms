# 0010 - Atlante codice: mappe file -> responsabilita -> flussi

Mappa rapida del codice reale, aggiornata al modello security plugin-contributed.

## 1. Kernel contracts

- `packages/kernel/src/contracts/plugin-runtime.ts`
  - API runtime, stati plugin, hook lifecycle runtime (`onAfterLoad`, `onBeforeUnregister`).

- `packages/kernel/src/contracts/plugin-manifest.ts`
  - manifesto plugin + sezione `security` (`permissions`, `roles`, `grants`).

- `packages/kernel/src/contracts/plugin-security-provisioner.ts`
  - contratto provisioning (`provision`, `deprovision`).

## 2. Kernel runtime

- `runtime/in-memory-plugin-runtime.ts`
  - register/load/unload/reload/disable/unregister
  - state machine + dependency graph + rollback

- `runtime/plugin-manifest-validation.ts`
  - valida shape manifest e ownership security key

- `runtime/cms-starter.ts`
  - bootstrap app
  - hook runtime -> `PluginSecurityProvisioner`

- `runtime/permission-key.ts`
  - parser/validator key canonica `<pluginId>:<resource>:<action>`

## 3. Core-pack plugin

- `plugin/core-pack.manifest.ts`
  - dichiara security base del CMS (`admin` + grants core-pack)

- `modules/core-pack-root.module.ts`
  - compone users + security + settings

## 4. Core-pack domini IAM

### Users

- `modules/users/*`
  - vertical slice classico (schema/dto/repo/service/controller/module)

### Permissions

- `modules/permissions/*`
  - ownership su `sourcePluginId`
  - supporto normalizzazione key legacy

### Roles

- `modules/roles/*`
  - metadata owner (`ownerPluginId`)
  - idratazione permessi ruolo via grants embedded (`permissionGrants[]`)

### Grants embedded

- `modules/roles/grants/role-grants.schemas.ts`
- `modules/roles/grants/role-grants.repository.ts`

## 5. Security provisioning module

- `modules/security/security-provisioning.service.ts`
  - sync delta su load
  - cleanup sicuro su unregister

- `modules/security/security.module.ts`
  - espone `CORE_TOKENS.PLUGIN_SECURITY_PROVISIONER`

## 6. Infrastruttura Mongo

- `core-pack-mongo.module.ts`
  - connessione mongoose + provider registry/adapter

- `mongo-db-adapter.ts`
  - CRUD, canonical id, health, indici, compatibilita update shape

## 7. Flusso: load plugin con security

1. `cms-starter.ts` crea runtime con lifecycle hooks
2. `in-memory-plugin-runtime.ts#loadInternal`
3. moduli plugin registrati
4. hook runtime `onAfterLoad`
5. resolve `PluginSecurityProvisioner`
6. `provision(manifest)` -> sync `permissions/roles` + grants embedded

## 8. Flusso: unregister plugin

1. `runtime.unregister(pluginId)`
2. hook `onBeforeUnregister`
3. `deprovision(manifest)`
4. rimozione contributi owned
5. cancellazione record runtime plugin

## 9. Flusso: `GET /v1/roles`

1. `roles.controller.ts#listRoles`
2. `roles.service.ts#listRoles`
3. `roles.repository.ts#list`
4. `roles/grants/role-grants.repository.ts#listByRoleCodes` (sorgente embedded da `roles.permissionGrants[]`)
5. merge `permissions[]` per ruolo
6. envelope API con `meta.pluginId`

## 10. Flusso: `GET /health`

1. `kernel-health.controller.ts`
2. `kernel-health-service.ts#snapshot`
3. runtime + dependency graph + db health
4. stato finale (`ok/degraded/down`)

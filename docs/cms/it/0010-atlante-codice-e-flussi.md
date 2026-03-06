# 0010 - Atlante codice: mappe file -> responsabilita -> flussi

Mappa rapida del codice reale, aggiornata al modello security plugin-contributed e al nuovo layer SDK/browser del monorepo.

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
  - registra anche gli endpoint built-in `kernelHealth` e `system`

- `runtime/permission-key.ts`
  - parser/validator key canonica `<pluginId>:<resource>:<action>`

- `runtime/kernel-system-service.ts`
  - discovery runtime per SDK, CLI e pannelli admin
  - espone lista plugin installati e catalogo capability pubblicate

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
  - registra anche il dominio `api_keys` e l'engine authz per subject macchina

- `modules/security/api-keys/*`
  - issuance, rotate, revoke, hashing e risoluzione regole authz per API key

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

## 11. Flusso: `GET /v1/system/plugins`

1. `kernel-system.controller.ts#listInstalledPlugins`
2. `kernel-system-service.ts#listInstalledPlugins`
3. lettura snapshot da `PluginRuntime.list()`
4. serializzazione risposta standard `data[] + meta.pluginId = "kernel"`

## 12. Flusso: API key -> authz runtime

1. integrazione esterna invia `x-api-key`
2. layer auth/authz risolve il subject macchina
3. `api-keys.service.ts#authenticate` valida formato, hash e stato
4. `core-pack-authz.service.ts` delega ad `ApiKeysService`
5. vengono composte role assignments, permission keys e policy rules della chiave

## 13. SDK monorepo e SDK pubblicato

- `packages/sdk/src/runtime/*`
  - client low-level zero-deps
  - transport astratto (`fetch` nativa o custom transport)
  - error model comune
  - supporto `Authorization: Bearer` e `x-api-key`

- `packages/sdk/src/generated/*`
  - file generati da OpenAPI per tag
  - gruppi operativi: `auth`, `installation`, `users`, `roles`, `permissions`, `settings`, `security`, `apiKeys`, `kernelHealth`, `system`

- `packages/sdk/src/official/*`
  - catalogo statico del package pubblicato
  - descrive quali plugin ufficiali e gruppi API sono sempre presenti senza rigenerazione locale

- `packages/sdk/scripts/snapshot-openapi.mjs`
  - scarica `/openapi.json`
  - applica una normalizzazione minima per i query parameters non ancora emessi dal generatore HTTP

- `packages/sdk/scripts/generate-sdk.mjs`
  - produce tipi request/response
  - produce file API separati per dominio

Modello operativo:

1. `@trinacria-cms/sdk` e il package base pubblicabile, utilizzabile anche fuori monorepo
2. nel monorepo si puo rigenerare il layer OpenAPI per plugin custom o moduli applicativi custom
3. il risultato e un overlay generato sopra il runtime ufficiale, non una sostituzione del package base

## 14. Browser demo app

- `apps/web/src/server.ts`
  - static server locale
  - proxy `/cms/*` verso backend
  - bridge `/sdk/*` verso `packages/sdk/dist`

- `apps/web/public/app.js`
  - crea `createCmsSdkClient({ baseUrl: "/cms", credentials: "include" })`
  - esercita login, `me`, list users, health

- `apps/web/public/index.html`
  - import map ESM
  - interfaccia minima per validare il client senza framework frontend

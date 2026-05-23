# Namespace governance e alias

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-22`

## Decisione

Il kernel governa namespace, alias e collisioni.

Un plugin non puo introdurre identificatori globali ambigui. Prima di essere
caricato, il manifest e le contribution devono passare una validazione di
namespace. Il kernel centralizza reserved names, ownership rules e collision
detection per tutti i tipi di contribution: entity, settings, eventi, admin
route, permission, capability, alias e resource ID.

## Responsabilita

| Area                  | Owner                      | Responsabilita                              |
| --------------------- | -------------------------- | ------------------------------------------- |
| Namespace contracts   | `@trinacria-cms/kernel`    | Validazione, collision detection, ownership |
| Reserved names        | `@trinacria-cms/kernel`    | Catalogo reserved centralizzato             |
| Plugin ID validation  | `@trinacria-cms/kernel`    | Formato, unicita, reserved check            |
| Alias resolution      | `@trinacria-cms/kernel`    | Registro alias, conflict resolution         |
| Contribution indexing | `@trinacria-cms/kernel`    | Contribution dedup e collision check        |
| Security namespace    | `@trinacria-cms/core-pack` | Permission key ownership convalida          |

## Modello dati

### NamespaceValidationResult

```ts
export interface NamespaceValidationResult {
  valid: boolean;
  errors: readonly NamespaceError[];
  warnings: readonly NamespaceWarning[];
}

export interface NamespaceError {
  type: NamespaceErrorType;
  pluginId: string;
  resource: string;
  value: string;
  collisionWith?: string;
}

export interface NamespaceWarning {
  type: NamespaceWarningType;
  pluginId: string;
  resource: string;
  value: string;
  message: string;
}

export type NamespaceErrorType =
  | "reserved_plugin_id"
  | "duplicate_plugin_id"
  | "invalid_plugin_id_format"
  | "entity_collision"
  | "permission_collision"
  | "permission_ownership_mismatch"
  | "event_collision"
  | "admin_route_collision"
  | "admin_resource_id_collision"
  | "setting_key_collision"
  | "alias_collision"
  | "reserved_namespace"
  | "self_dependency";

export type NamespaceWarningType =
  | "navigation_label_duplicate"
  | "alias_conflict_resolved"
  | "optional_entity_deprecation";
```

### NamespaceValidator

```ts
export interface NamespaceValidator {
  validatePluginId(id: string): NamespaceValidationResult;
  validateManifest(manifest: PluginManifest): NamespaceValidationResult;
  registerPlugin(manifest: PluginManifest): NamespaceValidationResult;
  unregisterPlugin(pluginId: string): void;
  isReserved(id: string): boolean;
  getCollisionSnapshot(): ContributionIndex;
}

export interface ContributionIndex {
  plugins: readonly string[];
  entities: Map<string, string>; // entityName -> pluginId
  permissions: Map<string, string>; // permissionKey -> pluginId
  routes: Map<string, string>; // adminPath -> pluginId
  resourceIds: Map<string, string>; // resourceId -> pluginId
  eventNames: Map<string, string>; // eventName -> pluginId
  settingCanonicalKeys: Map<string, string>;
}
```

### CollisionPolicy

```ts
export interface CollisionPolicy {
  onEntityCollision: "error" | "warning";
  onPermissionCollision: "error";
  onEventCollision: "error";
  onAdminRouteCollision: "error";
  onResourceIdCollision: "error";
  onSettingKeyCollision: "error";
  onAliasCollision: "warning" | "error";
  onNavigationLabelDuplicate: "warning";
}
```

## Contratti TypeScript target

Package owner: `@trinacria-cms/kernel`

### NamespaceValidator

```ts
export interface NamespaceValidator {
  validatePluginId(id: string): NamespaceValidationResult;
  validateManifest(manifest: PluginManifest): NamespaceValidationResult;
  registerPlugin(manifest: PluginManifest): NamespaceValidationResult;
  unregisterPlugin(pluginId: string): void;
  isReserved(id: string): boolean;
  getCollisionSnapshot(): ContributionIndex;
}

export interface NamespaceValidationResult {
  valid: boolean;
  errors: readonly string[];
  warnings: readonly string[];
}
```

`validateManifest()` e side-effect free: puo essere usato per dry-run e non
modifica il registry. Solo `registerPlugin(manifest)` committa le contribution
nel `ContributionIndex`, e lo fa solo se la validazione passa.

### PluginNamespace

```ts
export interface PluginNamespace {
  id: string;
  pluginId: string;
  alias?: string;
  createdAt: Date;
}
```

## API HTTP target

Le API di namespace sono interne al kernel, non esposte come endpoint pubblici.
La validazione avviene durante il lifecycle di registrazione del plugin.

Eccezione: il sistema puo esporre in sola lettura il catalogo contribution via
`GET /v1/system/plugin-contributions` (gia implementata).

## Storage Mongo

Il kernel non persiste namespace in una collezione separata: il namespace e
derivato dal manifest dei plugin attivi e dal `cms_kernel_plugin_runtime`.

Riservato a futura estensione: se sara necessario un alias registry persistente,
la collezione target sara:

| Collection                  | Unique index   | Owner  |
| --------------------------- | -------------- | ------ |
| `cms_kernel_plugin_aliases` | `{ alias: 1 }` | kernel |

## Security e permission

- La validazione namespace non richiede auth perche avviene internamente al
  runtime.
- La registrazione alias e operazione protetta dal ruolo admin (stessa guard
  di `plugins.read`).
- Un plugin non puo registrare alias che collide con reserved names o alias
  attivi.

## Errori

| Code                            | HTTP | Quando                                  |
| ------------------------------- | ---- | --------------------------------------- |
| `namespace_reserved_id`         | 409  | plugin ID riservato                     |
| `namespace_invalid_format`      | 400  | formato plugin ID non valido            |
| `namespace_duplicate_id`        | 409  | plugin ID gia registrato                |
| `namespace_entity_collision`    | 409  | entity name in conflitto                |
| `namespace_permission_mismatch` | 409  | permission key non appartiene all'owner |
| `namespace_route_collision`     | 409  | admin route gia registrata              |
| `namespace_alias_collision`     | 409  | alias gia in uso                        |

## Lifecycle

1. Il runtime riceve un `KernelPluginDefinition` con manifest.
2. `NamespaceValidator.validateManifest()` esegue:
   - validazione formato plugin ID
   - check reserved names
   - check unicita plugin ID
   - check ownership permission
   - check collisioni entity, eventi, route, resource ID, settings
   - check alias collisioni
3. Se la validazione fallisce con errori bloccanti, il load viene rifiutato.
4. Se passano solo warning, il load procede con log diagnostico.
5. Alla registrazione runtime riuscita, il namespace viene registrato con
   `NamespaceValidator.registerPlugin(manifest)`.
6. All'unload o disable, il namespace viene rilasciato.

## Compatibilita e versioning

- I reserved names possono essere estesi dal core tramite configurazione di
  piattaforma senza breaking change.
- Un plugin non puo cambiare plugin ID dopo l'installazione.
- I namespace gia persistiti in Mongo non vengono rinominati automaticamente.
  Se un plugin cambia nome entity, serve migrazione esplicita.

## Acceptance criteria

- Il `NamespaceValidator` rifiuta plugin con ID riservati o formato invalido.
- La collision detection copre: plugin ID, entity, permission, eventi, admin
  route, resource ID, settings key e alias.
- Permission key con ownership mismatch sono errori bloccanti.
- Le collisioni non bloccanti (label navigation duplicate) producono warning.
- Il registry rilascia namespace su unload/disable del plugin.
- Reserved names sono configurabili via catalogo centralizzato.

## Out of scope

- marketplace remoto con namespace globale
- risoluzione automatica complessa tra plugin terzi
- rename/migration automatica di namespace gia persistiti
- alias con wildcard o pattern matching avanzato

## Gap rispetto al codice attuale

- `plugin-namespace.ts` in kernel implementa gia validazione base plugin ID,
  reserved names, namespace building/parsing e collision detection parziale.
- `NamespaceValidator` e `ContributionIndex` sono esposti dal package kernel.
- La collision detection e ancora distribuita tra validazione locale del manifest
  (`plugin-manifest-validation.ts`) e collision detection cross-plugin
  (`plugin-namespace.ts`).
- La policy di collisione non e ancora configurabile per ambiente.

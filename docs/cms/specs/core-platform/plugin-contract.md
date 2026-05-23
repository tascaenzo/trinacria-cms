# Plugin contract

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-22`

## Decisione

Un plugin CMS e un package installabile che dichiara manifest, moduli runtime,
capability, security, entity Mongo, settings, eventi e contribution admin.

Il contratto plugin vive nel `kernel`. `core-pack` deve rispettarlo come plugin
ufficiale baseline. I plugin dominio useranno lo stesso contratto.

Il manifest e la fonte dichiarativa. Il runtime definition collega il manifest a
moduli Trinacria, hook e contribution operative.

Decisione chiusa: `entities`, `settings`, `events` e `admin` entrano nel manifest
backend come dichiarazioni canoniche. I registry runtime possono materializzarle
e indicizzarle, ma non diventano fonti di verita parallele.

## Responsabilita

| Area             | Owner                      | Responsabilita                                  |
| ---------------- | -------------------------- | ----------------------------------------------- |
| Manifest schema  | `@trinacria-cms/kernel`    | Validazione struttura, naming, compatibilita    |
| Runtime loading  | `@trinacria-cms/kernel`    | Register/load/unload/reload/disable/enable      |
| Security sync    | `@trinacria-cms/core-pack` | Provisioning permission, role, grant, policy    |
| Mongo storage    | `@trinacria-cms/kernel`    | Namespace, entity registry, repository contract |
| Settings/secrets | `@trinacria-cms/core-pack` | Registry, ownership, encryption, signed access  |
| Admin UI         | `packages/admin-kernel`    | Route/resource/widget mounting                  |
| UI components    | `packages/trinacria-ui`    | Componenti visuali riusabili                    |

## Package shape

Forma target minima:

```text
plugin-package/
  package.json
  src/
    index.ts
    plugin.ts
    manifest.ts
    security.ts
    entities/
    repositories/
    settings/
    events/
    admin/
```

Export pubblico richiesto:

```ts
export { plugin } from "./plugin";
export { manifest } from "./manifest";
```

## Manifest target

Package owner: `@trinacria-cms/kernel`

```ts
export interface CmsPluginManifest {
  id: string;
  version: string;
  requiresCore: string;
  displayName?: string;
  description?: string;
  capabilities?: readonly string[];
  dependencies?: readonly PluginDependency[];
  security?: PluginSecurityDeclaration;
  entities?: readonly PluginEntityDeclaration[];
  settings?: readonly PluginSettingDeclaration[];
  events?: PluginEventDeclarationBlock;
  admin?: PluginAdminDeclaration;
}
```

### Campi

| Campo          | Richiesto | Regola                                                          |
| -------------- | --------- | --------------------------------------------------------------- |
| `id`           | si        | lowercase, unico, no segmenti vuoti, no reserved namespace      |
| `version`      | si        | semver                                                          |
| `requiresCore` | si        | semver range supportato dal kernel                              |
| `displayName`  | no        | stringa leggibile, max 120 caratteri                            |
| `description`  | no        | max 500 caratteri                                               |
| `capabilities` | no        | array unico, formato `<area>.<action>`                          |
| `dependencies` | no        | plugin richiesti/opzionali                                      |
| `security`     | no        | permission, role, grant, policy dichiarate dal plugin           |
| `entities`     | no        | entity Mongo possedute dal plugin                               |
| `settings`     | no        | definition per configuration registry                           |
| `events`       | no        | eventi emessi e sottoscritti                                    |
| `admin`        | no        | navigation, route, resource, dashboard widget, settings section |

## Naming rules

### Plugin ID

Formato:

```text
^[a-z0-9][a-z0-9-._/]*$
```

Regole:

- viene normalizzato lowercase
- non puo contenere `//`
- non puo usare reserved namespace
- e immutabile dopo installazione

Reserved namespace:

```text
core
kernel
system
admin
trinacria
core-pack
```

### Capability

Formato:

```text
<area>.<action>
```

Esempi:

```text
settings.read
settings.write
plugins.operate
```

Le capability dichiarano cosa un plugin sa fare. Non sono da sole autorizzazioni
utente: diventano utili quando collegate a permission, route, policy o admin
visibility.

### Permission

Formato canonico:

```text
<pluginId>:<resource>:<action>
```

Esempi:

```text
core-pack:users:read
core-pack:settings:reveal
commerce:orders:write
```

Una permission dichiarata da un plugin deve appartenere al suo `pluginId`.

## Dependency declaration

```ts
export interface PluginDependency {
  pluginId: string;
  versionRange: string;
  optional?: boolean;
}
```

Regole:

- un plugin non puo dipendere da se stesso
- dipendenze richieste mancanti bloccano il load
- dipendenze opzionali mancanti producono warning
- version mismatch su dipendenza richiesta blocca il load
- il runtime carica i plugin in ordine topologico
- cicli di dipendenza sono errori bloccanti

## Security declaration

```ts
export interface PluginSecurityDeclaration {
  permissions?: readonly PluginPermissionDeclaration[];
  roles?: readonly PluginRoleDeclaration[];
  grants?: readonly PluginGrantDeclaration[];
  policyRules?: readonly PluginPolicyRuleDeclaration[];
}

export interface PluginPermissionDeclaration {
  key: string;
  displayName: string;
  description?: string;
}

export interface PluginRoleDeclaration {
  code: string;
  name: string;
  description?: string;
}

export interface PluginGrantDeclaration {
  roleCode: string;
  permissionKeys: readonly string[];
}

export interface PluginPolicyRuleDeclaration {
  roleCode: string;
  effect: "allow" | "deny";
  permissionPattern: string;
  conditions?: readonly PluginPolicyCondition[];
}

export type PluginPolicyCondition = "resource_id_required" | "resource_id_equals_subject";
```

Provisioning:

1. Il kernel valida manifest e ownership.
2. Il runtime carica il plugin.
3. Un lifecycle hook di piattaforma invoca il security provisioner.
4. `core-pack` sincronizza permission, ruoli, grant e policy.
5. Ogni provisioning produce audit.

## Entity declaration

```ts
export interface PluginEntityDeclaration {
  name: string;
  collection?: string;
  displayName?: string;
  schemaVersion: number;
  documentSchema: unknown;
  indexes?: readonly PluginEntityIndexDeclaration[];
  repository?: {
    token?: string;
    mode: "standard" | "custom";
  };
}

export interface PluginEntityIndexDeclaration {
  name: string;
  keys: Record<string, 1 | -1 | "text">;
  unique?: boolean;
  sparse?: boolean;
  partialFilter?: Record<string, unknown>;
}
```

Namespace fisico consigliato:

```text
cms_<pluginId>_<entityName>
```

Regole:

- `name` e unico dentro il plugin
- `collection` e opzionale, ma deve restare dentro namespace plugin
- ogni documento deve avere canonical ID distinto da Mongo `_id`
- ogni entity dichiara `schemaVersion`
- gli indici vengono materializzati dal Mongo storage core
- query dominio stanno nel repository del plugin, non nel kernel

## Settings declaration

```ts
export interface PluginSettingDeclaration {
  namespace: string;
  key: string;
  type: "string" | "number" | "boolean" | "json" | "secret";
  visibility: "public" | "protected" | "secret";
  required?: boolean;
  defaultValue?: unknown;
  schema?: unknown;
  description?: string;
}
```

Regole:

- canonical key: `<pluginId>.<namespace>.<key>`
- `secret` implica encryption at rest
- `secret` non puo avere `public` visibility
- reveal richiede owner o policy esplicita
- il backoffice puo mostrare metadata e valore mascherato
- scritture sensibili plugin-to-core devono essere signed

## Event declaration

```ts
export interface PluginEventDeclarationBlock {
  emits?: readonly PluginEventDeclaration[];
  subscribes?: readonly PluginEventSubscriptionDeclaration[];
}

export interface PluginEventDeclaration {
  name: string;
  visibility: "public" | "protected" | "private" | "audit";
  version: number;
  payloadSchema?: unknown;
  delivery?: "sync" | "async" | "deferred";
}

export interface PluginEventSubscriptionDeclaration {
  eventName: string;
  handler: string;
  requiredPermission?: string;
}
```

Regole:

- eventi pubblici/protetti devono essere namespaced
- eventi privati non sono contratto pubblico
- eventi protected richiedono capability/policy
- handler failure produce diagnostics
- delivery persistente e broker esterno sono fuori scope iniziale

## Admin declaration

```ts
export interface PluginAdminDeclaration {
  navigation?: readonly AdminNavigationDeclaration[];
  routes?: readonly AdminRouteDeclaration[];
  resources?: readonly AdminResourceDeclaration[];
  widgets?: readonly AdminWidgetDeclaration[];
  settingsSections?: readonly AdminSettingsSectionDeclaration[];
}
```

Regole:

- ogni contribution ha `id`, `ownerPluginId`, `label`, `requiredPermission`
- route assolute duplicate sono collisioni bloccanti
- resource ID duplicati sono collisioni bloccanti
- label duplicate non sono bloccanti
- admin-kernel monta contribution solo se capability/permission sono soddisfatte
- UI custom resta nel plugin o in un package admin del plugin

## Runtime definition

```ts
export interface CmsPluginDefinition {
  manifest: CmsPluginManifest;
  modules?: readonly ModuleDefinition[];
  hooks?: CmsPluginHooks;
}

export interface CmsPluginHooks {
  onLoad?(context: CmsPluginRuntimeContext): Promise<void> | void;
  onInit?(context: CmsPluginRuntimeContext): Promise<void> | void;
  onUnload?(context: CmsPluginRuntimeContext): Promise<void> | void;
}

export interface CmsPluginRuntimeContext {
  app: ApplicationContext;
  pluginId: string;
  manifest: CmsPluginManifest;
}
```

## Runtime lifecycle

```text
registered -> loading -> initializing -> loaded
loaded -> unloading -> unloaded
loaded -> unloading -> loading -> initializing -> loaded
registered|unloaded -> disabled
disabled -> registered
any load failure -> failed
```

Hook order:

1. manifest validation
2. dependency check
3. namespace/collision validation
4. module registration
5. `onLoad`
6. `onInit`
7. platform `onAfterLoad`
8. mark loaded

Rollback:

- se `onLoad` fallisce, unregister dei moduli gia registrati
- se `onInit` fallisce, eseguire `onUnload` best effort
- failure salva phase, error code, details e runtime event

## API HTTP target

Le API operative plugin sono core API.

### List plugin

```http
GET /v1/system/plugins
Authorization: Bearer <admin-token>
```

Permission:

```text
core-pack:plugins:read
```

Response:

```ts
type ListPluginsResponse = ApiSuccessResponse<PluginRuntimeDto[]>;
```

### Get plugin

```http
GET /v1/system/plugins/{pluginId}
Authorization: Bearer <admin-token>
```

Permission:

```text
core-pack:plugins:read
```

### Operate plugin

```http
POST /v1/system/plugins/{pluginId}/operations
Authorization: Bearer <admin-token>
Content-Type: application/json
```

Permission:

```text
core-pack:plugins:operate
```

Request:

```ts
export interface PluginOperationRequestDto {
  operation: "load" | "unload" | "reload" | "disable" | "enable";
  reason?: string;
}
```

Response:

```ts
type PluginOperationResponse = ApiSuccessResponse<PluginRuntimeDto>;
```

### Get plugin events

```http
GET /v1/system/plugins/{pluginId}/events?limit=50
Authorization: Bearer <admin-token>
```

Permission:

```text
core-pack:plugins:read
```

## DTO target

```ts
export interface PluginRuntimeDto {
  id: string;
  version: string;
  state: PluginState;
  loadedAt?: string;
  failedAt?: string;
  failureCount?: number;
  lastFailurePhase?: PluginLifecyclePhase;
  disabledAt?: string;
  disabledReason?: string;
  statusReason?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  capabilities: string[];
  dependencies: PluginDependencyDto[];
  availableOperations: PluginOperationAvailabilityDto[];
}

export interface PluginDependencyDto {
  pluginId: string;
  versionRange: string;
  optional: boolean;
  status: "ok" | "missing" | "disabled" | "version-mismatch";
  currentVersion?: string;
}

export interface PluginOperationAvailabilityDto {
  operation: "load" | "unload" | "reload" | "disable" | "enable";
  available: boolean;
  reason?: string;
}
```

All responses must use `ApiSuccessResponse` or `ApiErrorResponse`.

## Mongo storage

Runtime state persistence collection:

```text
cms_kernel_plugin_runtime
```

Document:

```ts
export interface PluginRuntimeStoreDocument {
  pluginId: string;
  version: string;
  state: PluginState;
  manifest: CmsPluginManifest;
  statusReason?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  loadedAt?: Date;
  failedAt?: Date;
  failureCount: number;
  lastFailurePhase?: PluginLifecyclePhase;
  disabledAt?: Date;
  disabledReason?: string;
  updatedAt: Date;
}
```

Indexes:

| Name               | Keys                | Unique |
| ------------------ | ------------------- | ------ |
| `plugin_id_unique` | `{ pluginId: 1 }`   | yes    |
| `state_lookup`     | `{ state: 1 }`      | no     |
| `updated_lookup`   | `{ updatedAt: -1 }` | no     |

## Security e permission

### Accesso alle API plugin

| Operazione | Permission                      | Chi puo fare         |
| ---------- | ------------------------------- | -------------------- |
| List/read  | `core-pack:plugins:read`        | admin bearer         |
| Operate    | `core-pack:plugins:operate`     | admin bearer         |

### Regole

1. Un plugin non puo operare su se stesso (load/unload/reload/disable/enable) via API.
2. Solo operatori con `core-pack:plugins:operate` possono eseguire operazioni su altri plugin.
3. Il backoffice mostra stato, dipendenze e operazioni disponibili ma non diventa owner implicito del runtime.
4. Ogni operazione produce audit event.
5. Le operazioni di security provisioning sono gestite da `core-pack` e protette dalle permission del plugin chiamante.

### Audit

Ogni operazione (load, unload, reload, disable, enable) genera un evento di audit con:
- attore (admin ID)
- plugin target
- operazione
- esito
- timestamp

## Eventi

### Eventi core di piattaforma

| Nome canonico                | Owner      | Visibility | Delivery | Quando                     |
| ---------------------------- | ---------- | ---------- | -------- | -------------------------- |
| `core.plugin.registered`     | kernel     | `audit`    | `sync`   | plugin registrato          |
| `core.plugin.loaded`         | kernel     | `audit`    | `sync`   | plugin caricato            |
| `core.plugin.unloaded`       | kernel     | `audit`    | `sync`   | plugin scaricato           |
| `core.plugin.failed`         | kernel     | `audit`    | `sync`   | plugin in failure          |
| `core.plugin.disabled`       | kernel     | `audit`    | `sync`   | plugin disabilitato        |
| `core.plugin.enabled`        | kernel     | `audit`    | `sync`   | plugin riabilitato         |
| `core.plugin.operation`      | kernel     | `audit`    | `sync`   | operazione su plugin       |

### Payload eventi

```ts
export interface PluginAuditEventPayload {
  pluginId: string;
  operation: string;
  actorId: string;
  success: boolean;
  phase?: string;
  errorCode?: string;
  timestamp: string;
}
```

### Delivery e retry

- Tutti gli eventi core sono `sync` (in-process).
- Nessun retry automatico: se un subscriber fallisce, l'errore viene loggato ma non blocca il producer.
- Idempotency: l'`idempotencyKey` e opzionale. Se presente, l'event bus deve deduplicare entro 5 minuti.
- Audit policy: ogni evento core e persistito in `cms_core_audit_events` con retention default 90 giorni.

## Compatibilita e versioning

- Il `CmsPluginManifest` puo essere esteso con nuovi campi opzionali senza breaking change.
- `id` plugin e immutabile dopo installazione.
- `version` segue semver. Breaking change sul manifest richiede major bump del plugin.
- `requiresCore` usa semver range. Plugin che richiede core version incompatibile non viene caricato.
- Le API HTTP plugin sono `v1`. Breaking change richiede nuova major version dell'endpoint.
- I DTO possono ricevere nuovi campi opzionali. Rimozione o rename di campi esistenti e breaking.
- Gli error code sono parte del contratto pubblico. Non possono essere rimossi senza major version.

Runtime event collection:

```text
cms_kernel_plugin_runtime_events
```

Indexes:

| Name              | Keys                            | Unique |
| ----------------- | ------------------------------- | ------ |
| `plugin_sequence` | `{ pluginId: 1, sequence: -1 }` | no     |
| `timestamp_desc`  | `{ timestamp: -1 }`             | no     |
| `action_lookup`   | `{ action: 1, success: 1 }`     | no     |

## Error model

| Code                                  | HTTP | Quando                                      |
| ------------------------------------- | ---- | ------------------------------------------- |
| `plugin_manifest_invalid`             | 400  | manifest non valido                         |
| `plugin_compatibility_failed`         | 409  | `requiresCore` non compatibile              |
| `plugin_dependency_missing`           | 409  | dipendenza richiesta assente                |
| `plugin_dependency_cycle`             | 409  | ciclo nel dependency graph                  |
| `plugin_namespace_collision`          | 409  | entity/route/alias/permission duplicata     |
| `plugin_operation_not_available`      | 409  | operazione non ammessa nello stato corrente |
| `plugin_lifecycle_hook_failed`        | 500  | hook plugin fallito                         |
| `plugin_security_provisioning_failed` | 500  | provisioning permission/role fallito        |
| `plugin_admin_contribution_invalid`   | 400  | contribution admin invalida                 |

Error envelope:

```json
{
  "error": {
    "code": "plugin_namespace_collision",
    "message": "Plugin route '/settings' is already registered",
    "details": {
      "pluginId": "domain-plugin",
      "ownerPluginId": "core-pack",
      "resource": "admin.routes./settings"
    }
  }
}
```

## Acceptance criteria

La specifica e implementabile quando:

- il manifest target ha tutti i blocchi richiesti per plugin futuri
- naming e ownership sono chiari
- ogni contribution ha owner e collision policy
- API operative plugin hanno DTO, permission e errori definiti
- storage runtime ha collection, schema e indici target
- i gap col codice attuale sono espliciti

## Out of scope

- marketplace remoto
- hot reload filesystem in sviluppo
- broker eventi esterno obbligatorio
- supporto multi-database
- UI plugin marketplace

## Gap rispetto al codice attuale

- Il codice attuale espone `PluginManifest` con `id`, `version`,
  `requiresCore`, `capabilities`, `dependencies`, `security`.
- Mancano nel manifesto corrente: `entities`, `settings`, `events`, `admin`,
  `displayName`, `description`.
- Il contratto `DbAdapter` viene mantenuto temporaneamente come nome di
  compatibilita interna, ma la semantica target e Mongo-first. Non va esteso come
  astrazione multi-database.
- Le contribution admin esistono in `admin-kernel`, ma non sono ancora parte del
  manifesto backend.
- Il runtime event log esiste come diagnostica; il plugin event bus target parte
  in-process e usa dichiarazioni `events` del manifest.

# Plugin event bus

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-22`

## Decisione

Trinacria CMS deve offrire un event bus opzionale per comunicazione intra-core e
inter-plugin.

Il kernel definisce il contratto CMS dell'event bus. L'implementazione deve
riusare le primitive eventi di Trinacria quando possibile.

Decisione chiusa: la prima implementazione e **in-process** e supporta `sync` e
`async`. `deferred` resta nel contratto come valore riservato per una futura
delivery persistente, ma non e obbligatorio nella prima milestone implementativa.

## Responsabilita

| Area                 | Owner                      | Responsabilita                             |
| -------------------- | -------------------------- | ------------------------------------------ |
| Event bus contract   | `@trinacria-cms/kernel`    | Definizione contratto eventi CMS           |
| Event bus impl base  | `@trinacria-cms/kernel`    | Publish/subscribe in-process sync/async    |
| Event declarations   | `@trinacria-cms/kernel`    | Integrazione manifest -> event registry    |
| Namespace governance | `@trinacria-cms/kernel`    | Collisioni nomi evento, visibility         |
| Audit event storage  | `@trinacria-cms/core-pack` | Storage centralizzato audit events         |
| Core platform events | `@trinacria-cms/core-pack` | Eventi core osservabili (install, etc.)    |
| Plugin events        | plugin dominio             | Eventi applicativi dichiarati nel manifest |

## Modello dati

### PluginEventBus

Entry point del sistema eventi.

```ts
export interface PluginEventBus {
  publish(event: EventPayload): Promise<void>;
  subscribe(subscription: EventSubscription): Promise<void>;
  unsubscribe(pluginId: string, eventName: string): Promise<void>;
  listSubscriptions(eventName?: string): Promise<EventSubscription[]>;
}

export interface EventPayload {
  name: string;
  pluginId: string;
  version: number;
  payload?: unknown;
  idempotencyKey?: string;
  timestamp: string;
}

export interface EventSubscription {
  pluginId: string;
  eventName: string;
  handler: string;
  requiredPermission?: string;
  delivery: "sync" | "async";
}
```

### EventDeclaration

Dichiarazione evento nel manifest plugin.

```ts
export interface PluginEventDeclaration {
  name: string;
  visibility: "core" | "public" | "protected" | "private" | "audit";
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

### EventFilter

```ts
export interface EventFilter {
  pluginId?: string;
  name?: string;
  visibility?: EventVisibility;
  since?: string;
  limit?: number;
}
```

## Contratti TypeScript target

Package owner: `@trinacria-cms/kernel`

### EventBus

```ts
export interface CmsEventBus {
  emit(event: CmsEvent): Promise<EmitResult>;
  on(eventPattern: string, handler: EventHandler, options?: SubscribeOptions): void;
  off(eventPattern: string, handler: EventHandler): void;
}

export interface CmsEvent {
  name: string;
  source: string;
  payload?: unknown;
  idempotencyKey?: string;
}

export interface EmitResult {
  accepted: boolean;
  subscribers: number;
  errors?: readonly EmitError[];
}

export interface EmitError {
  subscriber: string;
  error: string;
}

export interface EventHandler {
  (event: CmsEvent): Promise<void> | void;
}

export interface SubscribeOptions {
  requiredPermission?: string;
  delivery?: "sync" | "async";
}
```

### Event visibility

```ts
export type EventVisibility = "core" | "public" | "protected" | "private" | "audit";
```

## API HTTP target

L'event bus non espone API HTTP dirette. Gli eventi sono un meccanismo interno
al runtime.

Eccezione: gli eventi runtime diagnostici sono leggibili via

| Method | Path                                            | Permission               |
| ------ | ----------------------------------------------- | ------------------------ |
| `GET`  | `/v1/system/plugins/{pluginId}/events?limit=50` | `core-pack:plugins:read` |

(Endpoint gia implementato nel kernel system controller.)

## Storage Mongo

### Plugin runtime events (kernel - gia esistente)

| Collection                         | Unique index                    | Owner  |
| ---------------------------------- | ------------------------------- | ------ |
| `cms_kernel_plugin_runtime_events` | `{ pluginId: 1, sequence: -1 }` | kernel |

Index:

| Name              | Keys                            | Unique |
| ----------------- | ------------------------------- | ------ |
| `plugin_sequence` | `{ pluginId: 1, sequence: -1 }` | no     |
| `timestamp_desc`  | `{ timestamp: -1 }`             | no     |
| `action_lookup`   | `{ action: 1, success: 1 }`     | no     |

### Audit events (core-pack - futura estensione)

Riservato a futura implementazione:

| Collection                       | Unique index                     | Owner     |
| -------------------------------- | -------------------------------- | --------- |
| `cms_core_platform_audit_events` | `{ eventName: 1, sequence: -1 }` | core-pack |

## Security e permission

### Regole di visibilita

| Visibility  | Chi puo emettere          | Chi puo sottoscrivere       |
| ----------- | ------------------------- | --------------------------- |
| `core`      | kernel, core-pack         | kernel, core-pack           |
| `public`    | qualunque plugin          | qualunque plugin            |
| `protected` | qualunque plugin          | solo con capability/policy  |
| `private`   | solo l'owner              | nessuno (contratto interno) |
| `audit`     | kernel, core-pack, plugin | solo core-pack (storage)    |

### Regole

1. Un plugin puo emettere solo eventi che possiede o che il core gli consente.
2. Un plugin puo sottoscrivere eventi `public` senza restrizioni.
3. Un plugin puo sottoscrivere eventi `protected` solo con capability/policy.
4. Gli eventi `private` non sono parte del contratto pubblico.
5. Gli handler non devono bloccare il runtime plugin in modo non governato.
6. Errori handler producono diagnostics senza rompere il producer, salvo eventi
   dichiarati come transazionali.
7. Le sottoscrizioni vengono registrate nel `EventSubscriptionRegistry` al
   caricamento del plugin e rimosse all'unload.

## Eventi

### Eventi core di piattaforma

| Evento                          | Visibility | Delivery | Quando                      |
| ------------------------------- | ---------- | -------- | --------------------------- |
| `core.plugin.registered`        | `audit`    | `sync`   | plugin registrato           |
| `core.plugin.loaded`            | `audit`    | `sync`   | plugin caricato             |
| `core.plugin.unloaded`          | `audit`    | `sync`   | plugin scaricato            |
| `core.plugin.failed`            | `audit`    | `sync`   | plugin in failure           |
| `core.plugin.disabled`          | `audit`    | `sync`   | plugin disabilitato         |
| `core.settings.secret.revealed` | `audit`    | `sync`   | secret rivelato             |
| `core.settings.secret.rotated`  | `audit`    | `sync`   | secret ruotato              |
| `core.security.provisioned`     | `audit`    | `sync`   | permission/role provisioned |

## Errori

| Code                         | HTTP | Quando                                   |
| ---------------------------- | ---- | ---------------------------------------- |
| `event_emission_failed`      | 500  | pubblicazione evento fallita             |
| `event_subscription_invalid` | 400  | sottoscrizione con nome/handler invalido |
| `event_handler_error`        | 500  | handler subscriber solleva eccezione     |
| `event_visibility_denied`    | 403  | plugin tenta evento non consentito       |
| `event_not_found`            | 404  | evento inesistente nella dichiarazione   |

## Lifecycle

1. Al load del plugin, il kernel registra le dichiarazioni `events.emits` e
   `events.subscribes` dal manifest.
2. Per ogni evento dichiarato in `emits`, il kernel convalida namespace e
   visibilita.
3. Per ogni evento dichiarato in `subscribes`, il kernel registra l'handler
   presso l'event bus.
4. All'unload del plugin, tutte le sottoscrizioni vengono rimosse.
5. Al disable del plugin, le sottoscrizioni vengono sospese ma non rimosse.
6. Al re-enable, le sottoscrizioni vengono riattivate.

## Compatibilita e versioning

- Il nome evento e immutabile dopo la prima pubblicazione.
- `version` nell'event declaration segue semantica: incremento major = breaking
  change sul payload.
- Un subscriber deve dichiarare la versione evento che consuma.
- Eventi deprecati restano disponibili per almeno una major version del plugin
  che li emette.
- L'aggiunta di campi opzionali al payload non e breaking.

## Acceptance criteria

- `CmsEventBus` permette emit, on, off per eventi dichiarati.
- Le quattro visibility class (core, public, protected, private) sono
  operative.
- La delivery sync/async e funzionante e testata.
- Errori handler non rompono il producer.
- Le sottoscrizioni seguono il lifecycle del plugin (registrate al load,
  rimosse all'unload).
- Esistono eventi core di piattaforma per plugin lifecycle e settings audit.

## Out of scope

- message broker esterno obbligatorio (RabbitMQ, Kafka, Redis)
- garanzia exactly-once delivery nella prima implementazione
- event sourcing globale della piattaforma
- orchestrazione workflow complessa basata su eventi
- event replay e ripristino storico
- delivery `deferred` nella prima implementazione

## Gap rispetto al codice attuale

- Il kernel non espone ancora un `CmsEventBus` contract pubblico.
- Il runtime plugin emette gia eventi diagnostici (runtime events) ma non
  attraverso un event bus formale.
- `plugin-manifest.ts` non contiene ancora il blocco `events` (emits/subscribes)
  nel `PluginManifest`.
- core-pack possiede lo storage audit ma non e ancora collegato a un event bus
  trasversale.
- Non esiste un `EventSubscriptionRegistry` formale.
- La maggior parte degli eventi core di piattaforma (`core.plugin.*`,
  `core.security.*`) sono emessi come diagnostica ma non come eventi di
  piattaforma pubblicabili.

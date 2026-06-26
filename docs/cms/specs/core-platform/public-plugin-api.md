# Public plugin API

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: developer-facing API reference
- Ultimo aggiornamento: `2026-06-24`

## Scopo

Questo documento descrive le API pubbliche che uno sviluppatore plugin deve
conoscere per creare un plugin Trinacria CMS.

Le specifiche lunghe spiegano il perche delle decisioni. Questa pagina spiega
il cosa usare.

## Package pubblico

Package owner:

```text
@trinacria-cms/kernel
```

Import principali:

```ts
import type {
  CacheAdapter,
  PluginDiscoverySource,
  KernelPluginDefinition,
  PluginManifest,
  PluginRuntime,
  CmsEventBus
} from "@trinacria-cms/kernel";
import {
  assertPluginCompatibility,
  buildContributionKey,
  buildSettingKey,
  validatePluginManifest
} from "@trinacria-cms/kernel";
import {
  defineAdmin,
  defineAdminResource,
  defineAdminRoute,
  defineAdminSettingsSection,
  defineBooleanSetting,
  definePluginManifest,
  defineSecurity,
  defineStringSetting,
  errorEnvelope,
  successEnvelope
} from "@trinacria-cms/kernel/plugin-api";
import { CORE_TOKENS } from "@trinacria-cms/kernel";
// CORE_TOKENS.CACHE_ADAPTER — token DI per l'adapter cache
```

Per integrazione con il configuration registry (chiamate plugin-to-core
signed), gli helper di firma sono specifici di `core-pack`:

```ts
import { createSignedPluginRequest } from "@trinacria-cms/core-pack/plugin-api";
```

Regola di import:

- helper generici per manifest, admin, security, settings, eventi e HTTP envelope:
  `@trinacria-cms/kernel/plugin-api`;
- helper legati al protocollo signed settings di `core-pack`:
  `@trinacria-cms/core-pack/plugin-api`.

Vedere specifiche:

- `plugin-event-bus.md` per dichiarazione e consumo eventi
- `configuration-registry.md` per accesso signed alle configurazioni
- `namespace-governance.md` per regole di naming e collisioni
- `plugin-contract.md` per il contratto manifest completo

## Manifest

Il manifest e la fonte dichiarativa canonica del plugin.

```ts
export interface PluginManifest {
  id: string;
  displayName?: string;
  description?: string;
  version: string;
  requiresCore: string;
  capabilities?: readonly string[];
  dependencies?: readonly PluginManifestDependency[];
  entities?: readonly PluginManifestEntity[];
  settings?: readonly PluginManifestSetting[];
  events?: PluginManifestEvents;
  admin?: PluginManifestAdmin;
  security?: PluginManifestSecurity;
}
```

Regole stabili:

- `id` e lowercase, unico e immutabile.
- `version` usa semver.
- `requiresCore` usa il semver range supportato dal kernel.
- `entities`, `settings`, `events`, `admin` sono dichiarazioni backend
  canoniche.
- registry runtime e cache possono derivare dal manifest, ma non diventano
  fonti di verita parallele.

## Plugin definition

Un plugin runtime collega manifest, moduli Trinacria e hook CMS.

```ts
export interface KernelPluginDefinition {
  manifest: PluginManifest;
  modules?: readonly ModuleDefinition[];
  onLoad?(context: KernelPluginRuntimeContext): Promise<void> | void;
  onInit?(context: KernelPluginRuntimeContext): Promise<void> | void;
  onUnload?(context: KernelPluginRuntimeContext): Promise<void> | void;
}
```

Forma minima consigliata:

```ts
export const plugin: KernelPluginDefinition = {
  manifest,
  modules: [],
  async onLoad(context) {
    // optional runtime initialization
  }
};
```

## Plugin discovery

Lo starter CMS puo ricevere sorgenti plugin configurate:

```ts
export interface PluginDiscoverySource {
  type: "workspace" | "package" | "local-path";
  name: string;
  entrypoint: string;
  enabledByDefault?: boolean;
}
```

Regole:

- la discovery usa solo sorgenti esplicite, non filesystem scan arbitrario;
- `enabledByDefault: false` marca la sorgente come `disabled` e non importa
  l'entrypoint;
- l'entrypoint deve esportare una `KernelPluginDefinition` come `default`,
  `plugin`, `cmsPlugin` o `definition`;
- le sorgenti `local-path` vengono risolte come file URL.

Endpoint diagnostico:

```text
GET /v1/system/plugins/sources
```

## Runtime contribution catalog

Il runtime espone un catalogo derivato dal manifest:

```ts
export interface PluginRuntime {
  describeContributions(): PluginContributionCatalogSnapshot;
}
```

Snapshot:

```ts
export interface PluginContributionCatalogSnapshot {
  entities: readonly PluginContributionSnapshot<PluginManifestEntity>[];
  settings: readonly PluginContributionSnapshot<PluginManifestSetting>[];
  events: {
    emits: readonly PluginContributionSnapshot<PluginManifestEmittedEvent>[];
    subscribes: readonly PluginContributionSnapshot<PluginManifestEventSubscription>[];
  };
  admin: {
    navigation: readonly PluginContributionSnapshot<PluginManifestAdminNavigation>[];
    routes: readonly PluginContributionSnapshot<PluginManifestAdminRoute>[];
    resources: readonly PluginContributionSnapshot<PluginManifestAdminResource>[];
    widgets: readonly PluginContributionSnapshot<PluginManifestAdminWidget>[];
    settingsSections: readonly PluginContributionSnapshot<PluginManifestAdminSettingsSection>[];
  };
}
```

Regole:

- il catalogo e read-only e derivato dai manifest registrati
- `register` aggiorna il catalogo
- `unregister` rimuove i contributi del plugin
- le route admin e le base path admin globali non possono collidere
- il catalogo non sostituisce il manifest come fonte di verita

Endpoint operativo:

```text
GET /v1/system/plugin-contributions
```

Risposta:

```ts
{
  data: PluginContributionCatalogSnapshot;
  meta?: {
    pluginId?: "kernel";
  };
}
```

## Manifest validation

Ogni manifest deve passare da `validatePluginManifest`.

```ts
const parsed = validatePluginManifest(manifest);
assertPluginCompatibility(parsed, "0.1.0");
```

La validazione oggi copre:

- shape strict del manifest
- semver di `version`
- semver range di `requiresCore`
- dipendenze duplicate e self dependency
- namespace riservati
- collisioni locali su entity, setting, eventi, admin contribution
- ownership delle permission dichiarate o referenziate

## Namespace e chiavi canoniche

Helper pubblici:

```ts
buildNamespaceId(pluginId, entityName, resourceId);
parseNamespaceId(namespaceId);
assertPluginOwnsNamespaceId(pluginId, namespaceId);
buildContributionKey(pluginId, localName);
buildSettingKey(pluginId, namespace, key);
isValidPluginId(pluginId);
isValidNamespaceSegment(segment);
```

Formato namespace record:

```text
<pluginId>:<entityName>:<resourceId>
```

Formato contribution key:

```text
<pluginId>:<localName>
```

Formato setting key:

```text
<pluginId>:<namespace>:<key>
```

Namespace riservati:

```text
core
kernel
system
admin
trinacria
core-pack
```

## Entity declaration

```ts
export interface PluginManifestEntity {
  name: string;
  collection?: string;
  displayName?: string;
  schemaVersion: number;
  documentSchema?: Record<string, unknown>;
  indexes?: readonly PluginManifestEntityIndex[];
  repository?: {
    mode: "standard" | "custom";
    token?: string;
  };
}
```

Regole:

- `name` e locale al plugin.
- chiave canonica: `<pluginId>:<name>`.
- `schemaVersion` parte da `1`.
- `documentSchema` descrive la forma logica del documento.
- `indexes` e input dichiarativo per il sync Mongo.

## Settings declaration

```ts
export interface PluginManifestSetting {
  key: string;
  category: string;
  description?: string;
  schema?: JsonValue;
  defaultValue?: JsonValue;
  status?: "active" | "deprecated" | "disabled";
  secret?: boolean;
  mutable?: boolean;
  visibility?: "public" | "admin" | "internal";
}
```

Regole:

- chiave canonica: `<pluginId>:<namespace>:<key>`.
- `category` guida raggruppamento, backoffice e API grouped settings.
- `secret: true` richiede storage cifrato nel configuration registry.
- `defaultValue` e un valore JSON-compatible nativo, non una stringa JSON.

Helper consigliati:

```ts
defineStringSetting({
  pluginId: "blog-pack",
  domain: "editorial",
  name: "default_status",
  category: "editorial",
  defaultValue: "draft",
  maxLength: 40
});
```

### Accesso runtime alle configurazioni

Un plugin puo leggere e scrivere le proprie configurazioni tramite signed call
alle API settings di core-pack:

```ts
const request = createSignedPluginRequest({
  pluginId: "blog-pack",
  secret: process.env.BLOG_PACK_SETTINGS_SECRET!,
  method: "PUT",
  path: "/v1/settings/values/blog-pack:editorial:default_status",
  body: {
    value: "review",
    updatedBy: "blog-pack"
  }
});
```

Il configuration registry e descritto in dettaglio nella specifica
`configuration-registry.md`.

## Event declaration

```ts
export interface PluginManifestEvents {
  emits?: readonly PluginManifestEmittedEvent[];
  subscribes?: readonly PluginManifestEventSubscription[];
}
```

Evento emesso:

```ts
export interface PluginManifestEmittedEvent {
  name: string;
  visibility: "public" | "protected" | "private" | "audit";
  version: number;
  delivery?: "sync" | "async" | "deferred";
  payloadSchema?: Record<string, unknown>;
}
```

Subscription:

```ts
export interface PluginManifestEventSubscription {
  eventName: string;
  handler: string;
  requiredPermission?: string;
}
```

Regole:

- eventi emessi: `name` locale al plugin.
- chiave canonica evento emesso: `<pluginId>:<name>`.
- eventi sottoscritti: `eventName` in formato `<pluginId>:<eventName>`.
- `delivery` default: `async`.

### Uso runtime dell'event bus

Una volta che il plugin e caricato, puo accedere al bus tramite il token DI
`CORE_TOKENS.EVENT_BUS` (futuro):

```ts
import { CORE_TOKENS } from "@trinacria-cms/kernel";
import type { CmsEventBus } from "@trinacria-cms/kernel";

// Nel lifecycle hook onLoad
async function onLoad(context) {
  const eventBus: CmsEventBus = context.app.get(CORE_TOKENS.EVENT_BUS);

  // Emettere un evento dichiarato
  await eventBus.emit({
    name: "blog-pack:post-published",
    source: "blog-pack",
    payload: { postId: "123" }
  });

  // Sottoscrivere un evento (opzionale se gia dichiarato nel manifest)
  eventBus.on("commerce:order.created", async (event) => {
    console.log("Order received:", event.payload);
  });
}
```

Le sottoscrizioni dichiarate nel manifest vengono registrate automaticamente
dal runtime al caricamento del plugin e rimosse all'unload.

## Admin declaration

```ts
export interface PluginManifestAdmin {
  pages?: readonly AdminRouteDefinition[];
  navigation?: readonly AdminNavigationItem[];
  resources?: readonly AdminResourceDefinition[];
  dashboard?: {
    widgets?: readonly AdminDashboardWidgetDefinition[];
  };
  settings?: {
    sections?: readonly AdminSettingsSectionDefinition[];
  };
}
```

Regole:

- `id` e locale al plugin.
- `path` e gli endpoint dichiarativi iniziano con `/`.
- gli endpoint admin runtime devono restare in namespace sicuri, per default `/admin`.
- i guards capability/permission, quando presenti, devono appartenere al plugin.
- l'admin-kernel usa queste dichiarazioni per costruire `AdminExtensionManifest` e renderer dichiarativi.
- UI React custom non serializzabile resta fuori dal manifest runtime.

## Security declaration

Formato permission:

```text
<pluginId>:<resource>:<action>
```

Un plugin puo dichiarare solo permission del proprio namespace.

```ts
export interface PluginManifestSecurity {
  permissions?: readonly PluginManifestSecurityPermission[];
  roles?: readonly PluginManifestSecurityRole[];
  grants?: readonly PluginManifestSecurityGrant[];
  policyRules?: readonly PluginManifestSecurityPolicyRule[];
}
```

## Esempio minimo

```ts
import type { KernelPluginDefinition, PluginManifest } from "@trinacria-cms/kernel";

export const manifest: PluginManifest = {
  id: "blog-pack",
  displayName: "Blog Pack",
  version: "1.0.0",
  requiresCore: "^0.1.0",
  entities: [
    {
      name: "posts",
      displayName: "Posts",
      schemaVersion: 1,
      indexes: [{ name: "slug_unique", fields: { slug: 1 }, unique: true }]
    }
  ],
  settings: [
    {
      namespace: "editorial",
      key: "default-status",
      type: "string",
      visibility: "protected",
      defaultValueJson: '"draft"'
    }
  ],
  events: {
    emits: [{ name: "post-published", visibility: "public", version: 1 }]
  },
  admin: {
    pages: [
      {
        id: "posts",
        path: "/blog/posts",
        pluginId: "blog-pack",
        mode: "declarative",
        kind: "resource",
        title: "Posts",
        data: {
          endpoint: { method: "GET", path: "/admin/blog/posts" },
          valuePath: "data.items"
        },
        guards: [{ capability: "blog-pack:posts:read" }]
      }
    ],
    navigation: [
      {
        id: "nav-posts",
        routeId: "posts",
        title: "Posts",
        group: "Content"
      }
    ]
  },
  security: {
    permissions: [{ key: "blog-pack:posts:read", displayName: "Read posts" }]
  }
};

export const plugin: KernelPluginDefinition = {
  manifest
};
```

## Cache service

Il sistema di cache e disponibile come servizio DI in core-pack.

### Token

```ts
import { CORE_TOKENS } from "@trinacria-cms/kernel";

// Token per l'adapter cache (livello kernel)
CORE_TOKENS.CACHE_ADAPTER;
// Alias: CORE_PACK_CACHE_ADAPTER_TOKEN (da @trinacria-cms/core-pack, retrocompatibile)

// Token per il servizio cache (da @trinacria-cms/core-pack)
CORE_PACK_CACHE_SERVICE_TOKEN;
```

### CacheService API

```ts
class CacheService {
  get<T>(namespace: string, key: string): Promise<T | undefined>;
  set<T>(namespace: string, key: string, value: T, ttlSeconds?: number): Promise<void>;
  getOrCompute<T>(
    namespace: string,
    key: string,
    loader: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T>;
  invalidate(namespace: string, key?: string): Promise<void>;
  clear(): Promise<void>;
  wrap<T>(
    namespace: string,
    key: string,
    loader: () => Promise<T>,
    ttlSeconds?: number
  ): () => Promise<T>;
}
```

### Adapter predefiniti

- `MemoryCacheAdapter` — cache in-process, persa al riavvio
- `RedisCacheAdapter` — cache Redis condivisa tra repliche

La selezione avviene automaticamente: se `core-pack:cache:redis_url` e
configurato nelle settings si usa Redis, altrimenti Memory.

### Adapter personalizzato

```ts
import { setCustomCacheAdapter } from "@trinacria-cms/core-pack";
import type { CacheAdapter } from "@trinacria-cms/kernel";

class MyAdapter implements CacheAdapter {
  // implementa get/set/del/delNamespace/clear
}

setCustomCacheAdapter(new MyAdapter());
```

### Pattern d'uso in un repository

```ts
class MyRepository {
  constructor(
    private readonly db: DbAdapter,
    private readonly cache?: CacheService  // opzionale
  ) {}

  async findById(id: string): Promise<Widget | null> {
    if (!this.cache) return this.getFromDb(id);
    return this.cache.getOrCompute("my-plugin:widgets", id, () => this.getFromDb(id));
  }

  async update(id: string, data: Partial<Widget>): Promise<Widget> {
    const result = /* db update */;
    await this.cache?.invalidate("my-plugin:widgets");
    return result;
  }
}
```

Vedi specifica completa: `0017-cache-and-auth-hardening.md` (EN) /
`0017-cache-e-indurimento-autenticazione.md` (IT).

## Cosa non e ancora API pubblica stabile

- event bus operativo (specifica M4.0 completa, in attesa di implementazione)
- configuration registry (specifica M4.0 completa, in attesa di implementazione)
- namespace validator (specifica M4.0 completa, in attesa di implementazione)
- admin dynamic resource renderer (specifica M4.0 in corso)
- marketplace/discovery esterno (fuori scope M4.0)

Queste aree hanno specifiche M4.0 chiuse o in corso, ma non vanno considerate
API stabili fino alla relativa implementazione e verifica col codice reale.

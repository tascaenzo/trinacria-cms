# Public plugin API

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: developer-facing API reference
- Ultimo aggiornamento: `2026-05-21`

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
import type { KernelPluginDefinition, PluginManifest, PluginRuntime } from "@trinacria-cms/kernel";
import {
  assertPluginCompatibility,
  buildContributionKey,
  buildSettingKey,
  validatePluginManifest
} from "@trinacria-cms/kernel";
```

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
  namespace: string;
  key: string;
  type: "string" | "number" | "boolean" | "json" | "secret";
  visibility: "public" | "protected" | "secret";
  required?: boolean;
  description?: string;
  schema?: Record<string, unknown>;
  defaultValueJson?: string;
}
```

Regole:

- chiave canonica: `<pluginId>:<namespace>:<key>`.
- `secret` richiede storage cifrato nel configuration registry.
- `defaultValueJson` e serializzato JSON, non valore JavaScript libero.

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

## Admin declaration

```ts
export interface PluginManifestAdmin {
  navigation?: readonly PluginManifestAdminNavigation[];
  routes?: readonly PluginManifestAdminRoute[];
  resources?: readonly PluginManifestAdminResource[];
  widgets?: readonly PluginManifestAdminWidget[];
  settingsSections?: readonly PluginManifestAdminSettingsSection[];
}
```

Regole:

- `id` e locale al plugin.
- `path`, `routeBase`, `apiBase` iniziano con `/`.
- `requiredPermission`, quando presente, deve appartenere al plugin.
- l'admin-kernel usera queste dichiarazioni per montare UI e risorse.

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
    routes: [
      {
        id: "posts",
        path: "/blog/posts",
        label: "Posts",
        requiredPermission: "blog-pack:posts:read"
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

## Cosa non e ancora API pubblica stabile

- event bus operativo
- configuration registry completo
- admin dynamic resource renderer
- marketplace/discovery esterno
- endpoint HTTP pubblico dei contributi

Queste aree sono in specifica M4.0, ma non vanno considerate API stabili fino
alla relativa implementazione.

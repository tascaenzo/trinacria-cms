# Admin manifest and declarative backoffice extensibility

## Stato

- Milestone: `M4.0 - Core Platform Specifications`, aggiornata dopo il refactor admin runtime
- Stato: `low-level`
- Scope: admin manifest, registry, renderer declarative, security policy
- Ultimo aggiornamento: `2026-06-06`

## Decisione

Il backoffice si estende tramite manifest admin dichiarativi esposti dai plugin.
`admin-kernel` non deve possedere la lista reale delle superfici dei plugin: deve
possedere i contratti, la normalizzazione, la policy di sicurezza, il registry e
i renderer standard.

Il flusso target e:

```text
plugin/core-pack backend
  -> espone AdminExtensionManifest via API autenticata e filtrata
  -> espone endpoint dati/azioni dichiarati nel manifest

backoffice host
  -> scarica manifest runtime
  -> passa da sanitize policy
  -> normalizza in contribution renderizzabili
  -> monta registry e renderer

admin-kernel
  -> contratti
  -> sanitizer/security policy
  -> normalizer
  -> registry capability-aware
  -> renderer declarative standard
  -> escape hatch React locale
```

## Terminologia

| Termine                       | Significato                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `AdminExtensionManifest`      | Contratto serializzabile dichiarato dal plugin. E raw fino a sanitizzazione.           |
| `SafeAdminExtensionManifest`  | Manifest passato da `sanitizeAdminExtensionManifest`; puo entrare nel normalizer puro. |
| `RenderableAdminContribution` | Forma interna montabile dal backoffice; include render React per le route.             |
| `contributions`               | Escape hatch locale/non serializzabile per componenti React custom.                    |
| `componentRef`                 | Identificatore namespaced che collega manifest dichiarativo e renderer React custom.   |
| `BackofficeModule.renderers`   | Registry host dei renderer React esportati dal package proprietario del plugin.       |
| `manifest`                    | Canale consigliato per plugin runtime/API.                                             |
| `registry`                    | Merge tra contribution, runtime plugin state, capability e permission utente.          |
| `renderer declarative`        | UI standard generata da metadati manifest, schema e endpoint binding.                  |

## Responsabilita

| Area             | Owner                                           | Responsabilita                                                                    |
| ---------------- | ----------------------------------------------- | --------------------------------------------------------------------------------- |
| Contratti admin  | `admin-kernel/src/contracts/`                   | Tipi serializzabili per manifest, action, resource, settings, widget, navigation. |
| Sanitizzazione   | `admin-kernel/runtime/admin-manifest-sanitizer` | Rimuovere endpoint/action unsafe dai manifest raw.                                |
| Endpoint policy  | `admin-kernel/runtime/admin-endpoint-policy`    | Bloccare URL assoluti, traversal, namespace non consentiti e metodi sbagliati.    |
| Normalizzazione  | `admin-kernel/runtime/admin-extension-manifest` | Convertire safe manifest in contribution renderizzabili.                          |
| Registry         | `admin-kernel/runtime/admin-route-runtime`      | Filtrare superfici per plugin loaded, capability e permission.                    |
| Renderer         | `admin-kernel/declarative/`                     | Render standard per pagine, risorse, widget, settings e azioni.                   |
| Design system    | `trinacria-ui`                                  | Componenti visuali puri, senza SDK/runtime/plugin.                                |
| Endpoint backend | plugin owner                                    | Enforcement authz, validazione body, CSRF/audit, business logic.                  |

## Modello dati

### Manifest plugin-facing

```ts
export interface AdminExtensionManifest {
  pluginId: string;
  displayName: string;
  displayNameKey?: string;
  admin?: {
    pages?: readonly AdminRouteDefinition[];
    navigation?: readonly AdminNavigationItem[];
    dashboard?: {
      widgets?: readonly AdminDashboardWidgetDefinition[];
    };
    settings?: {
      sections?: readonly AdminSettingsSectionDefinition[];
    };
    resources?: readonly AdminResourceDefinition[];
  };
  i18n?: readonly unknown[];
}
```

### Esempio manifest declarative

```ts
const manifest: AdminExtensionManifest = {
  pluginId: "catalog-pack",
  displayName: "Catalog",
  admin: {
    pages: [
      {
        id: "catalog-products",
        path: "/catalog/products",
        pluginId: "catalog-pack",
        mode: "declarative",
        kind: "resource",
        title: "Products",
        data: {
          endpoint: { method: "GET", path: "/admin/catalog/products" },
          valuePath: "data"
        },
        guards: [{ capability: "catalog.products.read" }]
      }
    ],
    navigation: [
      {
        id: "nav-catalog-products",
        routeId: "catalog-products",
        title: "Products",
        group: "Catalog"
      }
    ],
    resources: [
      {
        id: "catalog.products",
        pluginId: "catalog-pack",
        entityName: "products",
        routeId: "catalog-products",
        title: "Products",
        fields: [
          { key: "name", label: "Name", primary: true, table: true, form: true },
          { key: "status", label: "Status", kind: "status", table: true }
        ],
        actions: [
          {
            id: "update-status",
            intent: "update",
            title: "Update status",
            endpoint: { method: "PATCH", path: "/admin/catalog/products/:id/status" },
            input: {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["active", "disabled"] }
                }
              }
            },
            guards: [{ capability: "catalog.products.write" }]
          }
        ],
        guards: [{ capability: "catalog.products.read" }]
      }
    ],
    dashboard: {
      widgets: [
        {
          id: "catalog-products-total",
          pluginId: "catalog-pack",
          mode: "declarative",
          kind: "metric",
          title: "Products",
          data: {
            endpoint: { method: "GET", path: "/admin/catalog/products/metrics" },
            valuePath: "data.total"
          },
          guards: [{ capability: "catalog.products.read" }]
        }
      ]
    }
  }
};
```

## Manifest vs contributions

`manifests` e il canale principale per plugin modulari. E serializzabile via API
e produce UI standard tramite renderer declarative.

Quando il manifest non basta, un plugin puo aggiungere UI React custom tramite
`componentRef` + `BackofficeModule.renderers`. Questo e il canale preferito per
widget, settings section e superfici admin specifiche del plugin che devono
restare nel package proprietario.

`contributions` resta disponibile in `BackofficeModule`, ma deve restare un
escape hatch locale/non serializzabile per casi in cui serve montare superfici
React gia renderizzabili e non dichiarabili nel manifest:

- componenti React locali all'app host;
- editor visuali complessi;
- builder drag-and-drop;
- override interni non distribuibili come manifest JSON;
- prototipi di plugin prima di stabilizzare il contratto declarative.

Regola: usare `manifest` per il percorso stabile, usare `componentRef` +
`renderers` per UI plugin-specific non rappresentabile in JSON, usare
`contributions` solo quando un blocco JSON non e espressivo abbastanza e la UI
non deve essere distribuita come contratto plugin.

## Plugin con UI custom

Un plugin che espone parti di backoffice deve mantenere una separazione netta:

- il backend plugin dichiara manifest, capability, permission, settings, eventi,
  endpoint e lifecycle;
- il manifest admin dichiara superfici serializzabili e `componentRef` per i
  punti custom;
- il frontend admin del plugin contiene i renderer React associati ai
  `componentRef`;
- il backoffice host registra il plugin collegando manifest e renderer;
- `admin-kernel` non importa componenti specifici del plugin.

Shape consigliata:

```text
packages/catalog-pack/
  src/
    plugin/
      catalog-pack.manifest.ts
      catalog-pack-admin.manifest.ts
      catalog-pack.plugin.ts
      index.ts
    modules/
      products/
        products.module.ts
        products.controller.ts
        services/
        repositories/
        README.md
    admin/
      index.tsx
      README.md
      widgets/
        catalog-health-widget.tsx
      settings/
        catalog-import-settings.tsx
```

### Manifest prima

Se la UI e una lista, metrica, form settings, azione, risorsa o pagina
dichiarativa, deve stare nel manifest.

```ts
export const CATALOG_PACK_ADMIN_MANIFEST = {
  pluginId: "catalog-pack",
  displayName: "Catalog",
  admin: {
    dashboard: {
      widgets: [
        {
          id: "catalog-products-total",
          pluginId: "catalog-pack",
          mode: "declarative",
          kind: "metric",
          title: "Products",
          data: {
            endpoint: { method: "GET", path: "/admin/catalog/products/metrics" },
            valuePath: "data.total"
          },
          guards: [{ capability: "catalog.products.read" }]
        }
      ]
    }
  }
};
```

### Override React quando il manifest non basta

Quando serve una UI specifica, il manifest deve dichiarare un `componentRef`
stabile. Il `componentRef` e un contratto pubblico del plugin e deve essere
namespaced con il `pluginId`.

```ts
export const CATALOG_PACK_ADMIN_MANIFEST = {
  pluginId: "catalog-pack",
  displayName: "Catalog",
  admin: {
    settings: {
      sections: [
        {
          id: "catalog-import",
          pluginId: "catalog-pack",
          kind: "custom",
          componentRef: "catalog-pack:catalog-import-settings",
          title: "Catalog import",
          guards: [{ capability: "catalog.settings.write" }]
        }
      ]
    },
    dashboard: {
      widgets: [
        {
          id: "catalog-health",
          pluginId: "catalog-pack",
          kind: "custom",
          componentRef: "catalog-pack:catalog-health-widget",
          title: "Catalog health",
          guards: [{ capability: "catalog.products.read" }]
        }
      ]
    }
  }
};
```

I renderer React stanno nel plugin, non in `admin-kernel`:

```tsx
import type {
  AdminDashboardWidgetRenderContext,
  AdminSettingsSectionRenderContext
} from "@trinacria-cms/admin-kernel";
import { CatalogHealthWidget } from "./widgets/catalog-health-widget.js";
import { CatalogImportSettings } from "./settings/catalog-import-settings.js";

export const CATALOG_PACK_ADMIN_RENDERERS = {
  dashboardWidgets: {
    "catalog-pack:catalog-health-widget": (context: AdminDashboardWidgetRenderContext) => (
      <CatalogHealthWidget {...context} />
    )
  },
  settingsSections: {
    "catalog-pack:catalog-import-settings": (context: AdminSettingsSectionRenderContext) => (
      <CatalogImportSettings {...context} />
    )
  }
};
```

Il backoffice host collega il modulo:

```ts
import { definePluginBackofficeModule } from "@trinacria-cms/admin-kernel";
import { CATALOG_PACK_ADMIN_MANIFEST } from "@trinacria-cms/catalog-pack/admin-manifest";
import { CATALOG_PACK_ADMIN_RENDERERS } from "@trinacria-cms/catalog-pack/admin";

export const backofficeModules = [
  {
    ...definePluginBackofficeModule({
      pluginId: "catalog-pack",
      displayName: "Catalog",
      admin: CATALOG_PACK_ADMIN_MANIFEST
    }),
    renderers: CATALOG_PACK_ADMIN_RENDERERS
  }
];
```

### Regole di ownership

- `admin-kernel` puo conoscere solo renderer generici, contratti e superfici
  core-owned.
- Un plugin non deve modificare `admin-kernel` per aggiungere UI applicativa.
- Un plugin deve esportare un entrypoint admin separato, per esempio
  `@trinacria-cms/catalog-pack/admin`.
- Il package plugin deve dichiarare come peer/dependency cio che serve alla UI:
  React, `@trinacria-cms/admin-kernel`, `@trinacria-cms/sdk` e
  `@trinacria-cms/trinacria-ui` quando usati.
- I renderer custom ricevono il `cms` SDK dal contesto del backoffice. Non
  devono creare client globali propri.
- Gli endpoint chiamati dai renderer devono appartenere al plugin owner o a API
  ufficiali, con permission server-side.
- I `componentRef` sono stabili e versionabili: cambiarli rompe il wiring host.

### Quando scegliere cosa

| Necessita                                      | Scelta consigliata                    |
| ---------------------------------------------- | ------------------------------------- |
| Lista CRUD semplice                            | `resources` dichiarativo              |
| Metrica o stato leggibile da endpoint `GET`    | widget dichiarativo                   |
| Form settings semplice                         | settings section dichiarativa         |
| Editor visuale, preview, builder, wizard       | `componentRef` + renderer plugin      |
| Pagina custom non serializzabile locale        | `contributions` nel backoffice module |
| Override temporaneo durante sviluppo           | `contributions`, poi stabilizzare     |
| UI riusabile in piu plugin senza logica plugin | estrazione in `trinacria-ui`          |

## Pipeline runtime

```text
AdminExtensionManifest raw
  -> sanitizeAdminExtensionManifest(raw)
  -> SafeAdminExtensionManifest
  -> normalizeAdminExtensionManifest(safe)
  -> RenderableAdminContribution
  -> buildAdminRegistry(contributions, runtimePlugins, t, userPermissions, renderers)
  -> AdminShell + declarative renderers
```

La funzione convenience `normalizeSafeAdminExtensionManifest(raw)` esegue
sanitize + normalize. Il normalizer puro accetta solo `SafeAdminExtensionManifest`.

## Renderer declarative

La directory `packages/admin-kernel/src/declarative` e divisa cosi:

```text
declarative/
  components/
    declarative-page.tsx
    declarative-resource-page.tsx
    declarative-resource-table.tsx
    declarative-settings-section.tsx
    declarative-dashboard-widget.tsx
    declarative-actions-panel.tsx
    declarative-data-binding.tsx
    declarative-manifest-panel.tsx
  hooks/
    use-declarative-data.ts
    use-declarative-action-controller.tsx
  utils/
    action-body.ts
    formatting.ts
    object-path.ts
    resource.ts
    schema.ts
  types.ts
  index.ts
```

Responsabilita:

- `useDeclarativeData`: legge endpoint `GET` sicuri e gestisce `idle/loading/success/error/refetch`.
- `useDeclarativeActionController`: prepara modale, body JSON, path params, submit SDK e refetch post-success.
- `action-body.ts`: genera draft body da schema o record e risolve path params `:id`.
- `schema.ts`: produce sample JSON e campi readonly da JSON schema.
- `resource.ts`: estrae liste da `valuePath`, `data`, `items`, `data.items`.

## Security model

Il manifest e metadata non fidato finche non passa dal sanitizer.

La security policy applicata da `admin-endpoint-policy` impone:

- endpoint solo relativi alla stessa origin API;
- blocco URL assoluti (`https://...`) e protocol-relative (`//...`);
- path deve iniziare con `/`;
- blocco traversal `..`, `%2e`, `%2f`;
- blocco backslash e control characters;
- default namespace ammesso: `/admin`;
- data binding solo `GET`;
- action solo `POST`, `PUT`, `PATCH`, `DELETE`;
- action con guard esplicite obbligatorie durante sanitizzazione manifest.

Questa policy e difesa frontend/runtime. Non sostituisce mai l'autorizzazione
backend.

Ogni endpoint backend dichiarato nel manifest deve applicare comunque:

- autenticazione admin;
- permission/capability lato server;
- validazione body server-side;
- CSRF protection se la sessione usa cookie;
- audit log per mutazioni;
- ownership plugin dove applicabile.

## Endpoint API target

Non usare `/v1/system/plugin-contributions` come fonte della UI eseguibile. Quel
percorso resta diagnostico/read-only.

Endpoint target consigliato per manifest admin runtime:

```text
GET /admin/extensions
```

Caratteristiche obbligatorie:

- admin-auth required;
- filtrato per utente/ruolo/permission;
- ritorna solo plugin `loaded`;
- ritorna solo manifest gia validati e sanificati lato backend;
- non contiene secret o path interni non destinati all'operatore;
- endpoint dichiarativi gia limitati a namespace ammessi.

## Errori e rifiuti

| Caso                    | Comportamento                                           |
| ----------------------- | ------------------------------------------------------- |
| Endpoint assoluto       | rimosso in sanitize; bloccato anche a runtime           |
| Data endpoint non `GET` | rimosso in sanitize; bloccato a runtime                 |
| Action `GET`            | action rimossa in sanitize; bloccata a runtime          |
| Action senza guard      | action rimossa in sanitize                              |
| Path fuori namespace    | endpoint/action rimosso in sanitize; bloccato a runtime |
| Body JSON invalido      | modale action mostra errore e non invia request         |

## Acceptance criteria

- I contratti admin sono separati per dominio in `admin-kernel/src/contracts/`.
- Manifest raw e safe manifest sono distinti nel codice.
- Il normalizer puro accetta solo safe manifest.
- Il percorso convenience raw -> safe -> contribution resta disponibile.
- I renderer declarative non sono un monolite.
- Gli endpoint declarative sono validati prima di essere usati.
- Le action declarative causano refetch dopo successo.
- I test coprono policy, sanitizzazione, renderer e utility action.

## Gap e prossimi step

- Implementare endpoint backend `GET /admin/extensions` o equivalente.
- Spostare le contribution ufficiali `core-pack` dal seed frontend a manifest esposti dal backend.
- Aggiungere renderer form editabili tipizzati da schema, oltre alla textarea JSON.
- Definire policy configurabile per namespace API reali (`/admin` vs `/v1/admin`) senza aprire tutto `/v1`.
- Aggiungere audit server-side per action declarative.

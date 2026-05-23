# Admin extensibility core

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-22`

## Decisione

Il backoffice si estende tramite contribution dichiarate dai plugin: navigation,
route, resource, widget e settings section.

Resource-driven admin e una utility per CRUD standard, non un generatore
obbligatorio.

## Responsabilita

| Area                | Owner                   | Responsabilita              |
| ------------------- | ----------------------- | --------------------------- |
| Contribution schema | `admin-kernel` + kernel | Contratto contribution      |
| Mounting route      | `admin-kernel`          | Registrazione e rendering   |
| Visibility          | `admin-kernel`          | Permission/capability-aware |
| UI primitives       | `trinacria-ui`          | Componenti riusabili        |
| Custom UI           | plugin owner            | Viste specifiche dominio    |

## Modello dati

```ts
export interface AdminContribution {
  ownerPluginId: string;
  navigation?: AdminNavigationItem[];
  routes?: AdminRoute[];
  resources?: AdminResourceDefinition[];
  widgets?: AdminDashboardWidget[];
  settingsSections?: AdminSettingsSection[];
}
```

## Contratti TypeScript target

```ts
export interface AdminRoute {
  id: string;
  path: string;
  label: string;
  requiredPermission?: string;
  componentRef: string;
}

export interface AdminResourceDefinition {
  id: string;
  ownerPluginId: string;
  label: string;
  routeBase: string;
  apiBase: string;
  requiredPermission?: string;
  columns: AdminResourceColumn[];
  actions?: AdminResourceAction[];
}
```

## API HTTP target

Discovery:

| Method | Path                             | Permission               |
| ------ | -------------------------------- | ------------------------ |
| `GET`  | `/v1/system/admin/contributions` | `core-pack:plugins:read` |

## DTO request/response

```ts
export interface AdminContributionDto {
  ownerPluginId: string;
  navigation: AdminNavigationDto[];
  routes: AdminRouteDto[];
  resources: AdminResourceDto[];
  widgets: AdminWidgetDto[];
}
```

## Storage Mongo

Prima fase: contribution derivate da manifest/runtime, non persistite come fonte
primaria.

Cache opzionale:

```text
cms_kernel_admin_contributions_cache
```

## Security e permission

### Accesso alle contribution admin

| Risorsa                      | Chi puo leggere              | Chi puo scrivere            |
| ---------------------------- | ---------------------------- | --------------------------- |
| Navigation                   | admin con permission match   | plugin owner (manifest)     |
| Route                        | admin con permission match   | plugin owner (manifest)     |
| Resource                     | admin con permission match   | plugin owner (manifest)     |
| Widget                       | admin con permission match   | plugin owner (manifest)     |
| Settings section             | admin con permission match   | plugin owner (manifest)     |

### Regole

1. Contribution visibili solo se la `requiredPermission` dell'utente e soddisfatta.
2. Route custom deve dichiarare guard.
3. Resource API deve verificare permission lato backend.
4. admin-kernel non sostituisce authorization backend.
5. Un plugin non puo registrare contribution che usano permission di un altro plugin senza ownership.
6. Label duplicate producono warning ma non bloccano.

### Audit

- Registrazione contribution: `{ pluginId, contributionType, id }`
- Collisione route: `{ pluginId, path, existingOwner }`
- Collisione resource ID: `{ pluginId, resourceId, existingOwner }`

## Eventi

### Eventi di admin contribution

| Nome canonico                           | Owner       | Visibility | Delivery | Payload                                       | Quando                     |
| --------------------------------------- | ----------- | ---------- | -------- | --------------------------------------------- | -------------------------- |
| `core.admin.contribution.registered`    | admin-kernel | `audit`    | `sync`   | `{ pluginId, type, id }`                      | contribution registrata    |
| `core.admin.contribution.removed`       | admin-kernel | `audit`    | `sync`   | `{ pluginId, type, id }`                      | contribution rimossa       |
| `core.admin.route.collision`            | admin-kernel | `audit`    | `sync`   | `{ pluginId, path, existingOwner }`           | collisione route           |
| `core.admin.resource.collision`         | admin-kernel | `audit`    | `sync`   | `{ pluginId, resourceId, existingOwner }`     | collisione resource ID     |

### Delivery e retry

- Tutti `sync` (in-process).
- Nessun retry automatico.
- Idempotency: la registrazione contribution e gestita dal lifecycle del plugin (unload -> remove, load -> register).
- Audit policy: eventi `audit` persistiti in `cms_core_audit_events`.

## Errori

| Code                         | HTTP | Quando                |
| ---------------------------- | ---- | --------------------- |
| `admin_route_collision`      | 409  | path duplicato        |
| `admin_resource_collision`   | 409  | resource ID duplicato |
| `admin_contribution_invalid` | 400  | schema non valido     |

## Lifecycle

1. Il plugin dichiara `admin` block nel manifest.
2. Il kernel valida namespace e collisioni su route e resource ID.
3. Dopo il load del plugin, le contribution vengono registrate nel catalogo admin.
4. admin-kernel monta navigation, route, resource, widget e settings section.
5. Le contribution sono visibili solo se le permission richieste sono soddisfatte.
6. All'unload del plugin, tutte le contribution vengono rimosse dal catalogo.
7. Al disable del plugin, le contribution vengono nascoste ma non rimosse.

## Compatibilita e versioning

- `id` e `path` sono contratti stabili. Rename richiede alias/redirect o breaking change documentato.
- Resource `id` e immutabile dopo la prima registrazione.
- Aggiungere nuove contribution type (es. nuovi tipi di widget) e compatibile.
- Rimuovere una contribution type esistente e breaking per i plugin che lo usano.
- I campi delle contribution DTO possono essere estesi con campi opzionali.

## Acceptance criteria

- contribution schema e definito
- collision policy chiara
- visibility/permission definite
- discovery endpoint definito
- resource-driven admin resta opzionale

## Out of scope

- page builder visuale
- generatore universale CRUD obbligatorio
- plugin admin bundle remoto

## Gap rispetto al codice attuale

- `AdminResourceDefinition` esiste in `admin-kernel`.
- Mancano manifest/backend admin contribution e discovery API formale.

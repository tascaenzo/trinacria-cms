# Admin extensibility core

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-20`

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

- contribution visibili solo se permission soddisfatta
- route custom deve dichiarare guard
- resource API deve verificare permission lato backend
- admin-kernel non sostituisce authorization backend

## Eventi

| Evento                               | Visibility |
| ------------------------------------ | ---------- |
| `core.admin.contribution.registered` | `audit`    |
| `core.admin.route.collision`         | `audit`    |

## Errori

| Code                         | HTTP | Quando                |
| ---------------------------- | ---- | --------------------- |
| `admin_route_collision`      | 409  | path duplicato        |
| `admin_resource_collision`   | 409  | resource ID duplicato |
| `admin_contribution_invalid` | 400  | schema non valido     |

## Lifecycle

Le contribution vengono validate dopo manifest e namespace validation, prima di
rendere il plugin visibile nel backoffice.

## Compatibilita e versioning

`id` e `path` sono contratti stabili. Rename richiede alias/redirect o breaking
change documentato.

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

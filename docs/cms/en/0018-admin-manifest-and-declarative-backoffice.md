# 0018 - Admin manifest and declarative backoffice

## 1. Goal

This chapter documents the modular backoffice architecture:

```text
plugin -> AdminExtensionManifest -> sanitizer -> SafeAdminExtensionManifest -> registry -> declarative renderer
```

The goal is to let plugins expose pages, menu items, resources, widgets,
settings, and actions without modifying the backoffice source code.

## 2. Boundaries

### `admin-kernel`

Owns:

- admin TypeScript contracts;
- endpoint sanitizer and security policy;
- manifest normalizer;
- capability-aware registry;
- declarative renderer;
- local React custom contribution support.

Does not own:

- the real list of installed plugin surfaces;
- the authoritative plugin manifest source;
- backend authorization;
- plugin business logic.

### Plugin/backend

Owns:

- serializable admin manifest;
- data endpoints;
- action endpoints;
- server-side validation;
- permission/capability enforcement;
- mutation audit logging.

## 3. Manifests vs contributions

`manifests` are the standard scalable path.

`contributions` are a non-serializable React escape hatch.

Use `manifests` for:

- standard resource pages;
- navigation items;
- dashboard widgets;
- settings sections;
- declarative CRUD or operational actions;
- UI that can be generated from schema and metadata.

Use `contributions` only for:

- local custom React components;
- complex visual editors;
- workflows that do not map well to JSON;
- host-specific prototypes.

Practical rule: if UI must come from a plugin API, it must be a manifest. If it
requires React code imported in the host bundle, it is a contribution.

## 4. Current file structure

```text
packages/admin-kernel/src/contracts/
  access.ts
  action.ts
  endpoint.ts
  manifest.ts
  navigation.ts
  page.ts
  registry.ts
  resource.ts
  settings.ts
  widget.ts

packages/admin-kernel/src/runtime/
  admin-endpoint-policy.ts
  admin-manifest-sanitizer.ts
  admin-extension-manifest.ts
  admin-route-runtime.ts

packages/admin-kernel/src/declarative/
  components/
  hooks/
  utils/
  types.ts
  index.ts
```

`contracts.ts` and `declarative/admin-declarative-renderers.tsx` remain
compatibility barrels.

## 5. Manifest pipeline

```ts
const safe = toSafeAdminExtensionManifest(rawManifest);
const contribution = normalizeAdminExtensionManifest(safe);
```

Or, for the convenience path:

```ts
const contribution = normalizeSafeAdminExtensionManifest(rawManifest);
```

The pure normalizer accepts `SafeAdminExtensionManifest`. This prevents raw
manifests from being normalized accidentally.

## 6. Security policy

A manifest is not trusted until it passes through the sanitizer.

The default policy accepts only relative endpoints under `/admin`.

Rejected:

- `https://evil.test/...`
- `//evil.test/...`
- paths not starting with `/`
- paths containing `..`
- paths containing `%2e` or `%2f`
- control characters/backslashes
- non-`GET` data endpoints
- `GET` actions
- actions without explicit guards

This policy protects the frontend from dangerous manifests, but it is not final
authorization. The backend must always validate auth, permissions, and body.

## 7. Declarative renderer

The renderer supports:

- generic declarative pages;
- resource pages;
- read-only resource tables with real data when an endpoint is available;
- readonly settings sections generated from JSON schema;
- base dashboard metric/status/card/list/chart widgets;
- action panel with confirmation modal;
- draft body from schema or selected record;
- path params such as `/items/:id`;
- refetch after successful actions.

The renderer must not contain plugin business logic.

## 8. Declarative actions

An action is UI metadata plus an endpoint binding.

Example:

```ts
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
```

The frontend:

1. shows `Prepare`;
2. opens a modal;
3. generates JSON body;
4. validates JSON syntax;
5. resolves path params from body or row record;
6. sends the SDK request;
7. shows the response;
8. refetches after success.

The backend must still:

- check permissions;
- validate payloads;
- reject unknown fields;
- write audit logs.

## 9. Target API endpoint

The existing diagnostic catalog `/v1/system/plugin-contributions` must not become
the executable UI source.

Runtime admin manifests need a separate endpoint, for example:

```text
GET /admin/extensions
```

Requirements:

- admin auth;
- user permission filtering;
- loaded plugins only;
- backend-validated manifests;
- no secrets;
- endpoints limited to a safe namespace.

## 10. Anti-patterns

Avoid:

- executing absolute endpoints from manifests;
- treating frontend guards as real authorization;
- putting plugin React components into JSON manifests;
- opening the whole `/v1` namespace to declarative policy;
- using `contributions` for standard manifest-driven cases;
- duplicating endpoint policy across frontend and backend without a shared source.

## 11. Tests to know

- `admin-endpoint-policy.test.ts`: endpoint security policy.
- `admin-extension-manifest.test.ts`: sanitize + normalize.
- `admin-declarative-renderers.test.ts`: renderer and action utilities.
- `admin-route-runtime.test.ts`: registry, guards, visibility, actions.

## 12. Current status

Implemented:

- split contracts;
- safe manifest;
- sanitizer;
- modular declarative renderer;
- action controller;
- post-action refetch;
- green tests and build.

Next:

- runtime backend manifest endpoint;
- core-pack exposes admin manifests from backend;
- typed editable forms from schema;
- server-side audit for declarative actions.

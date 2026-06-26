# @trinacria-cms/admin-kernel

Shared backoffice kernel for Trinacria CMS.

This package owns the runtime behavior of the CMS backoffice. Host applications
should stay thin and provide only CSS/theme, local module registration and
mount-time API base configuration.

## Responsibilities

`admin-kernel` owns:

- admin contracts and manifest types
- shell bootstrap
- SDK initialization
- official baseline admin routes
- runtime discovery and session bootstrap
- capability-aware admin registry
- declarative admin manifest normalization
- endpoint security policy for declarative surfaces
- standard declarative renderers for pages, resources, widgets, settings and actions
- plugin runtime operations UI driven by backend `operations[]`
- plugin source, dependency, failure and lifecycle event diagnostics

It does not own:

- backend authorization
- plugin business logic
- Mongo/repository access
- visual primitives that belong in `trinacria-ui`
- the authoritative runtime list of plugin admin manifests

## Admin manifest pipeline

Raw plugin admin manifests must not be mounted directly.

```text
AdminExtensionManifest raw
  -> sanitizeAdminExtensionManifest(raw)
  -> SafeAdminExtensionManifest
  -> normalizeAdminExtensionManifest(safe)
  -> RenderableAdminContribution
  -> buildAdminRegistry(...)
  -> AdminShell + declarative renderers
```

Use `normalizeSafeAdminExtensionManifest(raw)` or
`normalizeSafeAdminExtensionManifests(raw[])` for the safe convenience path.

Use `normalizeAdminExtensionManifest(safe)` only when the input is already a
`SafeAdminExtensionManifest`.

## Manifest vs contributions

`manifests` are the primary scalable plugin channel. They are serializable and
can come from a backend API.

`contributions` are a React escape hatch for local/non-serializable UI.

Use `manifests` for standard pages, menu items, resources, dashboard widgets,
settings sections and declarative actions.

Use `contributions` only for custom React surfaces that cannot be represented by
the declarative contract.

## Source layout

```text
src/contracts/
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

src/runtime/
  admin-endpoint-policy.ts
  admin-manifest-sanitizer.ts
  admin-extension-manifest.ts
  admin-route-runtime.ts

src/declarative/
  components/
  hooks/
  utils/
  types.ts
  index.ts
```

Compatibility barrels remain available:

- `src/contracts.ts`
- `src/declarative/admin-declarative-renderers.tsx`

New code should prefer the domain entrypoints.

## Declarative endpoint security

The default endpoint policy accepts only relative paths under `/admin`.

The policy blocks:

- absolute URLs
- protocol-relative URLs
- path traversal
- encoded traversal/slashes
- control characters
- data bindings that are not `GET`
- actions that are `GET`
- unsafe action definitions during manifest sanitization

This is a frontend/runtime safety layer, not final authorization. Backend
endpoints must still enforce auth, permissions, validation, CSRF where needed and
audit logs.

## Documentation

Core specification:
[`docs/cms/specs/core-platform/admin-contribution-resource.md`](../../docs/cms/specs/core-platform/admin-contribution-resource.md)

Manual chapters:

- IT: [`docs/cms/it/0019-admin-manifest-e-backoffice-declarative.md`](../../docs/cms/it/0019-admin-manifest-e-backoffice-declarative.md)
- EN: [`docs/cms/en/0018-admin-manifest-and-declarative-backoffice.md`](../../docs/cms/en/0018-admin-manifest-and-declarative-backoffice.md)

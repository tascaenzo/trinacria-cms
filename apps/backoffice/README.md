# @trinacria-cms/backoffice

Thin host application for the shared Trinacria CMS admin runtime.

## Purpose

- provide the visual host for the backoffice
- own CSS/theme overrides and Vite proxy configuration
- register monorepo-local backoffice modules
- keep shell logic out of the app itself

## Current structure

- `src/backoffice.init.ts`: mount-time configuration such as API base URL and registered modules
- `src/custom-backoffice-modules.ts`: monorepo extension point for custom plugin admin modules
- `src/main.tsx`: single boot file that mounts `@trinacria-cms/admin-kernel`
- `src/index.css`: host-level visual theme

## Shared runtime

The real application logic now lives in `@trinacria-cms/admin-kernel`, which owns:

- official admin routes and pages
- session bootstrap
- runtime discovery
- route registry and visibility logic
- resource registry for plugin-provided admin resources
- SDK initialization

## Routing and deployment

The backoffice uses browser history routing, so internal URLs are clean paths such as
`/users?record=user-123` instead of hash URLs. Vite dev and preview already serve the SPA fallback.

When deploying behind a static server or reverse proxy, configure unknown backoffice paths to return
`index.html`; otherwise refreshing a nested URL can return 404. If the app is mounted under a
subpath, set `VITE_BACKOFFICE_BASE_PATH`, for example `/admin`, so both Vite asset paths and the
runtime router use the same base.

## Planned evolution

1. add real custom plugin backoffice modules through `custom-backoffice-modules.ts`
2. continue moving host-only concerns into configuration contracts instead of local app logic
3. keep the app package thin enough to be replaceable by another host if needed

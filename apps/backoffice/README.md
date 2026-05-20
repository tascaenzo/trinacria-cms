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

## Planned evolution

1. add real custom plugin backoffice modules through `custom-backoffice-modules.ts`
2. continue moving host-only concerns into configuration contracts instead of local app logic
3. keep the app package thin enough to be replaceable by another host if needed

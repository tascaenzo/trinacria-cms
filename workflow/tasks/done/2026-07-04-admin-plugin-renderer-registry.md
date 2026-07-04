# Admin Plugin Renderer Registry

## Obiettivo

Disaccoppiare le UI custom di backoffice dalle pagine generiche usando renderer risolti da
`componentRef`.

## Area

`backoffice`

## Milestone

`M5`

## Scope

- In scope:
  - registry renderer per settings section e dashboard widget
  - sezione custom email templates dichiarata dal manifest `email-pack`
  - permission center dichiarato dal manifest `core-pack`
  - widget dashboard email dichiarato dal manifest `email-pack`
  - discovery/adapters allineati per preservare `componentRef`
- Out of scope:
  - caricamento remoto di bundle UI di terze parti
  - sandbox runtime per UI esterne

## File impattati

- `packages/admin-kernel/src/runtime/admin-renderers.tsx`
- `packages/admin-kernel/src/runtime/admin-route-runtime.ts`
- `packages/admin-kernel/src/runtime/runtime-discovery.ts`
- `packages/admin-kernel/src/pages/settings/`
- `packages/admin-kernel/src/pages/dashboard-widgets/`
- `packages/core-pack/src/plugin/core-pack-admin.manifest.ts`
- `packages/email-pack/src/plugin/email-pack-admin.manifest.ts`

## Check

- `npm run test -w @trinacria-cms/admin-kernel`
- `npm run build`


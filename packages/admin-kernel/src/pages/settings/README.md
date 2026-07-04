# Settings Page

The settings page renders manifest-driven settings sections. Generic sections use the shared form;
advanced sections declare a `componentRef` in their plugin manifest and are resolved by the admin
renderer registry.

## Structure

- `settings-page.tsx` owns page layout, route state, and selected section handling.
- `settings-page.hooks.ts` owns data loading and save orchestration.
- `settings-page.components.tsx` contains generic settings form and sidebar components.
- `components/` contains focused settings UI components such as the plugin permission center.
- `utils/` contains parsing and transformation helpers used by focused components.
- `settings-page.utils.ts` contains generic settings form helpers.

## Custom Renderers

Custom settings UI is selected by `componentRef`, not by hardcoded checks inside the settings page.
Renderer lookup is centralized in `runtime/admin-renderers.tsx`.

The permission center edits the `core-pack:security:plugin_access_grants` setting through the
`core-pack:plugin-permission-center` renderer. The email template editor uses the
`email-pack:email-template-manager` renderer.

When adding another advanced settings surface, keep the generic form generic, declare
`kind: "custom"` and `componentRef` in the plugin manifest, and register the renderer in the admin
renderer registry.

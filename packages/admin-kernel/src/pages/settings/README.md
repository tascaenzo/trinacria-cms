# Settings Page

The settings page renders manifest-driven settings sections. Generic sections use the shared form;
advanced sections declare a `componentRef` in their plugin manifest and are resolved by the admin
renderer registry supplied by registered backoffice modules.

## Structure

- `settings-page.tsx` owns page layout, route state, and selected section handling.
- `settings-page.hooks.ts` owns data loading and save orchestration.
- `settings-page.components.tsx` contains generic settings form and sidebar components.
- `components/` contains focused settings UI components such as the plugin permission center.
- `utils/` contains parsing and transformation helpers used by focused components.
- `settings-page.utils.ts` contains generic settings form helpers.

## Custom Renderers

Custom settings UI is selected by `componentRef`, not by hardcoded checks inside the settings page.
Renderer lookup flows through `runtime/admin-renderers.tsx`, but plugin-owned renderers should be
exported by the plugin package and passed through its `BackofficeModule.renderers` entry.

The permission center edits the `core-pack:security:plugin_access_grants` setting through the
kernel-owned `core-pack:plugin-permission-center` renderer. The email template editor is owned by
`email-pack` and is registered by the email backoffice module through
`email-pack:email-template-manager`.

When adding another advanced settings surface, keep the generic form generic, declare
`kind: "custom"` and `componentRef` in the plugin manifest, then export the renderer from the plugin
admin entrypoint and attach it to that plugin's `BackofficeModule.renderers`.

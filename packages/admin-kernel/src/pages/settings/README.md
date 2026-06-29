# Settings Page

The settings page renders manifest-driven settings sections and the core plugin permission center.

## Structure

- `settings-page.tsx` owns page layout, route state, and selected section handling.
- `settings-page.hooks.ts` owns data loading and save orchestration.
- `settings-page.components.tsx` contains generic settings form and sidebar components.
- `components/` contains focused settings UI components such as the plugin permission center.
- `utils/` contains parsing and transformation helpers used by focused components.
- `settings-page.utils.ts` contains generic settings form helpers.

## Permission Center

The permission center edits the `core-pack:security:plugin_access_grants` setting. It is displayed
inside the security settings section but isolated in `components/plugin-permission-center.tsx` so the
generic settings form stays small.

When adding another advanced settings widget, keep the generic form generic and place custom UI in
`components/` with parsing helpers in `utils/`.

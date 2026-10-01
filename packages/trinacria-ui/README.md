# @trinacria-cms/trinacria-ui

Private React primitives and shell components for the Trinacria CMS backoffice.

Design goals:

- no external component library lock-in
- Tailwind as a styling engine, not as a design system
- components stay in-repo and are fully inspectable
- the shell remains plugin-aware and capability-aware

Operational notes:

- import `@trinacria-cms/trinacria-ui/theme.css` from host apps before app-local CSS
- `trinacria-ui` owns tokens, primitives and reusable backoffice presentation patterns
- `admin-kernel` owns routing, runtime logic, capability-aware flows and page business logic
- Storybook lives inside this package and can be started with `npm run storybook -w @trinacria-cms/trinacria-ui`
- the canonical visual reference lives in `src/foundations/foundations.mdx`

Component convention:

- package taxonomy:
  - `src/components/primitives/**`: low-level presentation building blocks
  - `src/components/atoms/**`: isolated UI controls and small display elements
  - `src/components/molecules/**`: composed backoffice patterns built from atoms/primitives
  - `src/components/organisms/**`: data tables and composed resource layouts
  - `src/shell/**`: application frame components
  - `src/foundations/**`: tokens and design foundations
- every reusable unit lives in its own folder
- expected files:
  - `component.tsx`
  - `component.types.ts`
  - `component.stories.tsx`
  - `component.mdx`
  - `index.ts`
- foundations live under `src/foundations/**`

Shared CMS patterns:

- `PageCanvas`: consistent page width and spacing (`full`, `form`, `document`).
- `CenteredPanel`: authentication and MFA presentation, with plain title/description/children.
- `Toolbar`, `ToolbarButton`, `ToolbarSelect`: compact editor actions with accessible labels.
- `ContextMenu`, `ContextMenuItem`, `ContextMenuSeparator`: themed contextual actions and keyboard navigation.
- `IconTile`: semantic icon surfaces that follow light/dark/accent tokens.

Usage and adoption rules: [design system guide](../../docs/trinacria-ui-design-system.md).

Tailwind integration:

- Tailwind 4.3 sources are declared in host CSS and `.storybook/storybook.css` with `@source`.
- No `tailwind.config.ts` is used; shared visual tokens live in `theme.css`.
- Use `bg-(--color-panel)`, `text-(--color-ink)` and `shadow-(--shadow-surface)`.
- Use `wrap-break-word`, `bg-linear-to-*` and accessible `outline-hidden` where appropriate.
- Destructive actions use `Button variant="danger"`.
- Run `npm run ui:guardrails` and `npm run check` from the repository root. Build the app
  and Storybook sequentially to avoid overlapping SDK generation.

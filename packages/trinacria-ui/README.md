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

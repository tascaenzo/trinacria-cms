# Trinacria UI Design System

## Scope

`packages/trinacria-ui` is the internal design system for the Trinacria backoffice.

It owns:

- shared visual tokens and theme primitives
- reusable base components
- reusable backoffice presentation patterns
- Storybook stories and MDX docs for components and patterns
- the canonical foundations reference under `src/foundations/foundations.mdx`

It does not own:

- route wiring
- capability checks
- SDK calls
- runtime business logic
- page-specific orchestration

Those responsibilities stay in `packages/admin-kernel`.

## Adoption rules

Create or move code into `trinacria-ui` when:

- the component is presentational and receives plain props
- the same pattern appears in at least two backoffice screens
- the component does not import runtime contracts from `admin-kernel`

Keep code in `admin-kernel` when:

- it depends on capabilities, routing or auth state
- it calls the SDK directly
- it is tightly coupled to a single business page

## Theme usage

Host apps must load the shared theme before app-local CSS.

Current monorepo integration:

```ts
import "../../../packages/trinacria-ui/theme.css";
import "./index.css";
```

## Storybook rules

The canonical visual rules now live in:

- `packages/trinacria-ui/src/foundations/foundations.mdx`

- every new reusable primitive added to `trinacria-ui` should ship with at least one Storybook story
- every reusable component should also ship with its own MDX page and dedicated `*.types.ts`
- states that matter operationally should be documented: loading, empty, error, disabled, dense mobile layouts
- stories should reflect real backoffice scenarios, not decorative demos

## Component filesystem contract

Taxonomy:

- `src/components/primitives/**`: presentation primitives such as text, eyebrow and panel
- `src/components/atoms/**`: small standalone UI units such as button, badge, input and icon
- `src/components/molecules/**`: composed patterns such as card, dialog, feedback and page sections
- `src/shell/**`: app frame structures like `AdminShell`
- `src/foundations/**`: theme and token foundations

Each reusable component should follow this structure:

```text
src/components/<component>/
  <component>.tsx
  <component>.types.ts
  <component>.stories.tsx
  <component>.mdx
  index.ts
```

Foundations should use the same co-located documentation approach under `src/foundations/**`.

## Current M3.5 extraction

Promoted into `trinacria-ui` during M3.5:

- shared theme tokens
- feedback blocks
- mobile record patterns
- page header and action bar primitives

The next extraction target should be table wrappers and filter/action layouts reused by `users`, `roles`, `permissions`, `settings` and `plugins`.

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

Those responsibilities stay in `packages/admin-kernel` or in the owning domain pack.

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
- `src/components/organisms/**`: resource tables and composed data layouts
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

## Componenti disponibili e adozione attuale

La fondazione introdotta in M3.5 comprende:

- shared theme tokens
- feedback blocks
- mobile record patterns
- page header and action bar primitives

Le tabelle e i layout di risorsa sono già disponibili tramite `DataTable`, `ResourceTable`,
`ResourcePage` e `PageHeader`. Per i nuovi flussi riusare questi componenti; promuovere
un nuovo pattern solo quando le API esistenti non coprono una necessità ricorrente.

## Componenti unificati — 1 ottobre 2026

La logica di dominio rimane nei pack; i pattern visuali ricorrenti sono API pubbliche di
`@trinacria-cms/trinacria-ui`.

| Esigenza | Componente | Scelta essenziale |
| --- | --- | --- |
| Liste e panoramiche | ResourcePage, PageHeader, DataTable | Layout a larghezza piena |
| Pagine di dettaglio | PageCanvas, FormSection, DetailSection | width form oppure document |
| Accesso e MFA | CenteredPanel | title, description e children |
| Azioni compatte | Toolbar, ToolbarButton, ToolbarSelect | label obbligatoria; normali eventi React |
| Menu a tasto destro | ContextMenu, ContextMenuItem, ContextMenuSeparator | x/y, label e onClose |
| Icona su superficie | IconTile | icon, tone, size; label solo se informativa |
| Feedback | ErrorBanner, FeedbackBanner, ToastProvider | Errori persistenti inline; toast in basso |

Toolbar e menu condividono dimensioni, focus, disabled, selezione e colori dei token.
Le toolbar supportano `wrap` per i layout più densi. I form continuano a usare Input/Select/Textarea;
ToolbarSelect è riservato alle opzioni compatte degli editor.

ContextMenu conserva il tema del contenitore, limita le coordinate alla viewport e gestisce
focus, frecce, Home/End, Escape e clic esterno. Nel file manager si apre anche con Shift+F10.
DropdownMenu conserva anch'esso i token delle UI incorporate.

L'host include nel build Tailwind tutti i domini, incluso email-pack. I colori fissi sono ammessi
per contenuti esterni e preview di documenti, non per il chrome del CMS. Il guardrail verifica
questa distinzione; il builder workflow usa ora SelectableCard ed è fuori dalle eccezioni.

I nuovi componenti sono documentati nel rispettivo MDX e nelle stories, con tipi dedicati.
I test coprono semantica axe, selezione del testo nell'editor, focus e menu da tastiera.
La compatibilità dei flussi è verificata con la suite browser esistente e le sue estensioni.

Le azioni distruttive usano Button con `variant="danger"`, evitando ricette locali.
L'inserimento di link nell'editor usa Dialog e Input con validazione inline e ripristino
del focus. Le notifiche sono in basso a destra e lasciano cliccabili i contenuti sottostanti;
i loro pulsanti rimangono interattivi. Su mobile le toolbar del testo e del blocco occupano
righe distinte, verificate nei test browser.

## Tailwind 4.3 — sintassi e compatibilità

La configurazione attiva è CSS: `@import "tailwindcss" source(none)` e `@source`
nel backoffice e in Storybook. I vecchi `tailwind.config.ts`, non caricati, sono stati rimossi.
I token condivisi rimangono in `theme.css`; usare `bg-(--color-panel)`,
`text-(--color-ink)` e `shadow-(--shadow-surface)` per riferirli.

Usare `wrap-break-word` per le parole lunghe, `bg-linear-to-*` per i gradienti
ed `outline-hidden` per mantenere l'outline accessibile in modalità forced colors.
`rounded-sm` e `shadow-sm` sono nomi validi in v4 e conservano le dimensioni attuali.
Il guardrail `check-tailwind-compatibility.mjs` impedisce la reintroduzione della
sintassi precedente ed è incluso in `npm run ui:guardrails` e nel check completo.

Riferimento: [guida ufficiale alla migrazione](https://tailwindcss.com/docs/upgrade-guide).

## Esempio di composizione

Le API pubbliche sono esportate dalla radice del package. Il dominio conserva le callback
che leggono o salvano dati; i componenti UI ricevono proprietà semplici.

```tsx
import { Button, PageCanvas, Toolbar, ToolbarButton } from "@trinacria-cms/trinacria-ui";

<PageCanvas width="form">
  <Toolbar label="Azioni contenuto" wrap>
    <ToolbarButton label="Anteprima" icon="eye" onClick={openPreview} />
  </Toolbar>
  <Button variant="danger" onClick={openDeleteDialog}>Elimina</Button>
</PageCanvas>
```

PageCanvas rende un `div`: il landmark principale appartiene alla shell. `full` è la
larghezza predefinita, `form` usa `max-w-6xl`, `document` usa `max-w-3xl`.
IconTile è decorativo senza `label`; specificare `label` solo se l'icona comunica informazioni
non già presenti nel testo. ContextMenu riceve coordinate viewport e una callback `onClose`;
il pack decide quali azioni sono consentite.

## Verifiche per contribuire alla UI

Dalla radice eseguire `npm run ui:guardrails` e `npm run check`, poi `npm run build`
e `npm run storybook:build`. Eseguire build/check in sequenza: la generazione SDK modifica
sorgenti condivise e non deve sovrapporsi a un altro processo di build/typecheck.
Verificare i pattern interessati in tema light/dark e su viewport mobile. Le suite con servizi
reali e gli E2E richiedono l'infrastruttura descritta nel README del progetto.

I guardrail coprono controlli/superfici native, etichette di salvataggio, presenza delle stories,
sintassi Tailwind e confini runtime dei pack. Le eccezioni per editor e preview documentali
rimangono esplicite in `scripts/check-admin-ui-primitives.mjs`.

# Coerenza UI del CMS e componenti condivisi

Stato: `completed`

## Risultato

- API pubbliche semplici in trinacria-ui: Toolbar/Button/Select, ContextMenu/Item/Separator,
  IconTile, PageCanvas e CenteredPanel, con tipi dedicati, stories e MDX.
- Adozione in login/MFA, dettagli editoriali, editor di blocchi/testo, workflow e file manager.
- Token semantici per superfici, focus, selezione, stato e azioni distruttive.
- Dialog per link con validazione e ritorno del focus; menu da tastiera e portal nel tema locale.
- Toolbar mobile separate, notifiche in basso e clic sui contenuti preservati.
- Tailwind include email-pack; guardrail contro palette amministrative locali.

## Verifica

- `npm run check`: format, lint, guardrail, typecheck, dipendenze e confini verdi;
  463 test ordinari passati (integrazioni con flag non abilitate).
- Build: 12 task passati; bundle principale circa 400 kB.
- Storybook: 11 task passati.
- Suite browser: 17 scenari Chromium passati, incluso rich text/link e menu da tastiera.
- Verifica visuale light/dark e viewport mobile da 390 px; test focus e accessibilità axe.

Le superfici specialistiche per contenuti e preview conservano la propria struttura.

# Specifica confini core plugin-first

## Meta

- ID: `2026-05-20-plugin-first-core-boundaries-spec`
- Stato: `done`
- Area: `docs`
- Milestone: `M4.0`
- Owner: `enzo`
- Creato il: `2026-05-20`
- Ultimo aggiornamento: `2026-05-20`

## Obiettivo

Definire in modo operativo cosa appartiene a Trinacria, al CMS kernel, a
`core-pack` e ai plugin dominio.

## Contesto

Il progetto usa Trinacria come libreria/framework base. La documentazione deve
evitare che il CMS kernel replichi responsabilita gia coperte da Trinacria o che
`core-pack` diventi un contenitore di domini applicativi.

## Scope

- In scope: boundary framework/CMS/plugin
- In scope: responsabilita per package
- In scope: regole per decidere dove mettere una nuova funzionalita
- Out of scope: implementazione o refactor codice

## Deliverable

- `docs/cms/specs/core-platform/core-boundaries.md`
- eventuale aggiornamento di glossary o README se emergono termini nuovi

## File o aree impattate

- `docs/cms/specs/core-platform/core-boundaries.md`
- `docs/cms/GLOSSARY.md`
- `README.md`

## Check da eseguire

- `npx prettier --check docs workflow README.md`

## Note operative

La specifica deve contenere esempi concreti: auth nel core-pack, domini in plugin,
HTTP/schema in Trinacria.

## Chiusura

- Changelog aggiornato: `yes`
- Documentazione aggiornata: `yes`
- Follow-up aperti:
  - Separare i task dominio esistenti dalla milestone core attiva.

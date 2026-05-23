# Specifica confini core plugin-first

## Obiettivo

Definire in modo operativo cosa appartiene a Trinacria, al CMS kernel, a
`core-pack` e ai plugin dominio.

## Scope

- In scope: boundary framework/CMS/plugin
- In scope: responsabilita per package
- In scope: regole per decidere dove mettere una nuova funzionalita
- Out of scope: implementazione o refactor codice

## File o aree impattate

- `docs/cms/specs/core-platform/core-boundaries.md`
- `docs/cms/GLOSSARY.md`
- `README.md`

## Check da eseguire

- `npx prettier --check docs workflow README.md`

# Fondazioni visuali e token `admin-ui`

## Meta

- ID: `task-admin-ui-foundations-tokens`
- Stato: `in-progress`
- Area: `backoffice`
- Milestone: `M3.5`
- Owner: `enzo`
- Creato il: `2026-04-10`
- Ultimo aggiornamento: `2026-04-10`

## Obiettivo

Definire le fondazioni visuali condivise del backoffice: token, palette, spaziature, superfici, tipografia e stati semantici.

## Contesto

Un design system senza fondazioni esplicite tende a degenerare in componenti esteticamente simili ma non governati. `M3.5` deve partire dalle regole di base, non dalle sole stories.

## Scope

- In scope: token colore
- In scope: typography scale
- In scope: spacing/radius/shadow
- In scope: stati semantici (`success`, `warning`, `error`, `info`, `neutral`)
- Out of scope: redesign totale del backoffice

## Deliverable

- set di token condivisi
- convenzioni CSS/TS per usare i token
- base documentata per componenti e Storybook

## File o aree impattate

- `packages/trinacria-ui/src/**`
- `apps/backoffice/src/index.css`
- eventuale configurazione Storybook futura

## Dipendenze

- audit dei confini `admin-ui`

## Check da eseguire

- `npm run build -w @trinacria-cms/trinacria-ui`
- `npm run build -w @trinacria-cms/backoffice`

## Note operative

I token devono essere scelti per il progetto reale, non come libreria generica astratta.

Avanzamento iniziale:

- creato `packages/trinacria-ui/theme.css` come fonte condivisa di token tipografici, cromatici, spaziature, raggi e ombre
- rimosso il duplicato dei token da `apps/backoffice/src/index.css`
- host backoffice riallineato al tema condiviso

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:
  - valutare se rendere l'import tema consumabile via subpath package senza path relativo monorepo

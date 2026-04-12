# Documentazione `admin-ui` e regole di adozione

## Meta

- ID: `task-admin-ui-docs-adoption-rules`
- Stato: `in-progress`
- Area: `docs`
- Milestone: `M3.5`
- Owner: `enzo`
- Creato il: `2026-04-10`
- Ultimo aggiornamento: `2026-04-10`

## Obiettivo

Definire le regole con cui il team usa `admin-ui`, Storybook e i pattern composti nel backoffice.

## Contesto

Senza regole di adozione, anche un buon design system tende a essere bypassato nelle nuove schermate.

## Scope

- In scope: linee guida su dove mettere nuovi componenti
- In scope: regole minime per stories e componenti nuovi
- In scope: integrazione con il workflow operativo
- Out of scope: guida di branding esterna o manuale marketing

## Deliverable

- documento di adozione
- regole minime per aggiunta/modifica componenti
- allineamento tra `admin-ui`, Storybook e `admin-kernel`

## File o aree impattate

- `packages/trinacria-ui/**`
- `README.md`
- `docs/**`
- `workflow/**`

## Dipendenze

- setup Storybook e storie principali presenti

## Check da eseguire

- review manuale documentazione
- coerenza con struttura repo e workflow

## Note operative

Il risultato deve dire chiaramente:

- quando creare un componente in `admin-ui`
- quando tenere qualcosa in `admin-kernel`
- quando una story e obbligatoria
- come evitare duplicazione di pattern UI

Avanzamento iniziale:

- aggiunto `docs/trinacria-ui-design-system.md`
- aggiornato `packages/trinacria-ui/README.md`
- aggiornato `README.md` root con riferimento al design system e comando Storybook

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

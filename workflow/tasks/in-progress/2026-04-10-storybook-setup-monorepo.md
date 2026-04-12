# Setup Storybook nel monorepo

## Meta

- ID: `task-storybook-setup-monorepo`
- Stato: `in-progress`
- Area: `infra`
- Milestone: `M3.5`
- Owner: `enzo`
- Creato il: `2026-04-10`
- Ultimo aggiornamento: `2026-04-10`

## Obiettivo

Introdurre Storybook come ambiente ufficiale per sviluppo, ispezione e documentazione dei componenti `admin-ui`.

## Contesto

La richiesta e di fare le cose per bene e avere le stories dei componenti. Prima bisogna creare un setup Storybook che si integri bene con il monorepo e con la toolchain esistente.

## Scope

- In scope: installazione e configurazione Storybook
- In scope: integrazione con workspace monorepo
- In scope: supporto a `admin-ui` e ai pattern composti
- Out of scope: deployment esterno della doc UI, se non richiesto

## Deliverable

- Storybook eseguibile localmente
- convenzione di cartelle stories
- script package/root coerenti

## File o aree impattate

- `package.json`
- `packages/trinacria-ui/**`
- eventuali config Storybook in root o package dedicato

## Dipendenze

- decisione su dove vivere Storybook nel monorepo

## Check da eseguire

- script Storybook avviabile
- build Storybook se prevista
- `npm run build`

## Note operative

Preferire una configurazione semplice e mantenibile: Storybook deve servire allo sviluppo del progetto, non diventare un secondo sistema complesso.

Avanzamento iniziale:

- aggiunti script `storybook` e `storybook:build`
- aggiunta configurazione in `apps/backoffice/.storybook`
- Storybook agganciato alla stessa pipeline CSS/Tailwind del backoffice host
- dipendenze Storybook dichiarate, ma installazione locale ancora da verificare

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

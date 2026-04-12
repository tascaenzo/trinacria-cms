# Stories Storybook per componenti base `admin-ui`

## Meta

- ID: `task-storybook-core-components`
- Stato: `in-progress`
- Area: `backoffice`
- Milestone: `M3.5`
- Owner: `enzo`
- Creato il: `2026-04-10`
- Ultimo aggiornamento: `2026-04-10`

## Obiettivo

Documentare in Storybook i componenti base del design system, mostrando stati reali, varianti e casi edge rilevanti per il backoffice.

## Contesto

Uno Storybook utile non si limita a mostrare componenti “belli”: deve far vedere gli stati che servono davvero a chi sviluppa il backoffice.

## Scope

- In scope: stories per componenti base
- In scope: varianti e stati
- In scope: casi edge principali
- Out of scope: pattern complessi di pagina

## Deliverable

- stories dei componenti base
- documentazione minima dentro Storybook
- coverage utile per sviluppo reale

## File o aree impattate

- `packages/trinacria-ui/**`
- configurazione Storybook

## Dipendenze

- Storybook attivo
- componenti base consolidati

## Check da eseguire

- avvio Storybook
- review manuale delle stories
- eventuale build Storybook

## Note operative

Ogni componente dovrebbe avere almeno:

- stato base
- varianti principali
- stato disabled/error/loading se applicabile

Avanzamento iniziale:

- create stories per `Button`
- create stories per controlli form
- create stories per superfici come `Card`, `Dialog` e `JsonView`

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

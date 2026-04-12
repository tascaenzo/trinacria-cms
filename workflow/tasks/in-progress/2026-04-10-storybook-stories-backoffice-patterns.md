# Stories Storybook per pattern composti backoffice

## Meta

- ID: `task-storybook-backoffice-patterns`
- Stato: `in-progress`
- Area: `backoffice`
- Milestone: `M3.5`
- Owner: `enzo`
- Creato il: `2026-04-10`
- Ultimo aggiornamento: `2026-04-10`

## Obiettivo

Documentare in Storybook i pattern composti del backoffice, così da avere un catalogo vivo dei layout e delle interazioni riusabili.

## Contesto

Per evitare che il design system resti fermo ai componenti atomici, bisogna mostrare anche i pattern di pagina e di composizione che useremo in `M4` e `M5`.

## Scope

- In scope: stories per pattern composti
- In scope: scenari realistici di utilizzo
- In scope: varianti desktop/mobile se necessarie
- Out of scope: intere pagine business complete

## Deliverable

- stories per pattern composti
- esempi realistici di screen block
- riferimento concreto per sviluppo contenuti

## File o aree impattate

- `packages/trinacria-ui/**`
- configurazione Storybook

## Dipendenze

- pattern composti definiti
- Storybook attivo

## Check da eseguire

- avvio Storybook
- review manuale delle stories

## Note operative

Le storie devono assomigliare a pezzi veri del backoffice, non a demo astratte.

Avanzamento iniziale:

- aggiunte stories per pattern mobile di lista record
- aggiunte stories per feedback operativi (`ErrorBanner`, `EmptyState`)
- aggiunto scenario con `PageHeader` e `ActionBar`

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

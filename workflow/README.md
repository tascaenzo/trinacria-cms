# Workflow Operativo

Questa directory definisce il workflow operativo del progetto per continuare lo sviluppo in modo ordinato.

## Struttura

- `tasks/todo`: task pronti da pianificare o sviluppare
- `tasks/in-progress`: task attualmente in lavorazione
- `tasks/done`: task completati e chiusi
- `changelog`: log operativo incrementale delle modifiche concluse
- `milestones`: gruppi di task che definiscono una fase di lavoro coerente

## Regole operative

1. Ogni nuovo lavoro nasce come file Markdown in `tasks/todo`.
2. Quando il lavoro parte, il file va spostato in `tasks/in-progress`.
3. Quando il lavoro e concluso, il file va spostato in `tasks/done`.
4. Alla chiusura di ogni task bisogna:
   - aggiornare il changelog della milestone in `workflow/changelog/M<n>-<slug>.md`
   - allineare la documentazione tecnica toccata dal task
   - annotare nel task i file modificati e gli eventuali follow-up
5. Le milestone sono contenitori di task. Una milestone si considera chiusa quando tutti i task collegati sono in `done`.

## Convenzione task

Formato nome file:

`YYYY-MM-DD-<area>-<slug>.md`

Esempio:

`2026-04-06-admin-allineamento-sdk-utenti.md`

## Flusso consigliato

1. Definire milestone attiva in `milestones/`
2. Scrivere o aggiornare i task in `tasks/todo`
3. Spostare in `tasks/in-progress` solo il task realmente aperto
4. Consegnare il task con codice, test e documentazione coerenti
5. Aggiornare changelog e spostare il task in `tasks/done`

## Definizione di done

Un task e `done` solo se:

- il codice e allineato con l'obiettivo del task
- i check rilevanti sono stati eseguiti oppure e esplicitato cosa manca
- il changelog della milestone e aggiornato
- la documentazione toccata dal task e stata riallineata
- sono stati annotati eventuali debiti residui o task successivi

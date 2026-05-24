# Workflow Operativo

## Struttura

```
tasks/todo/                   — task pronti
tasks/done/                   — task completati
tasks/backlog/                — task futuri non prioritari
tasks/TEMPLATE.md             — template task
changelog/CHANGELOG.md        — log per milestone
milestones/                   — milestone attive e completate
milestones/TEMPLATE.md        — template milestone
```

## Regole

1. Ogni nuovo lavoro nasce come file in `tasks/todo/`.
2. Quando completato, spostare in `tasks/done/` e aggiornare il changelog della milestone in `changelog/CHANGELOG.md`.
3. Allineare la documentazione tecnica toccata dal task e annotare eventuali follow-up.
4. Una milestone si chiude quando tutti i task collegati sono in `done/`.

## Formato nome file task

`YYYY-MM-DD-<area>-<slug>.md` — es. `2026-04-06-admin-allineamento-sdk-utenti.md`

## Definizione di done

- codice allineato con l'obiettivo del task
- check rilevanti passati (o debito esplicitato)
- changelog aggiornato
- documentazione allineata

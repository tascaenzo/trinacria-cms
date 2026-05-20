# Riallineamento workflow milestone plugin-first

## Meta

- ID: `2026-05-20-workflow-milestone-realignment`
- Stato: `done`
- Area: `docs`
- Milestone: `M4.0`
- Owner: `enzo`
- Creato il: `2026-05-20`
- Ultimo aggiornamento: `2026-05-20`

## Obiettivo

Riallineare milestone e task esistenti alla nuova direzione core-platform
plugin-first.

## Contesto

I task M4/M5 esistenti parlano ancora di content model/editorial workflow come
se fossero naturale espansione del core. Per ora devono uscire dalla milestone
attiva: prima si specifica la piattaforma core, poi si riapriranno i domini come
milestone separate.

## Scope

- In scope: rinominare/aggiornare milestone M4/M5 se necessario
- In scope: aggiornare task todo esistenti
- In scope: spostare task dominio non attivi in backlog
- In scope: aggiornare changelog operativo
- Out of scope: chiudere task non svolti

## Deliverable

- milestone M4/M5 coerenti
- task dominio separati dalla milestone core
- `workflow/tasks/todo` focalizzata su M4.0 core
- changelog aggiornato

## File o aree impattate

- `workflow/milestones/*`
- `workflow/tasks/todo/*`
- `workflow/changelog/CHANGELOG.md`

## Check da eseguire

- `npx prettier --check workflow`

## Note operative

Non cancellare task storici senza motivazione: meglio aggiornarne titolo e scope.

## Chiusura

- Changelog aggiornato: `yes`
- Documentazione aggiornata: `yes`
- Follow-up aperti:
  - Riaprire i task dominio solo dopo la chiusura delle specifiche core.

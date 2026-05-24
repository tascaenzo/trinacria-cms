# Riallineamento workflow milestone plugin-first

## Obiettivo

Riallineare milestone e task esistenti alla nuova direzione core-platform
plugin-first.

## Scope

- In scope: rinominare/aggiornare milestone M4/M5 se necessario
- In scope: aggiornare task todo esistenti
- In scope: spostare task dominio non attivi in backlog
- In scope: aggiornare changelog operativo
- Out of scope: chiudere task non svolti

## File o aree impattate

- `workflow/milestones/*`
- `workflow/tasks/todo/*`
- `workflow/changelog/CHANGELOG.md`

## Check da eseguire

- `npx prettier --check workflow`

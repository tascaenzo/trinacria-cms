# Smoke baseline backoffice e playground

## Meta

- ID: `task-backoffice-playground-smoke`
- Stato: `done`
- Area: `backoffice`
- Milestone: `M1`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Verificare e stabilizzare l'avvio minimo del playground API e del backoffice, distinguendo errori di applicazione da limiti dell'ambiente locale.

## Contesto

Dalla ricognizione iniziale il backend appare vicino alla baseline verde, mentre il backoffice e bloccato da incoerenze contrattuali e il comando `dev` del playground e influenzato dal sandbox.

## Scope

- In scope: verifica dei comandi di avvio minimi
- In scope: identificazione dei prerequisiti locali reali
- In scope: documentazione dei smoke check di ripartenza
- Out of scope: redesign del bootstrap applicativo

## Deliverable

- checklist di avvio locale affidabile
- evidenza dei punti di rottura residui
- eventuali fix minimi ai comandi di start

## File o aree impattate

- `apps/playground/**`
- `apps/backoffice/**`
- `README.md`
- `workflow/changelog/CHANGELOG.md`

## Dipendenze

- Mongo locale disponibile
- task di riallineamento contratti utenti in corso o chiuso

## Check da eseguire

- `docker compose ps`
- `npm run build -w @trinacria-cms/playground`
- `npm run typecheck -w @trinacria-cms/backoffice`
- `npm run dev -w @trinacria-cms/playground`
- `npm run dev -w @trinacria-cms/backoffice`

## Note operative

Annotare esplicitamente se un problema dipende da codice, da toolchain o da limiti del terminale/sandbox.

## Chiusura

- Changelog aggiornato: `si`
- Documentazione aggiornata: `si`
- File modificati:
  - `README.md`
  - `workflow/changelog/CHANGELOG.md`
- Follow-up aperti:
  - nel sandbox del terminale i comandi `dev` possono fallire con `EPERM`; usare esecuzione locale standard per la verifica finale operativa

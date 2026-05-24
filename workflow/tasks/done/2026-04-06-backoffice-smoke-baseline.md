# Smoke baseline backoffice e playground

## Obiettivo

Verificare e stabilizzare l'avvio minimo del playground API e del backoffice, distinguendo errori di applicazione da limiti dell'ambiente locale.

## Scope

- In scope: verifica dei comandi di avvio minimi
- In scope: identificazione dei prerequisiti locali reali
- In scope: documentazione dei smoke check di ripartenza
- Out of scope: redesign del bootstrap applicativo

## File o aree impattate

- `apps/playground/**`
- `apps/backoffice/**`
- `README.md`
- `workflow/changelog/CHANGELOG.md`

## Check da eseguire

- `docker compose ps`
- `npm run build -w @trinacria-cms/playground`
- `npm run typecheck -w @trinacria-cms/backoffice`
- `npm run dev -w @trinacria-cms/playground`
- `npm run dev -w @trinacria-cms/backoffice`

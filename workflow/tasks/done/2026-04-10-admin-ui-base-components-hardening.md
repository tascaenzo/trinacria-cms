# Hardening componenti base `admin-ui`

## Meta

- ID: `task-admin-ui-base-hardening`
- Stato: `in-progress`
- Area: `backoffice`
- Milestone: `M3.5`
- Owner: `enzo`
- Creato il: `2026-04-10`
- Ultimo aggiornamento: `2026-04-10`

## Obiettivo

Consolidare i componenti base del design system per il backoffice, portandoli a una API stabile e riusabile.

## Contesto

Il progetto usa gia diversi componenti in `admin-ui`, ma prima di scalare il numero di schermate serve completare e stabilizzare l'ossatura di base.

## Scope

- In scope: `Button`, `Input`, `Textarea`, `Select`, `Dialog`, `Badge`, `Card`, `JsonView`
- In scope: stati, varianti, edge case e accessibilita minima
- In scope: allineamento naming e props
- Out of scope: pattern complessi di pagina

## Deliverable

- componenti base stabilizzati
- varianti coerenti
- riduzione di duplicazione lato `admin-kernel`

## File o aree impattate

- `packages/trinacria-ui/src/components/**`
- eventuali consumer in `packages/admin-kernel/src/**`

## Dipendenze

- fondazioni e token definiti

## Check da eseguire

- `npm run build -w @trinacria-cms/trinacria-ui`
- `npm run build -w @trinacria-cms/backoffice`
- `npm run lint`

## Note operative

Quando un componente ha gia un uso reale nel backoffice, preservare i pattern sensati e semplificare solo dove crea chiarezza.

Avanzamento iniziale:

- `Button` esteso con `size` e `isLoading`
- `Badge` riallineato ai token semantici condivisi
- `Input`, `Select` e `Textarea` portano ora `error` e stati disabled piu espliciti
- `Field` completa ora `FieldHint` e `FieldError`
- `Card` espone `CardActions` per footer standardizzati

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

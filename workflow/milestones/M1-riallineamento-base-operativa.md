# M1 - Riallineamento Base Operativa

## Obiettivo

Ripristinare una baseline coerente di sviluppo, con repository, contratti API e backoffice nuovamente allineati e documentazione minima attendibile.

## Perimetro

- allineamento tra `core-pack`, OpenAPI, SDK e `admin-kernel`
- ripristino dei check principali di build e typecheck
- riallineamento documentazione operativa minima

## Task inclusi

- [x] `2026-04-06-admin-allineamento-contratti-utenti.md`
- [x] `2026-04-06-readme-riallineamento-struttura-repo.md`
- [x] `2026-04-06-lint-fix-baseline.md`
- [x] `2026-04-06-backoffice-smoke-baseline.md`

## Dipendenze

- disponibilita di Mongo locale per i test runtime
- decisione sul contratto definitivo utenti: scelta effettuata su `displayName`

## Criterio di chiusura

- `npm run build` torna verde
- `@trinacria-cms/admin-kernel` torna in typecheck verde
- il workflow operativo e usato per chiudere i task della milestone
- la documentazione root non descrive app o percorsi non piu esistenti

## Note

La milestone nasce direttamente dall'analisi iniziale del repository e serve a riportare il progetto in una condizione stabile prima di aggiungere nuove feature.

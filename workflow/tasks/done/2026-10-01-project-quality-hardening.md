# Consolidamento qualità Editorial, Media e progetto

Stato: `completed`

Questo task registra il consolidamento iniziale. Per gli aggiornamenti successivi delle
dipendenze, UI e Tailwind e i risultati complessivi consultare
[stato del progetto](../../../docs/project-quality-status.md). I conteggi e l’audit qui sotto
conservano il risultato della fase iniziale, precedente all’aggiornamento che ha risolto
la segnalazione esbuild.

## Risultato

- Ownership e assegnazione revisori applicate nel servizio e nei filtri prima della paginazione.
- Ripristino dello storico validato sul modello corrente, senza cambiare lo stato di pubblicazione.
- Permesso publish obbligatorio per ogni ingresso/uscita da published, inclusi workflow custom.
- Indice slug parziale con sostituzione sicura dell'indice sparse legacy.
- Entry e storico nella stessa transazione Mongo; conflitti revisioni gestiti tramite locking ottimistico.
- Modifiche incompatibili e cancellazioni dei modelli popolati rifiutate con richiesta di migrazione.
- Canvas/editor e file manager/inspector divisi in moduli con facciate pubbliche conservate.
- Renderer plugin lazy e chunk React condiviso: bundle principale circa 397 kB contro 794 kB.
- Dipendenze frontend dei pack come peer opzionali, verifica automatica dei confini backend/admin.
- Lint ARIA e dipendenze hook attivi; dipendenze axe ripristinate; file generato Storybook rimosso.
- Bootstrap eventi editoriale e apertura diretta delle pagine backoffice corretti.
- File manager mostra il messaggio dell'API invece dell'URL HTTP tecnico negli errori.
- Docker/CI usano un replica set Mongo autenticato per verificare transazioni reali.
- Documentazione di stato e procedure editoriali aggiornate; task storici già implementati riallineati.

## Verifica

- `npm run check`: format, lint, guardrail, typecheck, 460 test passati,
  dipendenze workspace e confini plugin verificati. Quattro integrazioni saltate senza flag,
  eseguite separatamente con Mongo/S3 reali.
- `npm run test:integration -- --force` con flag Mongo/S3: 10 test passati, nessuno saltato.
- `npm run build`: 12 task passati, nessun warning di chunk principale oltre 500 kB.
- `npm run storybook:build -- --force`: 11 task passati.
- `npm run sdk:check`: sorgenti generati coerenti.
- `npm run e2e:ci`: 17/17 scenari Chromium passati (9,1 secondi).

## Limiti espliciti

Editorial richiede un replica set/cluster Mongo con transazioni. Il compose a nodo singolo
è una configurazione di sviluppo, senza alta disponibilità. Migrazioni guidate, tassonomie
dedicate, scheduler di pubblicazione e metodi SDK editoriali generati restano lavoro prodotto
successivo, distinto dalle correzioni di qualità.

Dopo gli aggiornamenti compatibili (incluso Nodemailer 10), l'audit conserva una segnalazione
low su esbuild transitivo di Vite/Storybook: GHSA-g7r4-m6w7-qqqr, server di sviluppo Windows.
Non resta alcuna segnalazione high/moderate/critical. L'aggiornamento forzato fuori dai range
della toolchain non è incluso: richiede una migrazione supportata dai rispettivi pacchetti.

I test hanno usato database e container isolati, senza resettare i dati di sviluppo.

# M3 - Gestione Plugin Operativa

## Obiettivo

Rendere il runtime plugin non solo un'infrastruttura interna, ma una superficie amministrabile e osservabile dal backoffice e dagli strumenti operativi.

## Perimetro

- discovery runtime affidabile e leggibile
- operazioni amministrative plugin esplicite
- diagnostica minima per stato, dipendenze e failure
- documentazione del lifecycle operativo

## Task inclusi

- [x] `2026-04-06-plugin-runtime-contract-review.md`
- [x] `2026-04-06-plugin-operations-api-v1.md`
- [x] `2026-04-06-plugin-admin-page-v1.md`
- [x] `2026-04-06-plugin-runtime-diagnostics-and-errors.md`
- [x] `2026-04-06-plugin-operations-documentation.md`

## Dipendenze

- completamento di `M1`
- disponibilita di discovery runtime stabile
- definizione delle operazioni permesse da admin e da automazione

## Criterio di chiusura

- il sistema espone una fotografia affidabile dei plugin installati, delle capability e dello stato
- esiste almeno una superficie amministrativa per operazioni plugin supportate
- gli errori di lifecycle plugin sono leggibili e diagnosticabili
- il flusso operativo di gestione plugin e documentato

## Note

Questa milestone e il ponte tra il kernel come framework e il CMS come prodotto gestibile.

Stato finale `2026-04-06`:

- checklist task completata;
- runtime, API, backoffice e documentazione condividono la stessa semantica operativa dei plugin;
- hardening sicurezza completato: API plugin/system operative admin-only e route backoffice `plugins` allineata con guard coerente;
- check monorepo finali verdi (`npm run build`, `npm test`, `npm run lint`);
- milestone pronta alla chiusura.

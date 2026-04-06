# M3 - Gestione Plugin Operativa

## Obiettivo

Rendere il runtime plugin non solo un'infrastruttura interna, ma una superficie amministrabile e osservabile dal backoffice e dagli strumenti operativi.

## Perimetro

- discovery runtime affidabile e leggibile
- operazioni amministrative plugin esplicite
- diagnostica minima per stato, dipendenze e failure
- documentazione del lifecycle operativo

## Task inclusi

- [ ] `2026-04-06-plugin-runtime-contract-review.md`
- [ ] `2026-04-06-plugin-operations-api-v1.md`
- [ ] `2026-04-06-plugin-admin-page-v1.md`
- [ ] `2026-04-06-plugin-runtime-diagnostics-and-errors.md`
- [ ] `2026-04-06-plugin-operations-documentation.md`

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

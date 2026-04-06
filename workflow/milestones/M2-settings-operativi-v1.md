# M2 - Settings Operativi V1

## Obiettivo

Trasformare il dominio `settings` da infrastruttura tecnica ben modellata a superficie operativa realmente usabile, con policy chiare, UX admin coerente e documentazione affidabile.

## Perimetro

- definizione esplicita del modello di sicurezza dei settings
- consolidamento backend e contratti API dei settings
- introduzione di una superficie admin operativa per lettura e scrittura controllata
- bootstrap di definizioni settings realistiche e documentate

## Task inclusi

- [x] `2026-04-06-settings-decision-record-sicurezza-e-ownership.md`
- [x] `2026-04-06-settings-backend-hardening-e-contratti.md`
- [x] `2026-04-06-settings-bootstrap-definitions-core-pack.md`
- [x] `2026-04-06-settings-backoffice-write-flow.md`
- [x] `2026-04-06-settings-documentazione-end-to-end.md`

## Dipendenze

- completamento di `M1`
- allineamento tra backend, OpenAPI, SDK e backoffice
- decisione esplicita sul ruolo del backoffice rispetto alla ownership plugin

## Criterio di chiusura

- esiste una decisione architetturale scritta sulle policy dei settings
- le API settings sono coerenti come autenticazione, ownership e shape di response
- il backoffice supporta almeno i principali flussi operativi previsti dalla policy scelta
- esistono definizioni settings reali per i casi d'uso CMS principali
- documentazione e changelog risultano allineati

## Note

Questa milestone non deve introdurre bypass rapidi ai vincoli di ownership. Se la UX admin richiede scrittura, il percorso deve essere progettato in modo coerente con il modello di sicurezza.

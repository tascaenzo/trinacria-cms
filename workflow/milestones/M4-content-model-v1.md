# M4 - Editorial Pack Foundation V1

Stato: `deferred / da rinumerare`

Questa milestone non e attiva e il nome storico e fuorviante: il numero `M4`
ora identifica la fondazione core della piattaforma plugin-first. Questo blocco
editoriale resta in backlog dominio e andra rinumerato quando il core sara
pronto.

## Obiettivo

Introdurre il primo plugin dominio esterno al core: un `editorial-pack`
minimale con contenuti, categorie, validazione e API amministrative minime.

Questa milestone non deve espandere il core. Deve dimostrare che il CMS cresce
con plugin funzionali sopra `kernel`, `core-pack` e Mongo.

## Perimetro

- plugin `editorial-pack`
- modello posts/categories
- persistenza Mongo e contratti DTO
- API amministrative e primi flussi backoffice
- admin contribution e admin resource iniziali

## Task inclusi

- [ ] `workflow/tasks/backlog/2026-04-06-content-domain-adr-and-bounded-context.md`
- [ ] `workflow/tasks/backlog/2026-04-06-content-types-foundation.md`
- [ ] `workflow/tasks/backlog/2026-04-06-content-entries-persistence-and-api.md`
- [ ] `workflow/tasks/backlog/2026-04-06-content-admin-ui-v1.md`
- [ ] `workflow/tasks/backlog/2026-04-06-content-openapi-sdk-and-docs.md`

## Dipendenze

- completamento di `M4 - Core Platform Foundation`
- completamento di `M1`
- preferibilmente completamento di `M2` per sfruttare settings e config in modo coerente
- decisione finale sul package workspace del plugin editoriale

## Criterio di chiusura

- esiste un plugin editoriale formalizzato e documentato
- si possono creare e leggere post/categorie valide
- il dominio e esposto via API e SDK
- il backoffice monta una voce editoriale senza modificare il core

## Note

Questa e la milestone che sposta il progetto da CMS infrastructure a CMS
applicativo, mantenendo pero la filosofia plugin-first.

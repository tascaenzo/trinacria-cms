# M5 - Editorial Workflow V1

Stato: `deferred`

Questa milestone non e attiva. Resta in backlog dominio finche non vengono
chiuse le specifiche core della piattaforma plugin-first in `M4.0` e finche non
viene riaperta una milestone dominio dedicata.

## Obiettivo

Costruire il primo workflow editoriale completo dentro `editorial-pack`:
draft/publish, revisioni, stati e audit minimo.

## Perimetro

- modello stati editoriali
- publish lifecycle
- revisioni/versioning
- flussi admin per bozze e pubblicazione

## Task inclusi

- [ ] `workflow/tasks/backlog/2026-04-06-editorial-state-model.md`
- [ ] `workflow/tasks/backlog/2026-04-06-content-revisions-and-history.md`
- [ ] `workflow/tasks/backlog/2026-04-06-publish-unpublish-api-and-guards.md`
- [ ] `workflow/tasks/backlog/2026-04-06-editorial-backoffice-flow.md`
- [ ] `workflow/tasks/backlog/2026-04-06-editorial-operational-docs.md`

## Dipendenze

- completamento di `M4.0 - Core Platform Specifications`
- completamento di `M4` come plugin editoriale, non come estensione del core
- definizione chiara delle permission editoriali
- presenza di almeno un dominio content type/entry stabile

## Criterio di chiusura

- un contenuto puo vivere almeno i cicli `draft -> published -> updated`
- esistono revisioni leggibili e un minimo di audit operativo
- il backoffice espone flussi editoriali coerenti
- SDK, API e documentazione risultano aggiornati

## Note

La milestone non include ancora pianificazione editoriale avanzata, scheduling o workflow multi-step approvativo: porta il progetto al primo livello editoriale utile.

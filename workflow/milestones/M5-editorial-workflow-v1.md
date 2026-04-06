# M5 - Editorial Workflow V1

## Obiettivo

Costruire il primo workflow editoriale completo sopra il dominio contenuti: draft/publish, revisioni, stati e audit minimo.

## Perimetro

- modello stati editoriali
- publish lifecycle
- revisioni/versioning
- flussi admin per bozze e pubblicazione

## Task inclusi

- [ ] `2026-04-06-editorial-state-model.md`
- [ ] `2026-04-06-content-revisions-and-history.md`
- [ ] `2026-04-06-publish-unpublish-api-and-guards.md`
- [ ] `2026-04-06-editorial-backoffice-flow.md`
- [ ] `2026-04-06-editorial-operational-docs.md`

## Dipendenze

- completamento di `M4`
- definizione chiara delle permission editoriali
- presenza di almeno un dominio content type/entry stabile

## Criterio di chiusura

- un contenuto puo vivere almeno i cicli `draft -> published -> updated`
- esistono revisioni leggibili e un minimo di audit operativo
- il backoffice espone flussi editoriali coerenti
- SDK, API e documentazione risultano aggiornati

## Note

La milestone non include ancora pianificazione editoriale avanzata, scheduling o workflow multi-step approvativo: porta il progetto al primo livello editoriale utile.

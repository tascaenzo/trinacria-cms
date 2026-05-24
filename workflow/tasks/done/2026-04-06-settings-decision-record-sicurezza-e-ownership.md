# Decisione architetturale su sicurezza e ownership dei settings

## Obiettivo

Formalizzare una decisione architetturale chiara su chi puo leggere, scrivere, esportare e rivelare i `settings`, distinguendo admin umano, plugin owner e integrazioni macchina.

## Scope

- In scope: mappa attori -> permessi -> endpoint
- In scope: decisione su letture pubbliche, admin o signed-only
- In scope: decisione su come il backoffice puo operare senza rompere ownership
- Out of scope: implementazione tecnica delle API

## File o aree impattate

- `docs/cms/it/**`
- `docs/cms/en/**`
- eventuale ADR dedicata in `docs/`

## Check da eseguire

- review manuale di `packages/core-pack/src/modules/settings/**`
- review manuale di `packages/admin-kernel/src/pages/settings-page.tsx`

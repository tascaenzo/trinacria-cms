# Decisione architetturale su sicurezza e ownership dei settings

## Meta

- ID: `task-settings-security-ownership-adr`
- Stato: `done`
- Area: `docs`
- Milestone: `M2`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Formalizzare una decisione architetturale chiara su chi puo leggere, scrivere, esportare e rivelare i `settings`, distinguendo admin umano, plugin owner e integrazioni macchina.

## Contesto

I `settings` sono ben modellati lato backend ma il prodotto non ha ancora una policy esplicita e completa sul loro uso operativo. Oggi il backoffice e orientato alla lettura, mentre la scrittura passa da richieste firmate del plugin.

## Scope

- In scope: mappa attori -> permessi -> endpoint
- In scope: decisione su letture pubbliche, admin o signed-only
- In scope: decisione su come il backoffice puo operare senza rompere ownership
- Out of scope: implementazione tecnica delle API

## Deliverable

- documento decisionale architetturale
- matrice attori/operazioni
- elenco implicazioni su SDK, backoffice e moduli plugin

## File o aree impattate

- `docs/cms/it/**`
- `docs/cms/en/**`
- eventuale ADR dedicata in `docs/`

## Dipendenze

- comprensione del controller settings attuale
- comprensione del protocollo `SettingsPluginAuth`

## Check da eseguire

- review manuale di `packages/core-pack/src/modules/settings/**`
- review manuale di `packages/admin-kernel/src/pages/settings-page.tsx`

## Note operative

La decisione deve chiarire almeno:

- chi puo leggere definitions
- chi puo leggere values risolti
- chi puo leggere metadata dei secrets
- chi puo fare reveal
- chi puo scrivere definitions, values, secrets
- se il backoffice agisce come admin puro o come broker di operazioni plugin-aware

## Note operative

Direzione fissata:

- lettura operativa consentita per definizioni, valori risolti e metadata secret mascherati;
- reveal, export e scritture restano owner-scoped tramite `SettingsPluginAuth`;
- il backoffice non agisce come admin onnipotente ma come eventuale broker plugin-aware;
- la UX di scrittura potra arrivare solo senza impersonazione del plugin owner.

## Chiusura

- Changelog aggiornato: `si`
- Documentazione aggiornata: `si`
- File modificati:
  - `docs/cms/it/0013-settings-sicurezza-e-ownership-operativa.md`
  - `docs/cms/en/0013-settings-security-and-operational-ownership.md`
  - `docs/cms/it/0005-core-pack-architettura-file-per-file.md`
  - `docs/cms/en/0005-core-pack-file-by-file.md`
  - `docs/cms/it/README.md`
  - `docs/cms/en/README.md`
- Check eseguiti:
  - review manuale di `packages/core-pack/src/modules/settings/**`
  - review manuale di `packages/admin-kernel/src/pages/settings-page.tsx`
- Follow-up aperti:
  - riallineare controller, OpenAPI e SDK alla matrice di accesso nel task backend successivo

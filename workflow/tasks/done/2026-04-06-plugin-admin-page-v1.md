# Pagina backoffice per gestione plugin V1

## Meta

- ID: `task-plugin-admin-page-v1`
- Stato: `done`
- Area: `backoffice`
- Milestone: `M3`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Creare una superficie admin per osservare e gestire i plugin installati, con stato, capability, dipendenze e azioni supportate.

## Contesto

Senza una pagina plugin il sistema resta leggibile solo da codice o da chiamate dirette agli endpoint di discovery.

## Scope

- In scope: lista plugin
- In scope: dettaglio stato e capability
- In scope: azioni supportate
- In scope: feedback errori/azioni
- Out of scope: plugin marketplace completo

## Deliverable

- route admin plugin
- UI leggibile su desktop e mobile
- integrazione con discovery e API operative

## File o aree impattate

- `packages/admin-kernel/src/**`
- eventuali componenti `packages/admin-ui/src/**`

## Dipendenze

- discovery runtime stabile
- API operative plugin definite

## Check da eseguire

- `npm run typecheck -w @trinacria-cms/admin-kernel`
- `npm run build -w @trinacria-cms/backoffice`

## Note operative

La pagina deve aiutare a rispondere rapidamente a:

- quali plugin sono loaded
- quali sono failed/disabled
- quali capability espongono
- da cosa dipendono

## Chiusura

- Changelog aggiornato: `si`
- Documentazione aggiornata: `si`
- File modificati:
  - `packages/admin-kernel/src/pages/plugins-page.tsx`
  - `packages/admin-kernel/src/contributions/official-admin-contributions.tsx`
  - `packages/admin-kernel/src/i18n/en.json`
  - `packages/admin-kernel/src/i18n/it.json`
  - `docs/cms/it/0011-sdk-api-keys-discovery.md`
  - `docs/cms/en/0011-sdk-api-keys-discovery.md`
  - `workflow/changelog/CHANGELOG.md`
  - `workflow/milestones/M3-gestione-plugin-operativa.md`
- Check eseguiti:
  - `npm run typecheck -w @trinacria-cms/admin-kernel`
  - `npm run build -w @trinacria-cms/backoffice`
- Follow-up aperti:
  - Eventuali filtri avanzati, bulk operations e sorting plugin possono essere aggiunti solo sopra le API gia esposte, senza introdurre semantiche nuove lato UI.

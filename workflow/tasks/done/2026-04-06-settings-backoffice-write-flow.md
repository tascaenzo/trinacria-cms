# Flussi backoffice per i settings operativi

## Meta

- ID: `task-settings-backoffice-write-flow`
- Stato: `done`
- Area: `backoffice`
- Milestone: `M2`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Definire e implementare la prima UX backoffice utile per leggere e, se previsto dalla policy, modificare i settings senza compromettere i vincoli di ownership.

## Contesto

La pagina attuale settings e soprattutto un explorer read-only. Per farne una superficie operativa bisogna trasformarla in un flusso esplicito e sicuro.

## Scope

- In scope: UX di lettura, filtro, ispezione e stato dei settings
- In scope: eventuale write flow coerente con la policy
- In scope: gestione errori e feedback per definitions, values e secrets
- Out of scope: design system nuovo o completo redesign del backoffice

## Deliverable

- pagina settings aggiornata
- interazioni principali funzionanti
- copy e testi i18n coerenti

## File o aree impattate

- `packages/admin-kernel/src/pages/settings-page.tsx`
- `packages/admin-kernel/src/i18n/*.json`
- eventuali componenti `packages/trinacria-ui/src/**`

## Dipendenze

- task di hardening backend settings
- policy finale sui settings

## Check da eseguire

- `npm run typecheck -w @trinacria-cms/admin-kernel`
- `npm run build -w @trinacria-cms/backoffice`

## Note operative

Se il backoffice non puo scrivere direttamente, la UX deve renderlo esplicito e offrire almeno strumenti affidabili di inspection, export e debug.

Direzione applicata:

- la pagina `settings` resta senza write diretto dal browser admin;
- l'ispezione ora carica anche metadata secret mascherati con gestione distinta di `404` e errori reali;
- il dialog di dettaglio prepara un handoff owner-signed per valori non-secret, mostrando endpoint, owner plugin, header richiesti e body JSON;
- il copy i18n rende esplicito che il backoffice prepara il payload ma non firma ne esegue la richiesta.

## Chiusura

- Changelog aggiornato: `si`
- Documentazione aggiornata: `si`
- File modificati:
  - `packages/admin-kernel/src/pages/settings-page.tsx`
  - `packages/admin-kernel/src/i18n/en.json`
  - `packages/admin-kernel/src/i18n/it.json`
  - `docs/cms/it/0013-settings-sicurezza-e-ownership-operativa.md`
  - `docs/cms/en/0013-settings-security-and-operational-ownership.md`
- Check eseguiti:
  - `npm run typecheck -w @trinacria-cms/admin-kernel`
  - `npm run build -w @trinacria-cms/backoffice`
- Follow-up aperti:
  - documentare end-to-end il flusso handoff owner-signed nell'ultimo task M2

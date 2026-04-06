# Flussi backoffice per i settings operativi

## Meta

- ID: `task-settings-backoffice-write-flow`
- Stato: `todo`
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
- eventuali componenti `packages/admin-ui/src/**`

## Dipendenze

- task di hardening backend settings
- policy finale sui settings

## Check da eseguire

- `npm run typecheck -w @trinacria-cms/admin-kernel`
- `npm run build -w @trinacria-cms/backoffice`

## Note operative

Se il backoffice non puo scrivere direttamente, la UX deve renderlo esplicito e offrire almeno strumenti affidabili di inspection, export e debug.

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:

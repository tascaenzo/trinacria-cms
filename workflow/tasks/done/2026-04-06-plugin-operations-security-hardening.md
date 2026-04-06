# Hardening sicurezza plugin operations e route admin plugins

## Meta

- ID: `task-plugin-operations-security-hardening`
- Stato: `done`
- Area: `kernel`
- Milestone: `M3`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Rendere admin-only in modo reale e coerente la superficie plugin operativa introdotta da `M3`, sia lato backend/API sia lato backoffice.

## Contesto

La milestone `M3` ha introdotto discovery, API operative e pagina admin plugin, ma restano due finding `P1`:

- route `kernel` `system/plugins*` esposte senza enforcement admin;
- route backoffice `plugins` visibile senza `guards`.

## Scope

- In scope: enforcement admin sulle route `kernel` plugin/system operative
- In scope: allineamento OpenAPI/SDK
- In scope: guard coerente sulla route backoffice `plugins`
- In scope: documentazione finale del modello di protezione
- Out of scope: redesign auth generale del kernel

## Deliverable

- bridge/middleware admin esplicito e documentato
- route `system/plugins*` e `system/capabilities` protette in modo reale
- route backoffice `plugins` resa coerentemente non visibile fuori dal modello previsto
- docs/changelog/milestone aggiornati

## File o aree impattate

- `packages/kernel/src/**`
- `packages/core-pack/src/modules/auth/**`
- `packages/admin-kernel/src/**`
- `packages/sdk/**`
- `docs/cms/**`
- `workflow/**`

## Check da eseguire

- `npm run build`
- `npm test`
- `npm run lint`

## Chiusura

- Changelog aggiornato: `si`
- Documentazione aggiornata: `si`
- File modificati:
  - `packages/kernel/src/contracts/kernel-admin-route-guard.ts`
  - `packages/kernel/src/contracts/index.ts`
  - `packages/kernel/src/tokens/core-tokens.ts`
  - `packages/kernel/src/http/kernel-system.controller.ts`
  - `packages/kernel/src/runtime/cms-starter.ts`
  - `packages/core-pack/src/modules/auth/auth.module.ts`
  - `packages/core-pack/src/plugin/core-pack.security.ts`
  - `packages/admin-kernel/src/contributions/official-admin-contributions.tsx`
  - `packages/sdk/openapi/trinacria-cms.openapi.json`
  - `docs/cms/it/0011-sdk-api-keys-discovery.md`
  - `docs/cms/en/0011-sdk-api-keys-discovery.md`
  - `docs/cms/it/0015-operazioni-plugin-e-troubleshooting.md`
  - `docs/cms/en/0015-plugin-operations-and-troubleshooting.md`
  - `workflow/changelog/CHANGELOG.md`
  - `workflow/milestones/M3-gestione-plugin-operativa.md`
- Check eseguiti:
  - `npm run build`
  - `npm test`
  - `npm run lint`
- Follow-up aperti:
  - Nessuno nel perimetro di questo fix.

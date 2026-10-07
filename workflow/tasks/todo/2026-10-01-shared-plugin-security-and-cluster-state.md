# C2 — Sicurezza condivisa, grants, desired state e audit

## Obiettivo

Consegnare il blocco C2 del piano tecnico, applicando decisioni e criteri della specifica collegata.

## Area

`kernel | core-pack | sdk | backoffice | infra`

## Milestone

[M8 — Piattaforma plugin pubblica](../../milestones/M8-public-plugin-platform.md).
Stato: implementato, verifica finale integrata in corso il 2 ottobre 2026.
Responsabile: owner dei package indicati nell'area; reviewer dei contratti kernel/Core.

## Specifica esecutiva

[Sicurezza condivisa, grants, desired state e audit](../../../docs/cms/architecture/plugin-platform/distributed-security.md).
[Piano e registro decisioni](../../../docs/cms/architecture/plugin-platform-implementation-plan.md).
La specifica fissa semantiche, errori, contratti target, default, recovery e acceptance;
questa scheda ne organizza gli incrementi, senza introdurre alternative architetturali.

## Dipendenze

A1/A3 e C0 per migrazione grant; A0 unit of work. Antireplay order test può iniziare prima di C0.

## Scope e incrementi

- [x] Nonce verificato dopo firma e consumato atomicamente in Mongo con Date/TTL, niente fallback production.
- [x] Adottare soltanto canonical signing v2/key ID/chiavi robuste; rifiutare v1 e aggiornare signer.
- [x] Normalizzare grant in repository unique/CAS, API autorizzate e import opzionale restrittivo di dati di sviluppo.
- [x] Desired state/instance heartbeat/reconciler, API cluster v2/202 e maintenance writer fencing.
- [x] Audit persistente transazionale, permessi nuovi, metriche bounded e readiness su outage.

Fuori scope: gli altri blocchi M8, salvo integrazioni necessarie dichiarate nella specifica.
Ogni incremento deve avere test e consumer aggiornati; recupero dati di sviluppo solo se richiesto, senza reset automatici; non segnare il task done dopo il solo scaffolding.

## File impattati

Core settings/auth/plugin-access/security, kernel persistence/contracts/system, SDK/OpenAPI, settings UI e ops checklist.
I path sotto kernel/Core/pack sono relativi a `packages/`; i nuovi moduli mantengono
la struttura esistente e i contratti pubblici definiti nella specifica.

## Check e criterio di chiusura

Due istanze: replay/restart/outage, firma invalida non consuma nonce, grant concorrenti/revoca, desired convergence, stale writer e audit redatto.

- Test mirati e integrazioni reali del requisito, inclusi casi negativi e recovery.
- `npm run check` e `npm run build` con Node di `.nvmrc`.
- SDK check per API/generatore; Chromium per i flussi modificati; Storybook per UI/renderer.
- Documentazione, checklist e changelog aggiornati; risultati e skip registrati.
- Chiudere solo dopo gli acceptance della specifica e le dipendenze richieste dal relativo gate.

## Evidenza corrente

[Runbook implementato](../../../docs/cms/architecture/plugin-platform/distributed-runtime-runbook.md).
Signing v2, nonce condiviso, repository grants/CAS, controlli accesso, cluster 202/ack,
fencing prima del commit, deploy artefatti esplicito e audit unificato implementati.
Test Mongo nonce/grants/cluster passati, inclusi outage per connessione chiusa e timeout
partial; 19 Chromium passati prima del collegamento C1. Check/build/tarball finali
vengono ripetuti con C1; nessuna attestazione G3 di produzione.

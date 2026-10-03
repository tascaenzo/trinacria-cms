# C1 — Outbox, delivery, inbox e job email durevoli

## Obiettivo

Consegnare il blocco C1 del piano tecnico, applicando decisioni e criteri della specifica collegata.

## Area

`kernel | editorial-pack | email-pack | core-pack`

## Milestone

[M8 — Piattaforma plugin pubblica](../../milestones/M8-public-plugin-platform.md).
Stato: in sviluppo il 2 ottobre 2026; runtime e consumer collegati, verifiche complete in corso.
Responsabile: owner dei package indicati nell'area; reviewer dei contratti kernel/Core.

## Specifica esecutiva

[Outbox, delivery, inbox e job email durevoli](../../../docs/cms/architecture/plugin-platform/durable-events.md).
[Piano e registro decisioni](../../../docs/cms/architecture/plugin-platform-implementation-plan.md).
La specifica fissa semantiche, errori, contratti target, default, recovery e acceptance;
questa scheda ne organizza gli incrementi, senza introdurre alternative architetturali.

## Dipendenze

A0/A1/A2/A3, C0 e C2; non attivare async durevole senza questi prerequisiti.

## Scope e incrementi

- [ ] Outbox e intent di routing nella transazione dominio/kernel; materializer idempotente.
- [ ] Worker lease/epoch, wrapper A1, inbox per consumer, retry/dead-letter e partition ordering.
- [ ] Derivare envelope ID/versione da outbox e non usare bus dedup come prova di successo.
- [ ] Trasferimento atomico vault→job email cifrato, expiry e gestione degli invii esterni ambigui.
- [ ] API amministrative delivery/replay/cancel, retention coordinata e metriche/readiness.

Fuori scope: gli altri blocchi M8, salvo integrazioni necessarie dichiarate nella specifica.
Ogni incremento deve avere test e consumer aggiornati; recupero dati di sviluppo solo se richiesto, senza reset automatici; non segnare il task done dopo il solo scaffolding.

## File impattati

kernel durable runtime/repositories/contracts, publisher Editorial, user flows Core, Email handlers/provider/job e system API.
I path sotto kernel/Core/pack sono relativi a `packages/`; i nuovi moduli mantengono
la struttura esistente e i contratti pubblici definiti nella specifica.

## Check e criterio di chiusura

Crash in tutte le finestre, due worker/stale epoch, revoca/disable, partition, SMTP ambiguo e nessun secret nei log; almeno una volta, non exactly-once SMTP.

- Test mirati e integrazioni reali del requisito, inclusi casi negativi e recovery.
- `npm run check` e `npm run build` con Node di `.nvmrc`.
- SDK check per API/generatore; Chromium per i flussi modificati; Storybook per UI/renderer.
- Documentazione, checklist e changelog aggiornati; risultati e skip registrati.
- Chiudere solo dopo gli acceptance della specifica e le dipendenze richieste dal relativo gate.

## Incrementi correnti

[Runbook del codice](../../../docs/cms/architecture/plugin-platform/durable-runtime-runbook.md).
Outbox/materializer/lease/inbox/partition, wrapper runtime e atomic publisher
Editorial/utenti implementati; vault→job email cifrato atomico, ambiguous SMTP,
API delivery/email-jobs e readiness presenti. Quattro test Mongo C1 passati,
comprendenti recovery CAS/audit, retention coordinata, deadline cooperativa e rotazione
job senza alterare claim/stato. Diciannove flussi Chromium passati con consegna dei
job realmente completata; il profilo installer offline è passato su HTTP reale.
Gli ultimi incrementi devono ancora superare la suite generale aggiornata. Il task
non è done e non dichiara G2/G3 soddisfatti.

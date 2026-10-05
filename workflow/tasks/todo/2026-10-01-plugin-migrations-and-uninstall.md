# C0 — Runner migrazioni, fencing, upgrade e disinstallazione

## Obiettivo

Consegnare il blocco C0 del piano tecnico, applicando decisioni e criteri della specifica collegata.

## Area

`kernel | core-pack | infra | docs`

## Milestone

[M8 — Piattaforma plugin pubblica](../../milestones/M8-public-plugin-platform.md).
Stato: implementazione e prove automatiche integrate; acceptance del deployment aperta.
Responsabile: owner dei package indicati nell'area; reviewer dei contratti kernel/Core.

## Specifica esecutiva

[Runner migrazioni, fencing, upgrade e disinstallazione](../../../docs/cms/architecture/plugin-platform/migrations-and-lifecycle.md).
[Piano e registro decisioni](../../../docs/cms/architecture/plugin-platform-implementation-plan.md).
La specifica fissa semantiche, errori, contratti target, default, recovery e acceptance;
questa scheda ne organizza gli incrementi, senza introdurre alternative architetturali.

## Dipendenze

A0 HostUnitOfWork/ownership e A3 autorizzazione; coordinamento istanze completato in C2.

## Scope e incrementi

- [x] Aggiungere migrations plan/apply/status, registro versioni/checksum e definizioni distribuite nel plugin.
- [x] Implementare locks con epoch, transazioni/batch/checkpoint e fencing nella stessa sessione.
- [x] Inizializzare storage ownership target; recupero dati precedenti opzionale con report, senza cancellazioni automatiche.
- [x] Introdurre maintenance/drain e runbook backup/restore/downgrade.
- [x] Separare uninstall e purge da unregister/disable; proteggere dipendenti, dati e referenze.

Fuori scope: gli altri blocchi M8, salvo integrazioni necessarie dichiarate nella specifica.
Ogni incremento deve avere test e consumer aggiornati; recupero dati di sviluppo solo se richiesto, senza reset automatici; non segnare il task done dopo il solo scaffolding.

## File impattati

kernel runtime/persistence/lifecycle/CLI, Core operazioni autorizzate, fixture migrazioni e runbook.
I path sotto kernel/Core/pack sono relativi a `packages/`; i nuovi moduli mantengono
la struttura esistente e i contratti pubblici definiti nella specifica.

## Check e criterio di chiusura

Due runner, stale epoch, crash batch, checksum, indice e restore; downgrade/namespace ambigui bloccati; nessun dato cancellato al load.

- Test mirati e integrazioni reali del requisito, inclusi casi negativi e recovery.
- `npm run check` e `npm run build` con Node di `.nvmrc`.
- SDK check per API/generatore; Chromium per i flussi modificati; Storybook per UI/renderer.
- Documentazione, checklist e changelog aggiornati; risultati e skip registrati.
- Chiudere solo dopo gli acceptance della specifica e le dipendenze richieste dal relativo gate.

## Implementazione e acceptance

Runner/CLI locale plan/apply/status, checksum file distribuiti, registro per entità,
lease epoch/heartbeat, transazioni e batch/checkpoint/audit; guard writer nella sessione
Mongo e preflight schema prima del codice plugin. Drain reale delle operation facade e
degli handler con segnale cooperativo; timeout non dichiara terminato il codice.
Orchestrazione uninstall/purge separata con callback host obbligatorie per autorizzazione,
drain delle istanze, credenziali/artefatti e referenze. Non viene invocata automaticamente.

Verificati 3 test Mongo (upgrade con crash/ripresa, takeover/fencing, indice fallito e
reconciliato) e 64 test runtime mirati; check completo, 19 Chromium e tarball esterni pass.
Prova CLI da tarball, removal con dati conservati/purge controllato e backup/restore
sono passati nelle fixture dedicate. C2 aggiunge ack/drain distribuito e deploy artefatti
sotto maintenance; il runbook descrive i callback di competenza dell host.
Restano la verifica finale integrata e la procedura G3 nell ambiente di deploy del team.
Il task resta aperto; lo sviluppo non dichiara G3 soddisfatto dalla sola lease locale.


Per chiusura operativa e risultati aggiornati usare il
[registro singola istanza](../../../docs/cms/architecture/plugin-platform/single-instance-acceptance.md).
Gli incrementi di codice sono completati; le checkbox della milestone restano aperte
fino alle acceptance richieste dal rispettivo gate.

# A3 — Autorizzazione applicativa e contratti dei domini

## Obiettivo

Consegnare il blocco A3 del piano tecnico, applicando decisioni e criteri della specifica collegata.

## Area

`kernel | core-pack | editorial-pack | media-pack | email-pack`

## Milestone

[M8 — Piattaforma plugin pubblica](../../milestones/M8-public-plugin-platform.md).
Stato: completato e verificato il 2 ottobre 2026.
Responsabile: owner dei package indicati nell'area; reviewer dei contratti kernel/Core.

## Specifica esecutiva

[Autorizzazione applicativa e contratti dei domini](../../../docs/cms/architecture/plugin-platform/security-and-operations.md).
[Piano e registro decisioni](../../../docs/cms/architecture/plugin-platform-implementation-plan.md).
La specifica fissa semantiche, errori, contratti target, default, recovery e acceptance;
questa scheda ne organizza gli incrementi, senza introdurre alternative architetturali.

## Dipendenze

A0 per identità/unit of work; A1/A2 per invarianti condivise. Grant API persistenti completati in C2.

## Scope e incrementi

- [x] Aggiungere OperationContext/OperationAuthorizer: utenti, plugin e system host con scopi ristretti.
- [x] Primo verticale Editorial pubblicazione: permesso publish e workflow/ownership nella sessione.
- [x] Ricreare content type/revisioni/entry nella stessa transazione; gestire concorrenza modello e versione.
- [x] Inventariare e migrare tutte le operazioni sensibili in Editorial, Media, Settings, Accesso, Runtime ed Email.
- [x] Controller sottili, contratti pubblici e DTO/errori; impedire deleghe userId arbitrarie.

Fuori scope: gli altri blocchi M8, salvo integrazioni necessarie dichiarate nella specifica.
Ogni incremento deve avere test e consumer aggiornati; recupero dati di sviluppo solo se richiesto, senza reset automatici; non segnare il task done dopo il solo scaffolding.

## File impattati

kernel/contracts, Core security/auth/settings, Editorial services/controllers, Media ACL/services, Email e system operations.
I path sotto kernel/Core/pack sono relativi a `packages/`; i nuovi moduli mantengono
la struttura esistente e i contratti pubblici definiti nella specifica.

## Check e criterio di chiusura

HTTP e chiamate interne negative, delega con doppio controllo, principal dal body rifiutato, ownership/paginazione e race workflow. Tutto l inventario è necessario per chiusura.

- Test mirati e integrazioni reali del requisito, inclusi casi negativi e recovery.
- `npm run check` e `npm run build` con Node di `.nvmrc`.
- SDK check per API/generatore; Chromium per i flussi modificati; Storybook per UI/renderer.
- Documentazione, checklist e changelog aggiornati; risultati e skip registrati.
- Chiudere solo dopo gli acceptance della specifica e le dipendenze richieste dal relativo gate.

## Consegna verificata — 2 ottobre 2026

- OperationContext certificati/congelati con binding HTTP/runtime, contesti system con
  allowlist esatta e deleghe ricavate da un contesto utente autenticato.
- CoreOperationAuthorizer con Authz utenti e grant API esatti; policy assente/errore nega,
  delega controlla entrambi i diritti. Starter risolve la policy a ogni valutazione.
- Facade e controller aggiornati nei sei domini; approver/updatedBy/owner assegnati
  dall'host, segreti e runtime manage hanno permessi separati.
- Editorial rivaluta azioni e scope dentro i retry; modello, entry e revisioni condividono
  la sessione; fence CAS del modello; publish obbligatorio entrando/uscendo da published,
  su initial published, modifica live e restore live; eventi solo dopo commit.
- Media filtra ACL prima della paginazione; delega richiede entrambi gli ACL, replacement
  rivaluta update in tutte le fasi e cleanup usa system con scope esplicito.
- Operazioni nominate Editorial/Media/Email richiamano le stesse facade; servizi plugin
  settings attraversano il contratto applicativo. I consumer interni sono aggiornati.
- [Inventario completo e limiti](../../../docs/cms/architecture/plugin-platform/application-operation-inventory.md).

Verifica senza cache Turbo con Node 24.21.0/npm 11.16.0:

| Verifica | Risultato |
| --- | --- |
| npm run check | 561 test passati, 13 integrazioni opt-in saltate; format/lint/guardrail/typecheck/E2E typecheck, dipendenze e confini passati |
| npm run build | 12 task passati, incluso prebuild E2E finale |
| Mongo integration | 20 test passati, 2 skip Redis/S3; replica set locale e database temporanei |
| Chromium | 17/17 scenari passati, inclusa API plugin negata prima di approvazione e dopo revoca |
| SDK generato | npm run sdk:check passato |
| Backend headless | import dei cinque package e kernel/runtime con React/react-dom esplicitamente bloccati passato |

Log locali: /private/tmp/trinacria-a3-check.log, /private/tmp/trinacria-a3-build.log,
/private/tmp/trinacria-a3-integration.log, /private/tmp/trinacria-a3-e2e.log e
/private/tmp/trinacria-a3-sdk.log. Il primo tentativo Mongo ha rilevato Docker spento;
riavvio senza reset e ripetizione completa riuscita. Nessuna modifica UI: Storybook non
ripetuto. CI remota non eseguita; Redis/S3 non attivati. Nessun reset dei dati di sviluppo.

## Confini della consegna e prossimo blocco

G1 coperto. M8 resta aperta: prossimo B0/B1 (export pubblici e OpenAPI/SDK Editorial).
Il percorso corrente verifica manifest locali e permessi utente. Gli accessi HTTP
firmati hanno decisioni persistite separate. Migrazioni/outbox/job/audit durevoli
rimangono C0/C1/C2. I permessi amministrativi sono provisionati solo al ruolo admin.
Gli export host avanzati e i seed/bootstrap fidati non sono un'API sandbox per plugin.
Prima di avviare su dati di sviluppo precedenti, pianificare eventuale recupero del modello:
A3 adotta version obbligatoria, senza fallback o aggiornamento implicito delle collezioni.

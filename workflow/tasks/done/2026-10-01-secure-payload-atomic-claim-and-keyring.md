# A2 — Claim atomico, policy strutturale e keyring del vault

## Obiettivo

Consegnare il blocco A2 del piano tecnico, applicando decisioni e criteri della specifica collegata.

## Area

`kernel | core-pack | email-pack | docs`

## Milestone

[M8 — Piattaforma plugin pubblica](../../milestones/M8-public-plugin-platform.md).
Stato: completato e verificato il 1 ottobre 2026, sul workspace basato su `fc33de9`.
Responsabile: owner dei package indicati nell'area; reviewer dei contratti kernel/Core.

## Specifica esecutiva

[Claim atomico, policy strutturale e keyring del vault](../../../docs/cms/architecture/plugin-platform/security-and-operations.md).
[Piano e registro decisioni](../../../docs/cms/architecture/plugin-platform-implementation-plan.md).
La specifica fissa semantiche, errori, contratti target, default, recovery e acceptance;
questa scheda ne organizza gli incrementi, senza introdurre alternative architetturali.

## Dipendenze

A1 per semantica deny-by-default; A0 per accesso identitario e futura transazione vault/job.

## Scope e incrementi

- [x] Riprodurre la gara del claim prima della correzione, poi CAS filtrato per stato/count/scadenza e metadati.
- [x] Negare divieti strutturali indipendentemente dall’authorizer e negare policy assente.
- [x] Eliminare fallback a record precedente; retry massimo tre e errori redatti.
- [x] Derivare consumer/producer dall’host nel nuovo contesto, rimuovere identità autodichiarate dal contratto pubblico.
- [x] Implementare keyring v1/v2, chiavi esplicite obbligatorie in tutti gli ambienti, retention e runbook di rotazione.

Fuori scope: gli altri blocchi M8, salvo integrazioni necessarie dichiarate nella specifica.
Ogni incremento deve avere test e consumer aggiornati; recupero dati di sviluppo solo se richiesto, senza reset automatici; non segnare il task done dopo il solo scaffolding.

## File impattati

kernel/src/runtime/secure-payloads, contracts/secure-event-payloads, cms-starter; fixture Core/Email.
I path sotto kernel/Core/pack sono relativi a `packages/`; i nuovi moduli mantengono
la struttura esistente e i contratti pubblici definiti nella specifica.

## Check e criterio di chiusura

Mongo reale: 50 claim/max1, max3, revoke/expiry, policy permissiva, ciphertext corrotto, key rotation e due servizi concorrenti.

- Test mirati e integrazioni reali del requisito, inclusi casi negativi e recovery.
- `npm run check` e `npm run build` con Node di `.nvmrc`.
- SDK check per API/generatore; Chromium per i flussi modificati; Storybook per UI/renderer.
- Documentazione, checklist e changelog aggiornati; risultati e skip registrati.
- Chiudere solo dopo gli acceptance della specifica e le dipendenze richieste dal relativo gate.


## Implementazione consegnata

- `SecureEventPayloadClient` create/claim/revoke in `services.securePayloads`; producer e
  consumer legati all’host, generazioni invalidate dal runtime. Identità nel body negate;
  schemaVersion obbligatorio. Token host `SECURE_EVENT_PAYLOAD_HOST`, senza alias legacy.
- CAS Mongo su stato/count/max/metadati/lista/scadenza e revisione/ciphertext. Plaintext
  restituito soltanto dopo successo; massimo tre tentativi con nuova policy. Corruzione,
  expiry, recipient e stato negano prima di consumare; authorizer non può superarli.
- Core/Email usano client composti dall’host. Lo starter risolve la policy a ogni claim:
  Auth può costruire il vault prima del modulo Settings/Core; non conserva l’assenza.
  Test con modulo registrato dopo la costruzione e revoca successiva, più E2E email.
- AES-256-GCM con keyring esplicito, active per write e keyVersion per read. Chiavi casuali
  32 byte, base64 canonico o Uint8Array nell’host; nessun fallback settings/dev/master.
  Materiale/placeholder invalidi bloccano l’avvio prima di HTTP/DB. Gli errori sono redatti.
- `purgeAt` BSON Date, indice TTL zero inizializzato dallo starter: expiration + 24h alla
  creazione, transizione + retention su consumo finale/revoca. Expired/revoche ripetute
  non prolungano il periodo. Retention configurabile, TTL separato dall’autorizzazione.
- Rotazione host tramite revision CAS, preservando contatore/stato/retention; comando
  `scripts/rotate-secure-payloads.mjs --from-key-id v1` in sola lettura, `--apply` esplicito
  a batch 100, ripresa idempotente e output di soli conteggi. Non elimina record/chiavi.
- [Runbook configurazione e rotazione](../../../docs/cms/architecture/plugin-platform/secure-payload-keyring-runbook.md),
  `.env.example`, deploy production, guide EN/IT e contratti pubblici aggiornati.

Claim/revoke linearizzati dal CAS del payload; revoca grant dopo la policy non annulla
un claim già autorizzato. Il clock host viene riletto prima di inviare il CAS: non è
un clock transazionale Mongo e una richiesta può completare dopo il deadline. Host
sincronizzati richiesti. Non si introducono sandbox, grant condivisi C2 o job durevoli C1.
Nessuna migrazione/reset dei dati di sviluppo: recupero opzionale separato.

## Riproduzione e risultati

Prima della correzione, con barriera Promise e due servizi su due connessioni Mongo,
50 claim contemporanei producevano **50 successi sia con max=1 sia con max=3**.
Dopo la correzione: **esattamente 1 e 3 successi**, gli altri senza plaintext.
Coperti entrambi gli ordini claim/revoke, expiry durante policy, authorizer permissivo,
corruzione, policy revocata al retry, tre CAS persi, rotazione durante claim, letture
v1/v2, ID sconosciuto, DTO immutabili, TTL/retention e inventario/apply/ripresa CLI.

Verifiche su Node 24.21.0/npm 11.16.0, senza cache Turbo:

- `npm run check`: format/lint/typecheck, guardrail, dipendenze/confini passati;
  **541 test passati, 13 opt-in saltati**, zero failure. Vault mirato: 30/30.
- `TURBO_FORCE=true npm run e2e`: build **12/12 task**, Chromium **17/17**, inclusi
  flussi verifica/reset/invito, log redatti e backup/restore in database dedicato.
- `TRINACRIA_RUN_MONGO_INTEGRATION=1 TURBO_FORCE=true npm run test:integration`:
  **17 passati, 2 skip** Redis/S3 (flag non abilitati); replica set locale, DB di test
  dedicati. Redis/S3 non modificati né verificati nuovamente in questo blocco.
- `npm run sdk:check`: generato allineato. Import backend kernel e quattro pack con
  React/React-DOM bloccati: passati. Nessuna UI cambiata: Storybook non ripetuto.
- Link Markdown locali, fence e `git diff --check`: passati.

Log locali: `/private/tmp/trinacria-a2-reproduction.log`, `trinacria-a2-unit-final.log`,
`trinacria-a2-check.log`, `trinacria-a2-integration.log`, `trinacria-a2-e2e.log`,
`trinacria-a2-sdk.log`, `trinacria-a2-headless.log` (tutti sotto `/private/tmp/`).
Nessun commit, push o PR creato; CI remota non eseguita. Prossimo blocco: A3.

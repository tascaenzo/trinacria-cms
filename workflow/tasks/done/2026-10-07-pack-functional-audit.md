# Audit funzionale e consolidamento IAM

## Obiettivo

Completare l'analisi dei percorsi Core/IAM, Editorial, Media, Email e impostazioni,
attuare le correzioni IAM-01–05 e consegnare decisioni, prove e procedure al team.

## Area e baseline

`core-pack | editorial-pack | media-pack | email-pack | kernel | sdk | backoffice | docs`

Baseline `8ed0593`, sorgenti della PR #17 già comunicata come merged dal team.
Branch `feat/cms-functional-access`, commit implementazione `04246a8`. Contratti beta aggiornati insieme, senza
compatibilità con versioni non rilasciate. Plugin fidati nello stesso processo.

## Scope

- In scope: audit API/SDK/UI, accessi reali per ruolo, scritture IAM atomiche,
  protezione ultimo amministratore, gestione ruoli dal backoffice, coerenza
  policy/guard, revoca sessioni e recupero locale.
- Out of scope: pubblicazione pacchetti, reset DB del team, nuovi sistemi di
  isolamento plugin, acceptance staging e nuove funzionalità di prodotto
  elencate come future nel report.

## Checklist operativa completata

- [x] **Accesso e delega:** separata shell backoffice dalle permission gestionali;
  l'ID del setup non è più un vincolo. Discovery minima disponibile agli autori,
  gestione IAM piena riservata a chi riceve `roles:write`.
- [x] **Ultimo amministratore:** scritture e verifica nella stessa transazione,
  serializzazione sul documento installazione anche fra utenti differenti;
  rifiuto con 409 e rollback. Ruolo admin e permission Core protetti.
- [x] **Gestione UI:** assegnazione/rimozione ruoli e riepilogo permission nel
  dettaglio utente; azioni per record valutate al caricamento/apertura del menu;
  conservati i guard dei manifest.
- [x] **Grant e concorrenza:** PATCH ruolo con `expectedUpdatedAt` obbligatorio,
  CAS aggregato, provenienza dei plugin conservata e override manuali distinti.
- [x] **Policy:** valutatore comune fra backend e proiezione per UI/SDK;
  deny prevalente, permission disabilitate escluse, condizioni di record esplicite.
  Policy plugin consultabili e protette da CRUD manuale.
- [x] **Sessioni e flussi account:** revoca con versione su stato/password;
  rinnovo cookie nel cambio password autenticato, challenge MFA monouso e
  invalidati dalla revoca; token invito/reset consumati una sola volta.
- [x] **Recupero:** CLI locale `cms-recover-admin`, password su stdin e database
  esplicito; transazione di ripristino e reset MFA opzionale, senza endpoint HTTP.
- [x] **Audit e impostazioni:** accessi delegati sulle permission delle operazioni;
  mutazioni IAM riuscite/fallite registrate con payload redatto.
- [x] **Editorial:** verificati authoring, ownership/reviewer, transizioni,
  revisioni e limiti dei modelli; esplicitato che la data non avvia uno scheduler.
- [x] **Media:** analizzati picker, ACL, condivisione/delivery e soft delete;
  documentato il ruolo aggiuntivo necessario agli autori che caricano immagini.
- [x] **Email/settings:** analizzati inviti/reset, template, job/retry e segreti;
  distinti i test locali dalla consegna SMTP esterna.
- [x] **Contratti e documentazione:** SDK/OpenAPI, API pubbliche, guide operative
  e specifiche dei pack allineati.

## Verifiche

613 test ordinari passati (35 integrazioni opt-in saltate), 44 integrazioni Mongo
passate (Redis/S3 opzionali saltati: 2), Chromium 29/29 e build 15/15. Lint,
guardrail, confini, typecheck, dipendenze, API pubbliche, signing, template e SDK
verificati; otto tarball validati, nessuna pubblicazione.

Dettagli e limiti nel [report](../../../docs/cms/specs/domains/functional-audit.md).
Il test HTTP/Mongo reale comprende due amministratori, concorrenza sulla revoca
finale, CAS, provenienza e processo CLI. Il browser prova assegnazione/rimozione,
profilo autore, esclusione Users e cambio password con revoca del token precedente.
Database temporanei isolati; rimossi anche i residui delle prove interrotte.
DB mock conservato. Nessun push/pubblicazione.

## Consegna e sviluppi successivi

- [Analisi e decisioni](../../../docs/cms/specs/domains/functional-audit.md).
- [Procedura ruoli e recupero](../../../docs/cms/specs/domains/identity-access.md).
- Designer UI policy, delega limitata, cambio email verificato, gestione gruppi,
  scheduler/tassonomie, trasformazioni Media e dashboard Email restano estensioni
  di prodotto: requisiti da definire, non correzioni IAM lasciate incomplete.

# Piano tecnico di implementazione della piattaforma plugin

Data: 1 ottobre 2026. Codice analizzato: baseline `fc33de9`, più documentazione locale
della checklist e del task A1. Stato: analisi e decisioni tecniche completate;
**A0/A1/A2/A3/B0/B1/B2 implementati e verificati**; C0/C2/C1/D0/E0 hanno
codice e prove integrate. Il percorso standard è
[plugin fidati in-process](plugin-platform/trusted-plugin-model.md). Acceptance del team e gate aperti sono
registrati nei task; nessun rilascio pubblico è avvenuto. Le API proposte nei
documenti collegati restano target finché il rispettivo task non è consegnato.
Lo stato di ogni consegna è tracciato nei task e nella milestone M8.

## Vincolo di progetto: nessun rilascio precedente

Il progetto è in beta interna e non è mai stato rilasciato, come confermato dal maintainer
il 1 ottobre 2026. Non esiste una baseline pubblicata da preservare: sono autorizzate
modifiche incompatibili a contratti, export, manifest, API HTTP e SDK. Aggiornare nello
stesso incremento tutti i consumer del repository, gli esempi, i test e le guide;
non introdurre alias legacy, dual API o finestre di deprecazione per il codice attuale.

Semver e controlli core/plugin/admin restano necessari per rifiutare combinazioni
incompatibili. Le regole verso futuri utenti saranno definite prima del primo rilascio
pubblico, senza vincolare la riprogettazione attuale. La versione del primo rilascio
sarà scelta al gate G2: i numeri attuali nei manifest non provano una pubblicazione.

Per installazioni nuove usare direttamente schema e contratti target. Il recupero di
eventuali dati di sviluppo è un percorso opzionale esplicito, separato dal gate della
prima release; inventario, backup e validazione precedono qualsiasi trasformazione.
Questa decisione non autorizza reset o cancellazioni. Migrazioni future, rotazione delle
chiavi, integrità dei dati e rollback operativo restano requisiti del prodotto.

## Uso da parte del team

Questo piano è l'entrypoint. La [checklist](plugin-platform-operational-checklist.md)
misura gli esiti; le specifiche seguenti definiscono come ottenerli. I task in
`workflow/tasks/todo/` contengono dipendenze e gate di consegna. Per cambiare una decisione,
aggiornare la specifica e motivare il cambiamento prima di modificare il contratto.
A0 è consegnato nel [task contesto/storage](../../../workflow/tasks/done/2026-10-01-plugin-host-context-and-storage-boundaries.md)
e A1 nel [task eventi](../../../workflow/tasks/done/2026-10-01-plugin-event-authorization-hardening.md);
A2 è consegnato nel [task vault](../../../workflow/tasks/done/2026-10-01-secure-payload-atomic-claim-and-keyring.md).
A3 è consegnato nel [task operazioni applicative](../../../workflow/tasks/done/2026-10-02-application-operation-authorization.md),
con [inventario dei sei domini](plugin-platform/application-operation-inventory.md).
B0 è consegnato nel [task export/semver](../../../workflow/tasks/done/2026-10-02-public-exports-semver-and-compatibility.md).
B1/B2 sono consegnati. Il blocco attivo è il consolidamento del modello fidato: policy
locale senza approvazioni DB, lifecycle single-instance, SDK e starter coerenti.

Non serve una nuova fase generale di discovery: servono i test di riproduzione e le
verifiche di implementazione indicate per ciascun task.

L'[indice dei task M8](../../../workflow/milestones/M8-public-plugin-platform.md)
collega ogni scheda assegnabile. Le sei specifiche seguenti coprono tutti i 12 punti
della checklist, incluso il contesto plugin A0 e il sito pubblico E0.

| Checklist | Specifica esecutiva | Task |
| --- | --- | --- |
| 1: fiducia e contesto plugin | [Sicurezza e operazioni](plugin-platform/security-and-operations.md) | A0 |
| 2: eventi protetti/revoca | [Sicurezza e operazioni](plugin-platform/security-and-operations.md) | A1 |
| 3: payload atomici e vault | [Sicurezza e operazioni](plugin-platform/security-and-operations.md) | A2 |
| 4: autorizzazione applicativa | [Sicurezza e operazioni](plugin-platform/security-and-operations.md) | A3 |
| 5: OpenAPI/SDK | [API, SDK e release](plugin-platform/api-sdk-and-release.md) | B1 |
| 6: export, versioni e guide | [API, SDK e release](plugin-platform/api-sdk-and-release.md) | B0 |
| 7: packaging/admin | [API, SDK e release](plugin-platform/api-sdk-and-release.md) | B2 |
| 8: migrazioni/rimozione | [Migrazioni e lifecycle](plugin-platform/migrations-and-lifecycle.md) | C0 |
| 9: consegna persistente | [Eventi durevoli](plugin-platform/durable-events.md) | C1 |
| 10: nonce, grant, repliche, audit | [Sicurezza distribuita](plugin-platform/distributed-security.md) | C2 |
| 11: percorso esterno | [API, SDK e release](plugin-platform/api-sdk-and-release.md) | D0 |
| 12: sito pubblico | [Sito pubblico](plugin-platform/public-site-contracts.md) | E0 |

## Registro delle decisioni

Per gli ambiti coperti, queste specifiche M8 prevalgono sulle alternative delle proposte
storiche e della prima stesura A1. Lo stato del codice resta documentato separatamente:
un contratto target non deve essere presentato nelle guide come API già disponibile.

| ID | Decisione fissata | Motivazione |
| --- | --- | --- |
| PP01 | Prima beta per plugin fidati in-process | Conserva l'architettura esistente senza promettere una sandbox |
| PP02 | Contesto plugin ristretto e servizi pubblici | Riduce dipendenze interne e mantiene ownership |
| PP03 | Policy standard su manifest/dipendenze locali, senza approvazioni DB | Installare codice fidato autorizza le integrazioni dichiarate; vault conserva CAS e consumer espliciti |
| PP04 | Target autorizzati prima dell'operazione; quella accettata può terminare | Riduce duplicazioni; disattivazione usa drain e blocca nuove attività |
| PP05 | Claim del vault con compare-and-set Mongo e retry limitato | Si riusa `DbRepository.updateOne` senza esporre il driver ai plugin |
| PP06 | Identità stabilita dall'host, autorizzazione nei servizi pubblici | Stesse regole da HTTP, plugin e job |
| PP07 | OpenAPI dai controller; generazione SDK base più overlay indipendente | Una fonte HTTP, nessuna scrittura in node_modules |
| PP08 | Semver completo tramite libreria `semver`, wrapper pubblici conservati | Corregge caret 0.x e prerelease; elimina implementazione parziale |
| PP09 | Release beta coordinata dei pacchetti CMS, versioni esatte ufficiali | Riduce combinazioni incompatibili prima di 1.0 |
| PP10 | Plugin admin fidati integrati al build tramite subpath | Mantiene i guardrail; niente microfrontend remoto nella beta |
| PP11 | Migrazioni come comando di deploy con registro/checksum e lock Mongo | Evita upgrade dati impliciti al normale avvio |
| PP12 | Outbox/delivery/inbox Mongo; almeno una volta, consumer idempotenti | Commit e intent di consegna atomici; nessuna promessa exactly-once esterna |
| PP13 | Store nonce atomico dedicato Mongo in produzione | Sopravvive ai riavvii; non riusa la cache volatile dei contenuti |
| PP14 | Grant persistiti riservati ai client HTTP firmati | Non impongono approvazioni o fence alle integrazioni dei plugin installati |
| PP15 | Lifecycle locale per default; desired state distribuito solo con cluster esplicito | Una singola istanza non richiede heartbeat/lease tra processi CMS |
| PP16 | Sito di riferimento: blog/editoriale React con SSR | Verticale limitato e verificabile prima di un site builder |
| PP18 | Chiavi del vault versionate tramite keyring | `keyVersion` deve governare la decifratura e la rotazione effettiva |
| PP19 | Ownership persistita e nomi storage non lossy | Owner canonici distinti non devono collidere dopo sanitizzazione |
| PP20 | Unit of work cross-namespace riservata all'host | Outbox/audit/locks atomici senza ampliare il DB pubblico plugin |

## Ordine e dipendenze di sviluppo

1. **A0 — completato:** contesto senza `app`, ownership persistente e unit of work host; consumer aggiornati.
2. **A1 — completato:** eventi protetti, diagnostica e cleanup verificati;
   non dipende dalla migrazione dei plugin al nuovo contesto.
3. **A2 — completato:** vault con CAS, identità host, keyring/retention e rotazione verificata su Mongo.
4. **A3 — completato:** contesti certificati, authorizer Core e inventario nei sei domini; retry/fence Editorial e controlli Media verificati.
5. **B0/B1 completati:** semver/export e baseline verificati; OpenAPI/SDK includono gli errori e i permessi A3.
6. **B2:** tarball e host esterno, dopo B0/B1 e i nuovi contratti A0.
7. **C0/C2:** runner migrazioni e sicurezza condivisa. Non richiedono una coda esterna;
   C2 usa C0 per introdurre gli indici dedicati; import di dati di sviluppo opzionale.
8. **C1:** outbox, inbox e job, dopo A1/A2/A3 e le primitive di lock/migrazione C0/C2.
9. **D0:** starter e prova esterna dopo B2; il gate completo della beta integra C0/C1/C2.
10. **E0:** sito pubblico dopo A3/B1; dipende da C1 per invalidazioni affidabili.

Non assegnare due PR concorrenti sugli stessi moduli del runtime o sul generatore SDK.
Le aree indipendenti possono essere sviluppate dal team contemporaneamente dopo che
i relativi contratti sono fissati. Non sono previste stime temporali senza conoscere
disponibilità e composizione del team.

## Gate di release

### G1 — Sicurezza della beta fidata

- A1/A2 verificati con test negativi, concorrenti e bootstrap completo.
- A3 copre tutte le mutazioni sensibili inventariate, non soltanto il verticale iniziale.
- Policy standard basata sui contratti installati; nessun handler residuo dopo cleanup.
- Permessi utente, ACL e contesti certificati restano obbligatori.
- Contratti aggiornati in tutti i consumer e keyring verificato sulla rotazione delle chiavi.
- A0 usa ownership e naming target senza collisioni, con registry/indici inizializzati prima dello storage.
  C0 riusa questa primitiva nel runner per upgrade futuri, obbligatorio prima di G2.

### G2 — Beta sviluppatori esterni

- G1, B0/B1/B2/D0; pacchetti installabili e client tipizzato fuori dal monorepo.
- C0 per upgrade recuperabili e C1 per i flussi dichiarati durevoli.
- Store persistiti di sessioni/nonce/rate limit operativi anche su una singola istanza.
- C2 coordinamento distribuito richiesto solo per più istanze CMS; grant locali non richiesti.
- Guide EN/IT e starter corrispondono agli artefatti verificati.

### G3 — Production multi-replica

- G2 più prove con due host, desired state riconciliato, crash/riavvio dei worker,
  perdita degli store, revoche e nonce condivisi; readiness e audit per istanza.
- Upgrade eseguito con writer/worker drenati, backup e recupero provati.

### G4 — Prodotto sito

- E0 ha un gate prodotto autonomo; non basta che funzioni l'admin.

## Verifiche e tracciamento

Per ogni modifica: test del requisito, `npm run check`, build e documentazione.
Eseguire Chromium sui flussi modificati, SDK check su API/generatore e Storybook
su renderer/UI. Usare Node di `.nvmrc`. Le prove distruttive usano solo dati di test.
Eseguire la suite Mongo separatamente da browser/packaging, con `--concurrency=1`.

A0/A1/A2/A3/B0/B1/B2 sono consegnati. C0/C2/C1/D0/E0 hanno codice e prove integrate;
le acceptance ancora aperte sono nei task. Le integrazioni installate usano manifest
in memoria; gli accessi HTTP firmati mantengono decisioni esplicite e anti-replay.
La gestione locale funziona senza cluster, con revisione stabile e drain.

[Modello operativo corrente](plugin-platform/trusted-plugin-model.md) ·
[Milestone e task](../../../workflow/milestones/M8-public-plugin-platform.md).
Nessun gate umano o di deployment viene chiuso per deduzione dalle prove automatiche.

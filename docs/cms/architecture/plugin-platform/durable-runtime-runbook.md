# Eventi persistenti e job email: codice e operazioni

Implementazione in sviluppo al 2 ottobre 2026. Il task C1 resta aperto fino alle
verifiche complete e al recovery operativo. Le prove elencate sono state eseguite;
non attestano un ambiente di produzione o una consegna SMTP exactly-once.

## Integrazione del plugin

Ogni emitted event dichiara delivery: sync, async oppure deferred. L'assenza è un errore
di manifest. Sync usa il bus locale; async/deferred richiedono MongoDurableEventStore
inizializzato prima del load. Il runtime non degrada automaticamente a memoria.
Deferred richiede notBefore. Il bootstrap standard inizializza lo store con Mongo
connesso. Con migrations.allowStartupWithoutDb=true e Mongo indisponibile, lo starter
richiede offlineInstallerModules espliciti e restituisce startupMode=installer: monta
soltanto moduli di installazione ambientale, senza caricare producer o avviare worker.
CorePackOfflineInstallerModule espone stato/configurazione; bootstrap resta 503 fino
a configurazione di Mongo e riavvio. Health segnala lo storage down. Il percorso
predefinito resta fail closed. Configurare durableEvents.enabled=false non
converte gli eventi async in sync.

`services.storage.transaction(async (storage, events) => { ... })` consegna storage
vincolato all'owner ed un publisher della stessa sessione. Usare quel publisher per
garantire dati+outbox atomici; chiamare services.events.emit separatamente persiste
un intent indipendente. Una callback Mongo può essere ritentata: niente SMTP/HTTP.
Non conservare repository o publisher oltre la callback.

Il routing salva i consumer/handler e la loro versione alla pubblicazione; un consumer
installato più tardi non riceve automaticamente lo storico. Il materializer crea delivery
uniche nella transazione e non usa il bus locale. L'envelope conserva l'ID dell'outbox.
Il dispatcher ricontrolla schema, versione consumer, generation, loaded state e policy.
Usare context.services.storage per gli effetti; non aprire transazioni annidate.
Operation call, scritture settings e claim vault generici sono rifiutati nella callback.
L'inbox e l'ack si registrano nella stessa sessione degli effetti Mongo.

Editorial ed i flussi utenti Core usano questo percorso. Il provisioning iniziale
Editorial crea contenuto di esempio senza emettere eventi utente mentre il producer
è ancora in caricamento. Non cambia la consegna delle scritture applicative successive.

## Lease, ordine e deadline

Default: concurrency 4, lease 30 s, heartbeat 10 s, deadline cooperativa 20 s, 8 tentativi,
backoff esponenziale 1 s→5 min con jitter. I motivi di errore salvati sono redatti.
Un handler ignorando AbortSignal resta vivo: la deadline sospende nuove acquisizioni
locali del consumer e la lease viene mantenuta fino alla fine del lavoro. Non viene
simulata la cancellazione di JavaScript. L'operatore deve drenare/ripristinare il worker.

partitionKey assegna una sequenza nella transazione del producer. Delivery precedenti
pending/running/retry/blocked/dead-letter bloccano quelle successive del consumer/handler.
Anche intent precedenti ancora materializing impediscono sorpassi. Retry/cancel sono
azioni esplicite auditabili; non eliminare manualmente outbox/inbox per sbloccare una coda.

## Job sensibili

Il consumer Email usa context.secureJobs.enqueueFromPayload. Il contesto host lega
payload ID, evento, consumer e permission; il claim e la creazione del job cifrato
avvengono nella stessa transazione dell'inbox. Il job contiene una nuova cifratura
AES-256-GCM sotto la chiave attiva e scade non oltre il token originale. I retry leggono
il job, senza riutilizzare il vault single-use. Grant e desired state vengono riletti
anche prima dell'invio del job già creato. Il log console contiene solo event,
provider, numero destinatari e Message-ID, senza destinatario, subject o body.

Message-ID deterministico aiuta la riconciliazione, non garantisce deduplica SMTP.
Un invio incerto o lease scaduta durante un invio non idempotente diventa ambiguous;
nessun reinvio automatico. Un provider che offre una vera idempotency key può usare
providerIdempotent dopo verifica della finestra di garanzia. Le API email-jobs espongono
la decisione esplicita retry/cancel, con epoch, actor autenticato e motivazione. La deadline
cooperativa di 20 s sospende le acquisizioni del worker locale; un invio già iniziato
resta ambiguo se non confermato. Il worker mantiene la lease finché il provider ritorna;
un processo non cooperativo richiede drain/riavvio operativo. reencryptBatch permette rotazione CAS
senza alterare stato/claim. Non rimuovere vecchie chiavi prima di finire entrambe le code.

## Superficie operativa e retention

API `/v1/system/deliveries`: list/get/retry/cancel, filtri e paginazione bounded; permessi
Core deliveries:read e deliveries:manage. Actor dalla sessione, expectedEpoch e reason
obbligatori. Inbox succeeded non può essere azzerata: per ripetere un effetto riuscito
occorre un nuovo intent di dominio. Risposte senza payload dell'outbox o plaintext.
Readiness degrada su worker non disponibile, consumer sospeso o backlog oltre 5 minuti.

Success/inbox: 30 giorni; dead-letter non partizionata: 90 giorni. Pending/blocked non
hanno TTL. Una dead-letter partizionata viene conservata fino a una decisione esplicita,
per impedire che il TTL sblocchi silenziosamente l'ordine. Job sensibili: eliminazione
24 ore dopo scadenza/terminale. Audit: 90 giorni. Outbox finale riceve TTL soltanto quando
tutte le delivery hanno stato terminale e retention; retry rimuove il TTL coordinato.
Una outbox senza recipient mantiene 30 giorni. Readiness degrada anche per job ambigui
non scaduti, worker sospeso e storage non disponibile.

Prove Mongo passate: dominio/outbox rollback in entrambe le direzioni, commit prima del
materializer con ripresa sul secondo host, recipient snapshot, due acquisizioni concorrenti,
effetti falliti prima dell'ack, ID invariato al retry, takeover epoch, partizione/revoca,
dead-letter, handler reale con policy/generation/storage, nessuna delivery locale doppia,
vault→job rollback, claim single-use, cifratura, scadenza token, grant bloccato e SMTP ambiguo.


## Riconciliazione email tramite API

Usare un utente amministratore con `core-pack:email-jobs:read` e
`core-pack:email-jobs:manage`. Il body non accetta un'identità operatore.

1. `GET /v1/system/email-jobs?status=ambiguous&limit=50` restituisce soltanto metadata.
2. `GET /v1/system/email-jobs/{id}` legge epoch/stato aggiornati; codificare l'ID come
   segmento URL (anche gli ID JSON).
3. Riconciliare il Message-ID deterministico con il provider, senza copiare destinatari
   o token nei log/audit. SMTP non garantisce deduplica sul Message-ID.
4. Se il provider conferma la consegna, `POST .../{id}/cancel` con
   `{ "expectedEpoch": N, "reason": "Consegna riconciliata presso il provider" }`.
5. Se conferma l'assenza dell'invio e il token resta valido, `POST .../{id}/retry`
   con epoch corrente e motivazione. Il worker ricontrolla i grant prima dell'invio.
6. Conflitto di epoch/stato/scadenza restituisce 409: rileggere, non forzare la coda.
   Job succeeded/running e token scaduti non possono essere reinviati da queste API.
   Riavviare un worker sospeso dopo drain del processo precedente, mai simularne l'arresto.

SDK System: listSecureEmailJobs/getSecureEmailJob/retrySecureEmailJob/cancelSecureEmailJob.
Gli stessi principi valgono per listEventDeliveries/getEventDelivery/retryEventDelivery/
cancelEventDelivery; l'inbox riuscita non viene resettata.

Verifica aggiuntiva del 2 ottobre: recovery CAS/audit, rotazione v1→v2 senza alterare
claim/stati, deadline cooperativa SMTP e 19 flussi Chromium passati con job realmente
completato. Il profilo installer offline è passato su HTTP reale: stato 200, bootstrap
503, route business assenti e health down, senza keyring o scritture fallback. Restano
la suite finale dopo gli ultimi incrementi e le prove sul deployment del team.

# Specifica: outbox, delivery, inbox e lavori persistenti

Copre checklist 9, decisione PP12; dipende da A1/A2/A3 e C0/C2.
Target di implementazione; [piano](../plugin-platform-implementation-plan.md).


Si applica il [vincolo prima del primo rilascio](../plugin-platform-implementation-plan.md):
nessuna retrocompatibilità con il codice attuale; consumer aggiornati insieme.

## Contratto e distinzione dal bus locale

Il bus Trinacria rimane l'infrastruttura per eventi locali. La versione installata può
avere trasporti/retry, ma il CMS oggi invoca `bus.emit(name,payload)` senza un contratto
transactional outbox. Il bus crea un nuovo envelope ID per emit e nella dispatch inbound
marca l'ID come processato prima degli handler: questa deduplica non è una inbox
transazionale per consumer e non dimostra consegna riuscita.

Prerequisito storage: `HostUnitOfWork` A0 per outbox/inbox kernel e scritture di dominio
nella stessa sessione. Il publisher della transazione riceve il provider host già scoped,
non un DbAdapter con owner arbitrario. Testare un fallimento nell'outbox che annulla anche
la modifica del dominio e viceversa prima di attivare qualsiasi evento durevole.

Decisione: aggiungere un dispatcher CMS per le delivery persistenti dei plugin, senza
riscrivere il framework o richiedere Redis/RabbitMQ. Mongo contiene outbox/delivery/inbox.
Il dispatcher invoca handler registrati nel runtime attraverso lo stesso wrapper A1;
non usa `bus.emit` come prova di completamento. Un trasporto esterno può diventare
adapter futuro, con le stesse garanzie e test. Nessuna doppia delivery locale+durevole.

`delivery` del manifest acquista semantica esplicita:

| Valore | Semantica |
| --- | --- |
| sync | Esegue sul bus locale e attende; nessuna durabilità implicita |
| async | Intent persistente, delivery worker; emit risolve dopo persistenza |
| deferred | Come async con notBefore; job pianificato persistente |
| assente | Manifest non valido; delivery deve essere dichiarata |

Aggiornare tutti i manifest ufficiali, starter ed esempi con delivery esplicita.
Documentare la nuova semantica di async nel changelog: un host senza store durevole rifiuta il load del
producer, invece di degradare a memoria. `deferred` usa clock UTC e non basta un campo
scheduledAt per attivare pubblicazione pianificata: quella resta un job di dominio separato.

## Modello dati target

Outbox: `id` UUID stabile, owner, canonical eventName, payloadVersion del manifest,
payload JSON oppure securePayloadId, occurredAt, notBefore, correlationId, causationId,
partitionKey opzionale e stato materializing/materialized. L'ID nasce una sola volta
per l'intent e viene conservato in ogni retry/envelope; non generare un nuovo ID nel retry.

Delivery: unique `(eventId, consumerPluginId, handlerName)`, contractVersion consumer,
status pending/running/retry/succeeded/blocked/dead-letter/cancelled, attempt,
availableAt, leaseOwner/leaseUntil/epoch, errore redatto e completedAt. Indice su
status/availableAt/leaseUntil e owner; nessun indice TTL su righe ancora pending.

Inbox: unique `(consumerPluginId, handlerName, eventId)`, outcome e completedAt,
versione handler. Per consumer transazionali, riga inbox ed effetti DB sono nella stessa
sessione; completamento della delivery viene registrato nella medesima transazione.
La riga succeeded impedisce replay dello stesso eventId anche dopo modifiche del codice.

Si può usare il pattern CAS del repository esistente per acquisire/aggiornare lease;
se servono operatori specifici, esporli solo nel repository interno dell'infrastruttura.
Non aggiungere API di aggiornamento arbitrarie al contesto pubblico plugin.

## Commit, routing e invocazione

1. Il servizio applicativo scrive dati e intent outbox nella stessa `withTransaction`.
   Il publisher scoped della callback usa la sessione corrente; callback ritentabili
   non inviano SMTP/HTTP e non creano side effect esterne.
2. Nella transazione salvare anche il destinatario logico da manifest snapshot e la
   versione contratto di ogni sottoscrizione. Non aspettare nuove installazioni future
   per decidere retroattivamente a chi consegnare.
3. Un materializer idempotente crea le delivery unique per questo snapshot e marca
   materialized atomicamente. Un crash parziale si risolve ripetendo senza duplicati.
4. Worker acquisisce una delivery con lease e ricontrolla manifest/schema/generation,
   stato loaded e policy corrente; la policy di emissione non vale come autorizzazione
   perpetua del consumer.
5. Handler riceve envelope con ID outbox e un context con identity/correlation e,
   per effetti Mongo, adapter transazionale vincolato all'owner più inbox.
6. Dopo effetti/inbox completati, ack condizionato alla lease epoch; un worker stale
   non può dichiarare successo o sovrascrivere il tentativo del nuovo owner.

Plugin non installato/rimosso: delivery blocked con reason, mai successo implicito.
Revoca: blocked-policy; riesecuzione possibile solo tramite operatore dopo approvazione,
non loop di tentativi per aggirare la policy. Evento private non crea consumer esterni.
Nuovo consumer installato dopo emissione non riceve gli eventi storici automaticamente;
backfill richiede un job esplicito con politica e deduplicazione documentate.

## Retry, deadline e ordine

Default iniziali configurabili: worker concurrency 4, lease 30 secondi, heartbeat ogni
10 secondi, 8 tentativi, backoff esponenziale 1 secondo → massimo 5 minuti con jitter,
deadline cooperativa handler 20 secondi. Validation/policy/contratto incompatibile non
sono errori transitori: blocked o dead-letter immediata secondo il motivo.

Niente ordine globale garantito. `partitionKey` abilita serializzazione per consumer e
aggregato; sequenza monotona assegnata nella transazione del dominio. Nessuna acquisizione
della sequenza successiva mentre la precedente è pending/running/retry. Una precedente
dead-letter blocca la partizione fino a replay o skip esplicito auditato. Senza partitionKey
il consumer deve tollerare riordino. Eventi di invalidazione cache sono idempotenti.

Un `Promise.race` non cancella un handler in-process. Passare AbortSignal e richiedere
handler fidati cooperativi; su deadline scaduta, fermare nuove acquisizioni di quel
consumer, mantenere la lease finché il task termina/drain e segnalare degraded.
Non fare retry concorrente del medesimo effetto mentre il vecchio handler resta vivo.
Su crash processo la lease scade e la delivery è riprendibile: effetti transazionali
inbox si deduplicano; effetti esterni seguono la regola sotto. Gli handler installati
condividono il processo del CMS e devono cooperare con cancellation e drain.

Un processo sospeso che perde heartbeat può essere ancora vivo: fencing impedisce sue
scritture Mongo successive, ma non un invio SMTP/HTTP già autorizzato. Quindi l'assenza
di duplicati esterni non è garantita dal lease. Registrare invii di esito ambiguo per
riconciliazione operatore oppure usare un provider con idempotency key; non presentarli
come effetti exactly-once sulla base della sola inbox.

## Email, webhook e payload sensibili

Garantire intent persistito e retry almeno una volta; non promettere exactly-once SMTP:
crash dopo invio e prima di ack può generare un duplicato. Message-ID deterministico è
utile ma non garantisce deduplica del destinatario. Se un provider accetta idempotency key,
usare eventId/consumer e documentare la finestra del provider. Webhook includono event ID
e firma; receiver deve deduplicare.

Il vault single-use non è sufficiente per un retry email: consumare il payload e poi
fallire SMTP renderebbe impossibile il secondo tentativo. Decisione: prima dell'invio,
trasferire il payload autorizzato dal vault a un job email encrypted-at-rest del consumer,
con claim e creazione job nella stessa transazione Mongo. Il provider job è in kernel
con owner fisso, senza allargare `PluginStorage` a namespace arbitrari; policy valutata
prima della transazione e stato/contatore ricontrollati dentro. Consumer avvia retry
solo dal job già creato, non reclama nuovamente il payload.

Job email conserva destinatario/template o messaggio cifrato, keyVersion, expiresAt,
idempotencyKey, attempt e stato; no body/codici nei log/outbox. Durata massima del job
non oltre la validità del link/token da inviare; payload scaduto → cancelled, mai invio
di un token inutilizzabile. A2 keyring applicato anche al job. Revoca del grant/plugin
blocca nuove acquisizioni dei job già materializzati. Negli handler senza secret non
serve il trasferimento vault→job.

## Operazioni e retention

API amministrativa target `/v1/system/deliveries`: list/get/retry/cancel; filtri owner,
state, event ID e range data, paginazione deterministica. Solo operatore con permessi
specifici; risposta redatta, niente plaintext. Retry usa stesso event ID; override
di un inbox succeeded richiede nuovo intent esplicito e motivazione, mai delete invisibile.

Retention iniziale: success e inbox 30 giorni, dead-letter 90 giorni; pending/blocked
non vengono cancellati automaticamente. Non eliminare inbox se una delivery può ancora
essere ritentata. Coordinare retention con durata del replay: dopo scadenza inbox,
non consentire replay automatico dell'evento; creare un nuovo job di dominio auditato.
Payload/job sensibili si eliminano 24 ore dopo terminale o scadenza; audit senza payload
resta per il periodo amministrativo. Migrazioni C0 creano indici e versioni dello schema.

Metriche: pending age, lease scadute, tentativi, durata per handler, blocked-policy,
dead-letter, queue depth. Label plugin/handler bounded; event ID solo nei log, non label
metriche. Readiness degraded se backlog più vecchio di 5 minuti o worker necessario
non disponibile; soglia configurabile, non motivo per consegnare senza policy.

Acceptance: crash dopo commit prima del materializer, dopo effetti prima di ack,
due worker sulla stessa delivery, stale epoch, riavvio, transazione ritentata, consumer
revocato/disabilitato, partition bloccata, schema incompatibile, SMTP ambiguo, vault→job
atomico, job scaduto e nessun secret in log. Modificare l'atomic publisher Editorial e
i flussi utenti/email solo dopo che questi test passano nella fixture durevole.

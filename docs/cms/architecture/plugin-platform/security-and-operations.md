# Specifica: fiducia, eventi, vault e operazioni applicative

Contratto corrente: [plugin installati fidati](trusted-plugin-model.md).

Copre checklist 1–4, decisioni PP01–PP06 e PP18. Target di implementazione; baseline
e gate nel [piano](../plugin-platform-implementation-plan.md).


Si applica il [vincolo prima del primo rilascio](../plugin-platform-implementation-plan.md):
nessuna retrocompatibilità con il codice attuale; consumer aggiornati insieme.

## A0 — Contesto plugin e confine di fiducia

**Implementato e verificato il 1 ottobre 2026**;
[consegna e risultati](../../../../workflow/tasks/done/2026-10-01-plugin-host-context-and-storage-boundaries.md).

**Codice di riferimento:** `KernelPluginRuntimeContext`, `KernelPluginEventHandlerContext`,
discovery e loader in `packages/kernel/src/contracts/` e `runtime/plugin-discovery/`.
Il manifest è validato dopo l'importazione del modulo: non è una barriera di sicurezza.

Decisione: i pacchetti in-process sono fidati, installati dal responsabile dell'host tramite
lockfile. Non accettare upload di codice o entrypoint HTTP dal pannello admin. La discovery
accetta soltanto le sorgenti configurate dall'host. Gli URL `http:`/`https:` come entrypoint
sono rifiutati; i path locali vengono risolti tramite realpath e verificati contro le root
ammesse dall'host. I workspace possono usare root di sviluppo esplicitamente configurate.
Questi controlli riducono errori di provenienza, non isolano l'importazione di codice fidato.

Contratto implementato, esportato da `kernel/contracts` e riusato da `kernel/plugin-api`:

```ts
interface PluginHostServices {
  storage: PluginStorage;       // entity/plugin ownership fissata dall'host
  events: PluginEventPublisher;
  settings: PluginSettings;     // soltanto settings propri dichiarati, secrets esclusi
  logger: PluginLogger;         // pluginId host e metadata consentiti
  operations: PluginOperationClient;
  securePayloads: SecureEventPayloadClient; // aggiunto in A2, identità fissata dall’host
}
```

`PluginStorage.repository(entityName)` non accetta un `pluginId` scelto dal consumer;
`transaction(work)` mantiene lo stesso owner/sessione. `PluginSettings` espone get/set
di settings propri dichiarati; accessi cross-plugin e secrets sono negati in questa API.
Accessi applicativi dedicati richiedono operazioni nominate e policy. Un secret
non è automaticamente leggibile perché il plugin conosce il suo nome. Il publisher è
quello già legato all'identità del plugin dal runtime. Il client di operazioni usa
contratti registrati dall'host, non un endpoint universale di business nel kernel.
Limiti implementati: findMany default/massimo 100 record, offset non negativo, niente
metadata del driver. Operazioni nominate con input validato da schema, input/output JSON
copiati (1 MiB, profondità 32), cancellation cooperativa e identità derivata dal runtime.
Il provider `pluginOperationsProvider` da `kernel/runtime` risolve dipendenze alla composizione del modulo;
il token deve essere esportato dal modulo host. Private è solo owner; chiamate cross-owner
richiedono owner loaded, permesso dichiarato dal producer e decisione rigorosamente positiva
di `CORE_TOKENS.PLUGIN_OPERATION_AUTHORIZER`. Policy assente/errata nega; la policy Core
applicativa usa contratti dei manifest in memoria; gli accessi HTTP firmati hanno
una policy separata. Non esiste un gateway CRUD universale.
I pack usano operazioni private initialize/shutdown/deliver per i propri hook/handler.
Unload/reload invalida i servizi conservati; una generazione del producer cambiata durante
la policy impedisce l'invocazione dell'operazione precedente.

Il logger ammette action/resourceId/requestId/outcome/reason/durationMs e inserisce pluginId;
scarta payload/metadata extra, tronca stringhe e redige URL, email e chiavi sensibili note.
Questa redazione non riconosce ogni segreto arbitrario: inviare messaggi fissi, senza dati
sensibili. Non è un sostituto delle regole di minimizzazione dei dati.

Sostituire `app` con `services` nei contratti plugin e aggiornare pack ufficiali,
handler ed esempi nello stesso incremento. Nessun alias o accesso legacy al container
nei contratti pubblici. Il runtime host mantiene internamente le dipendenze necessarie;
non duplicare DB/cache/auth del framework.

Acceptance: plugin di esempio privo di import interni; nessun metodo dei servizi consente
di cambiare owner; test del loader su symlink/URL/path fuori root; cold start backend senza
React. I contratti plugin non espongono `app` o il bus diretto. Questo confine API
non isola il codice fidato in-process dalle risorse Node.js.

### Ownership fisica dello storage

Ulteriore evidenza: il Mongo adapter usa `sanitizeIdentifier`, che trasforma caratteri
distinti in underscore, mentre plugin ID ammette trattino, punto, underscore e slash.
Per esempio `a-b` e `a_b` possono produrre lo stesso namespace fisico. Le collisioni
dei nomi canonici nel manifest non sono sufficienti a provarne l'assenza nel DB.

Decisione: aggiungere registro `storage_ownership` kernel con mapping unique tra tuple
canoniche `(pluginId, workspaceId, entityName)` e nome collezione fisico, vincolato anche
per physicalName. Nuove collezioni usano `v2_` più SHA-256 completo della tuple JSON
canonica, senza sanitizzazione lossy; registry conserva il nome leggibile e controlla
anche eventuali collisioni del digest. `EntityRegistry` registra owner della definizione:
il client pubblico non può usare una definizione appartenente a un altro owner.

A0 adotta direttamente ownership e naming target per le nuove installazioni e inizializza
registry e indici unici prima di CRUD/transazioni/indici di dominio, anche dopo riconnessione
a un altro DB. C0 integrerà questa stessa primitiva nel runner di migrazioni future.
Collezioni del layout precedente (`plugin_`/`kernel__`) bloccano il bootstrap storage con
un errore esplicito: nessun fallback verso un database apparentemente vuoto o reset. Non serve una fase di transizione
con nomi legacy. Se si decide di recuperare dati di sviluppo, eseguire inventario e
assegnazione verificata al singolo owner con mapping esplicito, senza rename o copia
automatica. Owner ambiguo blocca il recupero con report: nessun merge o assegnazione
arbitraria. Il kernel namespace resta riservato all'host.

Acceptance storage: owner diversi, entityName collidenti e workspace collidenti non
condividono collezioni; tentativo di repository con entity non posseduta viene rifiutato;
installazione nuova usa direttamente il naming target. Registry e indici sono inizializzati
dall'adapter A0 prima dello storage; il runner C0 riuserà questa primitiva. Il recupero dei dati di sviluppo non blocca G2.

### Transazioni dell'host e sessione condivisa

Vincolo verificato: `MongoDbAdapter.withTransaction` rifiuta repository di namespace
diverso dal namespace della callback. Lasciare questa protezione nel contratto pubblico.
Outbox, audit, locks e vault→job richiedono invece un'unità di lavoro interna all'host.

Definire `HostUnitOfWork.run(allowedNamespaces, work)` nell'infrastruttura kernel:
un'unica sessione Mongo passa a repository factory vincolate all'allowlist fissata
dall'operazione host. Il chiamante plugin non sceglie l'allowlist. Nessun export tramite
`plugin-api` o `PluginHostServices` di un raw adapter cross-namespace; il plugin ottiene
soltanto il proprio scoped adapter e API outbox/audit di alto livello con owner fissato.
Il kernel può avere accesso avanzato in-process fidato, senza presentarlo come sandbox.

Introdurre questa primitiva nell'incremento infrastrutturale A0, prima di C0/C1/C2.
Tutti i repository coinvolti devono essere ricreati con la sessione corrente; nessuna
transazione annidata o repository/sessione conservato dopo il termine. Callback possono
essere ritentate dal driver: solo effetti DB idempotenti, risultati restituiti dopo commit,
side effect esterne demandate al dispatcher. Test rollback dominio+kernel e rifiuto
namespace fuori allowlist. Transaction scope pubblico esistente conserva la sua firma.

## A1 — Policy eventi e diagnostica

**Implementato e verificato il 1 ottobre 2026**;
[consegna e risultati](../../../../workflow/tasks/done/2026-10-01-plugin-event-authorization-hardening.md).
A2 e A3 sono implementati.

Conservare `PluginEventSubscriptionAuthorizer.canSubscribe` e precedenza provider
esplicito → token DI. Protected/audit richiedono permesso dichiarato dall'owner e
decisione positiva; authorizer assente, errore o risposta invalida equivalgono a rifiuto.
Public conserva l'accesso dichiarativo; private resta limitato all'owner. Nessuna
esenzione implicita protected/audit per l'owner e nessun bypass globale.

Al binding un rifiuto fallisce il load. Alla delivery un rifiuto o errore della policy
salta quel consumer e registra diagnostica; altri consumer autorizzati proseguono.
Rivalutare la policy per ciascuna consegna, senza cache autorizzativa. Dopo ogni await
controllare lo stato e la generazione locale del plugin prima di chiamare l'handler:
la coppia pluginId/generation del binding deve essere ancora corrente. Questo evita
che un listener fotografato dal bus invochi una vecchia generazione dopo unload/reload.
Un handler già iniziato può finire; non promettere annullamento retroattivo.

Diagnostica decisa: nuova opzione additiva `onDeliveryDiagnostic` sul runtime, con evento
contenente `timestamp`, `pluginId`, `ownerPluginId`, `eventName`, `eventId`, `reason`,
`outcome: "denied" | "policy-error" | "inactive"`. Nessun payload/envelope completo.
Motivi stabili: `event_subscription_authorizer_missing`, `event_subscription_denied`,
`event_subscription_policy_error`, `plugin_generation_inactive`. L'host aggancia logger
e metriche; un errore del callback viene contenuto e segnalato senza consegnare al consumer.
La diagnostica non modifica l'union lifecycle né si pubblica sul medesimo bus.

Verifica della dipendenza locale `@trinacria/events@0.1.1`,
`dist/bus/internal-event-bus.js`: dispatch sequenziale, snapshot dei listener, errori
contenuti salvo `stopOnError`. Conservare la propagazione degli errori applicativi
dell'handler; contenere soltanto errori della policy/diagnostica nel wrapper CMS.
Il wrapper deve funzionare anche con bus configurato `stopOnError: true`.

Percorso load unico: portare preflight, binding e rollback nell'orchestrazione condivisa
che gestisce anche dipendenze caricate ricorsivamente. Non aggiungere il controllo solo
nel metodo pubblico `load`. Se binding fallisce dopo load, teardown di tutti i listener
del tentativo, rollback moduli/contributi del consumer, stato failed persistito e
diagnostica delle eventuali compensazioni fallite. Non scaricare dipendenze già condivise
con altri plugin. Retry non ripete un binding incompleto senza averlo ripulito.

Test: assenza/errore policy, dipendenze mancanti, owner/permesso falsi, due consumer
di cui uno disabilitato, cambio della configurazione dopo load, reload mentre la policy è sospesa, bus stopOnError,
callback diagnostico fallito, load di dipendenza con sottoscrizioni, rollback parziale,
unload/disable senza listener residui. Usare barriere Promise e bus reale, niente sleep
per creare le gare. Correzione del manifest dopo load fallito richiede nuovo load esplicito.

## A2 — Claim atomico, policy strutturale e rotazione vault

**Implementato e verificato il 1 ottobre 2026**;
[consegna e risultati](../../../../workflow/tasks/done/2026-10-01-secure-payload-atomic-claim-and-keyring.md),
[configurazione e rotazione](secure-payload-keyring-runbook.md).

**Evidenza della baseline precedente:** servizio e repository in `runtime/secure-payloads/` usavano read → update
filtrato per solo ID. `DbRepository.updateOne` nel Mongo adapter usa già
`findOneAndUpdate` con ritorno del documento aggiornato; può implementare compare-and-set.
La crypto conservava `keyVersion` senza usarlo per scegliere la chiave.
Riproduzione prima della correzione: 50 successi su 50 sia con max=1 sia con max=3.

Decisione: non estendere il DB pubblico con operatori Mongo arbitrari. Aggiungere
`claimAvailable(recordSnapshot, consumerId, now, retentionMs)` al repository del vault. Filter:
ID, stato available, `claimCount` esatto letto, `maxClaims` letto, versione dello schema,
eventName/payloadType/permission/producer invarianti, scadenza assente oppure > now,
consumer consentito se esiste una allowlist. Incremento e stato finale sono il patch
calcolato dal contatore letto. Quindi un singolo `updateOne` è l'operazione atomica.
Le proprietà contrattuali del payload non sono mutabili dopo create; revoke modifica
lo stato, claim il contatore. Se record malformato o count >= max, negare.

Algoritmo implementato:

1. Leggere e validare il record; controllare scadenza, stato, consumer e metadati.
2. Un divieto strutturale termina subito: l'authorizer non può trasformarlo in allow.
3. Richiedere la policy anche quando non esiste allowlist; se assente negare.
4. Decifrare e parsare localmente senza esporre il risultato; se corrotto fallire
   senza consumare il contatore. Usare `keyVersion` per scegliere la chiave.
5. Eseguire CAS; solo chi ottiene il record aggiornato può restituire il plaintext.
6. CAS perso: rileggere, rivalutare policy e riprovare massimo 3 tentativi complessivi.
   Mai restituire il record precedente; esaurimento retry restituisce conflitto.

La linearizzazione di claim/revoke del payload è il CAS Mongo. La policy locale verifica
producer/consumer attivi, evento, permesso dichiarato e sottoscrizione; la lista dei
consumer del payload rimane vincolante anche con subscription wildcard.
Un'operazione già accettata può terminare dopo un cambio della configurazione.
La scadenza usa il clock host riletto prima di inviare il CAS, con sincronizzazione
oraria richiesta: il DB può completare una richiesta dopo il deadline. Non usa un
orologio transazionale Mongo; la cancellazione TTL non è il controllo di autorizzazione.

Errori stabili: `secure_event_payload_claim_denied` con reason strutturale/policy,
`secure_event_payload_claim_conflict` per retry esauriti,
`secure_event_payload_invalid_ciphertext`, `secure_event_payload_key_unavailable`.
Nessuna risposta con ciphertext/secret dettagliati; not-found può essere uniformato
al denied all'ingresso pubblico per non enumerare identificatori.

Il consumer/produttore del client pubblico A0 è derivato dall'host, non da un campo
autodichiarato. Rimuovere il contratto che accetta identità scelte dal chiamante;
API di claim serializza solo record
sanitizzato, non `encryptedPayload`.

Keyring implementato: active key ID più mappa key ID → 32 byte; write con active, read con
versione del record. Nuove installazioni usano subito il keyring. Mappare il master
precedente a un key ID solo se si sceglie il recupero di dati di sviluppo esistenti.
In tutti gli ambienti, sviluppo compreso, nessuna chiave di fallback; richiedere materiale casuale 32 byte,
escludere placeholder e redigere un runbook: aggiungi chiave → deploy reader/writer →
attiva write → re-encrypt CAS dei record residui → verifica assenza vecchio ID → ritira.
Non cancellare una chiave richiesta da dati/backup mantenuti. Retention iniziale dei
record non disponibili: 24 ore, configurabile; mantenere l'audit separato redatto.
Il campo BSON Date `purgeAt` ha indice TTL zero: scadenza + retention alla creazione,
transizione + retention su consumo finale/revoca. Expired e revoche ripetute non estendono
il periodo. Lo starter inizializza gli indici prima dell’uso del vault.

Il CAS include `storageRevision` e i campi cifrati oltre ai metadati: una rotazione
concorrente obbliga il claim a rileggere e rivalutare la policy. Il client pubblico
`services.securePayloads` espone create/claim/revoke; schemaVersion è obbligatorio,
maxClaims 1–10, payload JSON massimo 1 MiB, allowlist vuota nega tutti.
Il token host è `SECURE_EVENT_PAYLOAD_HOST`; nessun binding o manutenzione nel client.
Gli errori infrastrutturali diventano `secure_event_payload_unavailable`; gli input
invalidi e la configurazione hanno codici redatti distinti. Core/Email sono aggiornati.

Acceptance: 50 claim concorrenti con max=1 danno un successo; con max=3 ne danno tre;
gara claim/revoke e scadenza con clock iniettato; policy permissiva non sblocca expired;
payload corrotto non consuma; miss CAS non rivela; key rotation legge v1/v2 e nega ID
sconosciuto. Integrazioni contro replica set reale e due servizi distinti.

## A3 — Identità e autorizzazione applicativa

`OperationContext` è creato e certificato dall'host: attore user/plugin/system,
source, requestId, operation e delega derivano dall'ingresso autorizzato. Copie,
JSON e ID arbitrari nel body non diventano principal validi. La delega plugin
richiede un contesto utente autenticato e conserva i suoi permessi.

`CoreOperationAuthorizer` verifica target, scope system esatto, policy del plugin
installato o del client HTTP e permessi dell'utente. `run` autorizza tutti i target
prima del lavoro, una volta per target. Le facade senza `run` chiamano `assert`
prima di invocare il servizio. ACL e controlli dinamici di workflow/stato rimangono
nei servizi e nelle transazioni di dominio; nessun counter nei grant HTTP viene
aggiornato per autorizzare una scrittura locale.

La policy dei plugin installati verifica manifest, dipendenza e owner attivo;
quella HTTP firma/autenticazione e grant corrente. Contesti system hanno allowlist
host esplicita e non possono essere creati o ampliati da `PluginHostServices`.
Dinieghi usano errori fissi e audit redatto; un errore della policy nega l'accesso.

Le operazioni pubbliche nominate attraversano schema input/output e facade, con
activity su caller e owner. Disable/reload blocca nuovi lavori, attende i task
tracciati e invalida i servizi della precedente activation. Cancellation è cooperativa;
un handler che non termina non viene ucciso nel processo del CMS.

L'[inventario dei domini](application-operation-inventory.md) contiene controlli
per Editorial, Media, Settings, Runtime, Accesso ed Email. I controller sono sottili;
principal, owner, updatedBy e approvatore provengono dal livello applicativo.

Acceptance: contesti falsi, deleghe senza permesso, system scope non previsto,
operazioni private, riferimenti obsoleti, policy fallita, workflow/ACL e CAS di dominio.
Le API operative mantengono permessi amministrativi separati per plugin management,
grant HTTP, migrazioni, delivery e audit, assegnati soltanto al ruolo admin.

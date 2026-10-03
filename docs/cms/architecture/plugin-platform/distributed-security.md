# Specifica: nonce, grant, desired state e audit condivisi

Contratto corrente: [plugin installati fidati](trusted-plugin-model.md).

Copre checklist 10, decisioni PP13–PP15. Target di implementazione;
[piano](../plugin-platform-implementation-plan.md). Dipende da A1/A3 e C0.


Si applica il [vincolo prima del primo rilascio](../plugin-platform-implementation-plan.md):
nessuna retrocompatibilità con il codice attuale; consumer aggiornati insieme.

## C2a — Autenticazione firmata e anti-replay

Evidenza in `settings/auth/plugin-auth.service.ts`: nonce registrato prima della
verifica firma, mappa locale con eviction dei primi elementi. Le firme includono
method/path/timestamp/nonce/body; `normalizePath` scarta query. Il key provider corrente
ammette segreti di 8 caratteri. Questi comportamenti devono essere migrati esplicitamente.

Contratto target `PluginNonceStore.consume(pluginId, nonceHash, expiresAt): Promise<boolean>`:
true solo al primo inserimento atomico. Implementazione production Mongo, entity kernel
`plugin_auth_nonces`, unique `(pluginId, nonceHash)`, `expiresAt` BSON Date e indice TTL.
Il generic cache adapter get/set non offre consume atomico e non è un nonce store.
Store memory solo per unit test/dev esplicito, limite pieno → rifiuto; mai eviction di
nonce ancora validi. Production/staging senza store condiviso → bootstrap fallisce.

Il registry indici attuale non espone `expireAfterSeconds`: estendere il contratto
`EntityIndexDefinition` con questa opzione validata solo per indice TTL singolo Date,
e propagare al Mongo adapter. Il repository nonce usa documenti storage con Date reale
e DTO ISO all'esterno; una stringa ISO con indice ordinario non è un TTL Mongo.

Ordine: validare struttura/lunghezze → timestamp strettamente intero → skew → caricare
chiavi → verificare firma in tempo costante → consumare nonce → identificare principal.
Firma invalida non occupa nonce. Skew massimo default 300 secondi; durata nonce copre
l'intera validità della richiesta: expiry `timestamp + skew + 1 secondo`, non soltanto
now+skew. TTL cleanup è eventuale: un record ancora presente dopo expiry può negare
riuso dello stesso nonce, comportamento sicuro; nonce nuovi devono essere casuali e
unici. Nessun nonce contenente separatori interpretati come namespace interno.

Limiti: plugin ID secondo parser attuale, nonce 24–128 caratteri ASCII ammessi, signature
esattamente 64 hex, timestamp senza suffix/frazioni. Hash nonce SHA-256 per chiave storage;
limitare richieste invalide prima delle query e non loggare secret/signature/body.
Errore store → 503, mai successo fallback memory; duplicate key → 401 replay.

Firma v2 decisa: nuovi header `x-cms-plugin-auth-version: 2` e `x-cms-plugin-key-id`,
canonical JSON con version, keyId, pluginId, method uppercase, requestTarget, timestamp,
nonce, bodyHash. Path ottenuto da URL.pathname, niente decode dei separatori percent-encoded,
hex encoding uppercase e slash finale normalizzata come v1. Query decodificata tramite
URLSearchParams, ordinata per chiave con sort stabile che mantiene l'ordine dei valori
duplicati della stessa chiave, poi encoding RFC3986 canonico (spazio `%20`, hex uppercase).
Nessuna normalizzazione Unicode del valore; preservare i codepoint applicativi.
Rifiutare encoding malformato; condividere la funzione SDK/server e usare fixture
golden dei byte firmati. Body JSON conserva array ordinati e chiavi ordinate; vietare
chiavi prototype pericolose nell'input prima della canonicalizzazione, senza ignorarle
silenziosamente nella firma di un body che l'applicazione poi interpreta.
Accettare soltanto il nuovo protocollo v2, aggiornando signer, test ed esempi insieme;
rimuovere il verificatore v1 e rifiutare versione assente o diversa. Il numero distingue
il protocollo dai byte precedenti, senza implicare una release pubblica. ID versione
entra nel materiale firmato; nessun fallback o downgrade.

Key provider: segreti generati casualmente da almeno 32 byte; key ID esplicito e rotazione
con current/previous per una finestra di rotazione configurata, indipendente dalla
compatibilità di release. Le chiavi di sviluppo precedenti non vengono rigenerate automaticamente. La query della firma non modifica l'SDK browser
per includere segreti: signing helper resta server-only in Core.

Test: due istanze, stessa richiesta → un successo; stessa firma dopo riavvio → replay;
firma invalida prima di valida con stesso nonce → valida accettata; futuro timestamp
valido e replay nell'intera finestra; cache piena, outage DB, TTL ritardato, query
alterata, query duplicate, encoding, rifiuto v1/versione assente, rotazione e header versione alterato.

## C2b — Accessi dei client HTTP firmati

`ExternalPluginHttpAccessPolicyService` valuta solo contesti plugin con source HTTP.
Le integrazioni installate non consultano questo repository: usano manifest e dipendenze
in memoria. Nessuna approvazione di eventi o claim viene richiesta dal runtime locale.

Gli accessi HTTP utilizzano `plugin_access_grants`, con ID canonico, producer/consumer,
resource/action, eventuale operation e requiredPermission. Il permesso deve appartenere
al producer. Una decisione operation-specific prevale sulla decisione generica anche
quando nega o revoca; senza approvazione l'accesso viene negato e la richiesta è pending.
Le letture valutano lo stato corrente senza cache positiva. Non vengono aggiornati counter
nei grant durante operazioni di dominio.

Record: status pending/approved/denied/revoked, revision intera, reason, approvedBy,
approvedAt, revokedAt e updatedAt. Richieste concorrenti condividono lo stesso ID;
le decisioni usano CAS expectedRevision e audit nella stessa transazione Mongo.
GET `/v1/security/plugin-grants`, GET `/{id}`, POST `/{id}/approve|deny|revoke`
richiedono i permessi amministrativi read/manage. L'identità dell'approvatore viene
stabilita dal contesto utente, senza accettare un principal dal body.

Una revoca blocca nuove valutazioni HTTP; un'operazione già accettata può terminare.
Il backoffice non contiene un centro approvazioni per i plugin installati. Le API
servono alla configurazione esplicita dei client remoti, non all'attivazione dei moduli.

Acceptance: request concorrenti, CAS delle decisioni, audit atomico, approvatore reale,
consumer/operation/permission diversi, HTTP replay e revoca alla richiesta successiva.

## C2c — Desired state e coordinamento delle istanze

La persistenza corrente del runtime non è un coordinatore multi-replica. Conservare
stato locale per diagnosi e introdurre separatamente desired state persistito:
pluginId, artifactVersion/checksum, enabled, revision, updatedBy, reason. Ogni host
annuncia instanceId, artifactSet, heartbeat, observedRevision e stato per plugin.
CAS desiredRevision per operazioni amministrative. Disabilitare una dipendenza richiesta
da plugin attivi è rifiutato; l'operatore esegue un piano esplicito sui dipendenti.

Aggiornare direttamente `/v1/system/plugins/{id}/operations` per operazioni cluster
con expectedRevision/idempotencyKey e risposta 202/operationId;
GET `/v1/system/plugin-operations/{operationId}` per stato e
GET `/v1/system/plugins` per desired/observed per istanza. Aggiornare il gruppo SDK
`system` e il backoffice nello stesso incremento. Anche una singola replica usa questi
DTO; lo stato locale resta diagnostico. Nessuna API v2 o gruppo di compatibilità parallelo.
Il comando operatore è autorizzato da `core-pack:plugins:manage`; GET usa read esistente.
Persistire operazione e desired revision nella stessa transazione; snapshot delle istanze
healthy partecipanti al submit, istanze nuove devono comunque convergere prima di readiness.
Stessa idempotencyKey e stesso input restituiscono la stessa operazione; input diverso →409.

Reconciler host verifica revision ogni 2 secondi, heartbeat 5 secondi, instance lease
15 secondi, timeout operazione 30 secondi: default configurabili. Enable/disable globale
risponde 202 con operationId finché le istanze healthy note non confermano; GET status
espone pending/succeeded/failed/partial e dettaglio per istanza. Non restituire una
snapshot locale come successo globale. Reload è locale o globale esplicitato dalla
API; una nuova versione richiede deploy di artefatti, non import hot del registro npm.

Disable nuove operazioni sensibili: il contratto applicativo e la delivery controllano
desired state corrente oltre allo stato locale per impedire accessi durante convergenza.
Un host senza accesso allo store smette di servire mutazioni/delivery protette; readiness
degraded. Dopo lease persa non può acquisire job/migrazioni. Nessun fallback memory
in staging/production per servizi di sicurezza o orchestration.

Maintenance C0 imposta writer epoch persistita; le transazioni applicative leggono e
aggiornano un fence di writer appropriato nello stesso commit prima della mutazione.
Il cambio maintenance confligge con transazioni in corso, che devono ritentare/negare;
un semplice check HTTP iniziale non basta. Fence può essere partizionato per owner per
contenere contesa, purché il piano maintenance aggiorni tutti gli owner coinvolti.
Worker esterni sono drenati prima dell'upgrade, non affidati solo al fencing DB.

Test a due host: disable durante delivery, istanza lenta/outage, desired CAS concorrente,
restart, artifact mismatch, dependency constraints e load ricorsivo; readiness non
dichiara loaded una versione diversa da desired; stale instance non scrive dopo fence.

## C2d — Audit e osservabilità

Audit separato dal buffer lifecycle corrente: kernel possiede il contratto `AuditSink`,
Core implementa store persistente. Per operazioni dati audit nella transazione dove
possibile; per negazioni di sicurezza evento best-effort a log strutturato se DB down,
senza autorizzare per compensare un audit fallito. Mutazioni grant/migrazioni non dichiarano
successo se manca la persistenza audit richiesta.

Record: ID, timestamp UTC, instanceId, actor kind/ID, owner, action, resource ID,
request/correlation ID, outcome, reason, revision/epoch e diff consentito. No secret,
body, signature, token, ciphertext o email completa. Retention iniziale 90 giorni,
configurabile; export redatto e accesso operatori read dedicato. Append-only applicativo,
non prova crittografica anti-manomissione; requisiti compliance richiedono storage esterno
immutabile separato. Query per actor/owner/time con indici bounded.

Metriche per plugin/operazione: denied/policy-error, nonce replay/store failure, durata
lifecycle, migrazioni pending, desired lag e audit failures. Label a cardinalità limitata;
request/user ID solo nei log. Integrare readiness/ops checklist senza esporre chiavi.
Gate C2 richiede suite due istanze e fault injection, non soltanto test unitari della cache.

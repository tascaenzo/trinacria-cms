# A3 — Inventario delle operazioni applicative

Contratto corrente: [plugin installati fidati](trusted-plugin-model.md).

Implementazione del 2 ottobre 2026. Contratto comune in `kernel/contracts/operations.ts`;
factory e binding dell'host in `kernel/runtime/operations/`. Questo documento descrive
il codice consegnato, insieme alla [specifica](security-and-operations.md).

## Identità e autorizzazione

Ogni facade applicativa riceve `OperationContext` come primo argomento. Gli adapter host
creano il contesto dall'utente autenticato, dal binding del plugin o da un'attività host
con scopo esplicito. Oggetti deserializzati, copie e principal nella state/body non
costituiscono un contesto: le istanze certificate sono congelate e registrate con WeakSet.
Una copia JSON non conserva la certificazione. Il requestId viene assegnato dall'host.
Il campo opzionale `operation` è fissato dal binding dell'operazione nominata.
Workspace resta opzionale e riservato all'host; A3 non introduce isolamento multi-tenant.

`CoreOperationAuthorizer` verifica il target owner/resource/action/resourceId con il
servizio Authz Core corrente per gli utenti. Per un plugin installato verifica dipendenza, owner attivo e permesso dichiarato;
con delega richiede **anche** il permesso dell'utente. La delega
si può creare soltanto a partire da un contesto utente già certificato. Non esiste
una delega ottenuta da un userId nel body o nelle opzioni di `services.operations.call`.
Policy assente, errore o decisione diversa da `allowed: true` nega.

Lo starter installa un authorizer che risolve la policy a ogni valutazione, anche se
Core viene registrato dopo il bootstrap del kernel. Non conserva decisioni autorizzative.
L'errore applicativo stabile è `operation_forbidden`, con messaggio fisso e reason
redatto; il responder HTTP lo restituisce con stato 403. I controlli di validazione,
conflitto e not-found dei domini mantengono i propri codici.

Le facade di operazioni su dati copiano gli argomenti prima di sospendere l'esecuzione
sulla policy. Gli upload copiano i metadati conservando lo stream dei byte. L'identità
per owner, updatedBy e approver viene assegnata nel livello applicativo.

## Operazioni e permessi

| Facade / dominio | Operazioni | Regola autorevole |
| --- | --- | --- |
| `EditorialEntryOperations` | create, get/list, update, delete | `editorial-pack:entries:create/read/update/delete`; ownership e assignment derivati dalla policy, mai da booleani forniti dal consumer |
| Editorial | transition | workflow effettivo nella sessione, permission configurata oppure submit/review/approve/publish; entrare **o uscire** da published richiede sempre publish |
| Editorial | snapshot, list revisions, restore | entries:update, revisions:read/restore; ownership; scrivere o ripristinare un contenuto pubblicato richiede anche publish |
| `ContentTypeOperations` | create, read/list, update, delete/restore/hard-delete | content-types:read/manage; owner di creazione host; modelli popolati rifiutano cambi distruttivi senza migrazione |
| `MediaAssetOperations` | get/list, update/visibility, delete | assets:read/update/delete più ACL; list filtra ACL **prima** di offset/limit, in batch da 100 |
| Media | shares asset/directory, access URL | shares:manage più ACL share; URL richiede assets:read più ACL read, asset ready e scadenza intera 1–3600s |
| Media | validateUse | assets:read, actor derivato dal contesto; preserva ready/publication/visibility e restrizioni delle referenze |
| `MediaDirectoryOperations` | read/list, create/update/delete | assets:read per lettura, directories:manage per mutazioni; ACL sul nodo e parent di destinazione, controllo ciclo/nonempty esistente |
| `MediaUploadOperations` | start, receive, complete | assets:upload, sessione del principal; replacement richiede assets:update e ACL write **a ogni fase**, destinazione richiede ACL write |
| Media | cleanupExpired | solo actor system con purpose media-cleanup e scope media-pack:assets:delete; retention e retry delle tombstone esistenti |
| `SettingsOperations` | read/list/groups/export, definition/value write | utenti: core-pack:settings:read/write; plugin: contratto settings read/write dell'owner della chiave, identità fissa e regole owner/visibility/mutable del servizio |
| Settings | secret metadata/reveal/write | settings.secrets:read/write separati; ownership; nessun plaintext nel client `services.settings` |
| Settings | accessi dei client HTTP firmati | core-pack:plugin-grants:read/manage; decisioni CAS e audit con principal reale |
| `UsersOperations` / `AuthFlowOperations` | profili, stato, creazione, invito | core-pack:users:read/write; invito protetto prima di token/evento email |
| `RolesOperations`, `PermissionsOperations` | read/list, create/update/status | core-pack:roles:read/write oppure permissions:read/write |
| `UserAccessOperations` | list/resolve, assign/remove role | users:read; assegnazione/rimozione richiede users:write **e** roles:write |
| `RoleRulesOperations` | list, create/update/delete policy rules | core-pack:roles:read/write; validazione permission pattern e ownership del ruolo conservate |
| `KernelSystemOperations` | cataloghi/plugin/events/contributi/admin manifest | core-pack:plugins:read; il guard admin delle route resta obbligatorio |
| Runtime | load/unload/reload/enable/disable | core-pack:plugins:manage nel contratto applicativo; il runtime conserva controlli di dipendenze, generazioni e rollback |
| `EmailTemplateOperations` | list/get/render/upsert | email-pack:settings:read/write; validazione e variabili del servizio template |
| `EmailDeliveryOperations` | send | email-pack:email:send; destinatari 1–100, email ≤254 caratteri, subject ≤200 senza CR/LF, text/html ≤1 MiB e replyTo senza CR/LF |

Media deriva anche l'identità plugin per le ACL, senza accettare roleCodes autodichiarati.
In una delega, entrambe le identità devono soddisfare le ACL dell'oggetto. I record
continuano a usare ownerUserId: per un plugin senza delega l'identificatore contabile
è `plugin:<id>`; non viene passato ad Authz come se fosse un utente.

Le primitive di validazione Media usate dal renderer/editor interno rimangono
dipendenze host: non rendono accessibili i repository ai consumer dei servizi plugin.
La health dei provider è una lettura host protetta dalla route settings:manage.
La consegna locale firmata è un ingresso di capability: verifica firma e scadenza
nel provider, richiede asset ready e non minta un falso utente. Una URL già emessa
può funzionare fino alla propria scadenza; A3 non promette revoca retroattiva della URL.

## Transazioni Editorial

Entry, revisioni e modello sono ricreati con lo stesso adapter della sessione Mongo.
Le mutazioni richiedono replica set. La lettura del modello è seguita da una fence CAS
sulla sua versione; un aggiornamento concorrente del modello causa write conflict e
retry del driver. Versione del modello e della entry sono distinte. La versione del
modello avanza anche per la fence, senza modificare updatedAt o riordinare i modelli.

Ogni callback ritentata ricontrolla azione, workflow e scope di ownership. Gli intent async vengono scritti nell’outbox nella stessa transazione dominio;
la consegna avviene dopo il commit tramite C1, con inbox e retry per consumer.
Un restore ripristina il contenuto, preservando lo stato corrente della pubblicazione.
I test con barriere Promise su Mongo reale provano il cambio workflow durante la
transizione e il cambio schema durante la creazione della prima entry.

## Integrazioni locali e accessi HTTP

Le chiamate nominate richiedono dipendenza dichiarata, owner attivo, operazione pubblica,
schema e permesso del manifest. Le facade autorizzano ogni target prima di eseguire;
una transizione controlla anche workflow, ownership e permessi delle azioni effettive.
Nessun grant persistito governa queste integrazioni.

L'host registra operazioni nominate Editorial entries.create/get/update/transition/restore,
Media assets.get/list/access-url/delete ed Email send. Richiamano le stesse facade
usate dall'HTTP. Gli altri metodi applicativi sono contratti per la composizione host;
non esiste un gateway CRUD o un container risolvibile da `PluginHostServices`.
`services.settings` permette soltanto chiavi proprie dichiarate, nonsecret e mutable
per le scritture, con controllo della generation e transazione host Core/owner.

I client HTTP firmati usano `ExternalPluginHttpAccessPolicyService` e decisioni
persistite con scope resource/action e operation opzionale. Le API amministrative
verificano il permesso plugin-grants:read/manage; approvedBy deriva dall'utente
certificato. Decisione CAS e audit sono atomici. La revoca blocca nuove valutazioni,
senza annullare operazioni già accettate. Per i dettagli vedere la
[specifica dei client HTTP](distributed-security.md#c2b--accessi-dei-client-http-firmati).

## Composizione privilegiata dell'host

System è host-only; purpose ammessi: manifest-provisioning, plugin-bootstrap, migration,
media-cleanup, secure-email-delivery e public-delivery. Lo scope public-delivery
consente soltanto letture dei domini delivery Editorial e asset Media; i servizi
verificano snapshot, projection corrente e ACL senza leggere pubblicamente la working copy. L'allowlist è copiata, congelata e non usa wildcard.
Con resourceId è limitata a quella risorsa; senza resourceId ammette la sola azione
sul dominio indicato. Non esiste una promozione implicita a system per un plugin.

Bootstrap manifest, auth/installation, config, provisioning e seed statici utilizzano
implementazioni private nella composizione fidata dell'host, necessarie anche prima
che i permessi esistano. Queste primitive non sono ingressi business per i plugin.
Gli hook initialize/shutdown restano operazioni private del rispettivo owner. Il timer
Media usa un contesto system esplicito limitato alla pulizia; il delivery Email usa
uno scope email:send creato solo **dopo** il claim autorizzato A2. Il consumer esterno
non può chiamare il private deliver. Login/register/reset/verification mantengono i
propri contratti di credenziali/token monouso: non si richiede un amministratore a
chi deve autenticarsi o installare il sistema per la prima volta.

A3 non considera gli export host dei pack una sandbox: il riordino degli export pubblici
resta B0. I plugin ricevono servizi e DTO, senza container/repository applicativi.
Il codice dei plugin installati rimane fidato secondo A0.
C0 espone il runner tramite CLI di deploy locale; C1 espone le route deliveries
e email-jobs, C2 le decisioni grants, audit e operazioni cluster con revisioni/epoch. I relativi nuovi permessi sono già nel manifest Core, assegnati al solo
ruolo admin; editor e viewer non ricevono privilegi operativi nuovi.

## Verifica

Test di contesti falsi, doppia delega, scope system, policy redatta, grant esatti/revocati,
HTTP 403, chiamate interne negative in tutti i domini, principal/approver del body,
paginazione Media, fasi replacement e gare Editorial su replica set.
I risultati di consegna sono registrati nel task A3 e nel changelog M8. Nessun reset
automatico dei database di sviluppo; solo fixture dedicate di test.


## Delivery e preview E0

Ripubblicazione: `entries.publication`, permesso entries:publish e expectedVersion.
Snapshot, pointer, revisione e intent sono atomici; edit/restore non modificano
lo snapshot attivo. Le API anonime applicano allowlist esplicita e verificano
pointer/projection/Media anche prima di ETag/304. Preview usa chiavi dedicate,
exchange atomico monouso, sessione hash-only e utente/read/ownership ricontrollati.
Le prove nuove sono nei test publications, delivery e preview e nella suite Chromium.

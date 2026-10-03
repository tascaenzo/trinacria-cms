# Runtime distribuito: procedura operativa implementata

Questo runbook riguarda il profilo **multi-istanza esplicito**. Per una sola istanza
seguire il [modello standard](trusted-plugin-model.md). Nel playground il cluster si
attiva solo con `PLAYGROUND_CLUSTER_ENABLED=true`; non è necessario per usare plugin.

Stato del codice al 2 ottobre 2026. Integra C0/C2; non dichiara il gate G3 di un
ambiente di produzione soddisfatto dai soli test locali. Non è stata pubblicata una release.

## Avvio e identità degli artefatti

L'host configura `CmsStarterOptions.cluster` con un instance ID unico e, per ciascun
plugin, versione e `computePluginArtifactChecksum(packageRoot)`. Il checksum include
package.json e tutti i byte distribuiti in dist; symlink e percorsi esterni sono rifiutati.
L'identità di un'istanza ha lease Mongo ed epoch; due processi vivi non condividono l'ID.
Default: heartbeat 5 s, lease 15 s, riconciliazione 2 s e timeout operazione 30 s.

L'avvio registra i plugin prima di caricare codice applicativo. Il desired state persistito
prevale sulla configurazione iniziale: il riavvio non riabilita un plugin disabilitato.
Artefatti differenti producono readiness degradata. Il controllo delle scritture tocca
lease e revisione del desired state nella stessa transazione del dominio, prima del lavoro
e prima del commit. Scadenza durante il lavoro, revoca e takeover annullano le scritture.
Le letture di sicurezza usano il primary. Una perdita di Mongo non attiva fallback locali.

## Comandi amministrativi

Leggere `/v1/system/plugins/{pluginId}` e la sua `cluster.desired.revision`; inviare
POST `/v1/system/plugins/{pluginId}/operations` con operation, expectedRevision,
idempotencyKey univoca e reason. L'actor viene dalla sessione dell'operatore.
La risposta HTTP 202 contiene operationId. Leggere
`/v1/system/plugin-operations/{operationId}` fino a succeeded, partial o failed.
Un'accettazione non equivale al completamento: tutti i partecipanti vivi fotografati
alla richiesta devono osservare la revisione e confermare il drain/caricamento.
Stessa chiave e stesso comando restituiscono la stessa operazione; payload diverso dà 409.

`load` e `enable` impostano enabled=true e caricano sulle istanze; `disable` e `unload`
impostano false e drenano gli handler/operation facade. `reload` incrementa la revisione
e ricrea il runtime sulle istanze. Nessuno di questi comandi scarica o aggiorna npm.
Dipendenze obbligatorie e cambi concorrenti tra plugin vengono controllati nella transazione.

## Deploy di una versione

1. Verificare il backup con il modulo deploy host locale e usare `cms migrations plan`.
2. Disabilitare i dipendenti necessari secondo un piano esplicito; disabilitare il plugin
   e attendere succeeded. Risolvere gli ack mancanti, senza interpretarli come successo.
3. Attivare maintenance per l'owner e applicare le migrazioni con il runner C0.
4. Preparare il nuovo host compilato e inventario dei veri artefatti. Il modulo CLI
   esporta createMigrationDeployHost e fornisce runner, cluster, getPlugin,
   authenticateOperator e close; authenticateOperator deve certificare canDeploy=true.
5. Eseguire `cms plugins deploy --host ./deploy-host.mjs --plugin catalog-plugin
   --expected-revision N` con CMS_OPERATOR_TOKEN dell'operatore. Il comando verifica
   schema/checksum delle migrazioni; adoptDeployedArtifact richiede maintenance, desired
   disabilitato e drain di ogni altra istanza viva. La propria istanza CLI non carica codice
   di dominio. Il cambio di versione/checksum/revisione e audit sono atomici.
6. Sostituire gli host con il nuovo build; i vecchi artefatti restano bloccati. Verificare
   il preflight, togliere maintenance ed abilitare dalla nuova versione. Attendere tutti
   gli ack e readiness, poi completare i controlli applicativi. Un vecchio host non può
   abilitare l'artefatto nuovo. Restore/downgrade segue il runbook C0, senza reset dei dati.

## Firma e grants

Signing v2 obbligatorio: sei header, key ID esplicito e HMAC su metodo, target completo
con query, timestamp, nonce e hash JSON canonico. SDK e Core usano copie generate dalla
stessa utility; signing:check impedisce deriva. Chiavi di almeno 32 byte UTF-8, anello
current e previous con scadenza esplicita. V1 non è accettato. Il nonce viene inserito
in Mongo soltanto dopo la firma valida: unique owner/hash e expiresAt BSON Date.
Il TTL pulisce i record, non determina da solo validità o finestra antireplay.

I grant persistiti riguardano solo client HTTP firmati, con identità normalizzata,
CAS e audit tramite `/v1/security/plugin-grants`. Le integrazioni installate usano
manifest locali; l'avvio non crea approvazioni per Email o altri plugin.

## Audit e verifica

`/v1/security/audit` richiede audit:read e unisce grant/security audit Core e audit kernel
(migrazioni, lifecycle, desired state e deploy). La projection esclude payload, ciphertext,
backup reference e credenziali. Mutazioni e audit condividono la sessione; dinieghi
applicativi sono best-effort, con contatori bounded anche se lo store audit non risponde.
Retention iniziale 90 giorni con Date Mongo. Metriche interne di firma/replay/store failure,
policy denial/audit failure e desired lag non usano event ID come label.

Prove locali eseguite: due connessioni/istanze, nonce condiviso e restart, grants concorrenti
con audit rollback, revoca sul secondo host, drain reale di lavoro in corso, desired CAS,
restart disabilitato, artefatto differente, timeout partial, deploy sotto maintenance,
scadenza prima del commit e connessione Mongo chiusa. La replica set di sviluppo non è
stata resettata; i test rimuovono solo i propri database temporanei.

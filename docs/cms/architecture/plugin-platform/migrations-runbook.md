# Migrazioni e rimozione: procedura operativa C0

Superfici experimental in `@trinacria-cms/kernel/runtime`. Mongo replica set obbligatorio;
nessuna migrazione parte dal load, da enable o da un update del modello Editorial.
C0 fornisce runner, registro, fencing, writer guard e CLI; gli ack delle istanze e il
coordinamento globale sono il requisito C2 ancora aperto. Non dichiarare G3 completato
finché quel gate e la prova di staging non sono verificati.

## Preparare il plugin e l'host

Ogni entità del manifest dichiara `schemaVersion`. Migrazioni distribuite: ID `0001-...`,
file compilati presenti nel tarball, checksum SHA-256 restituito da
`computeMigrationChecksum(packageRoot, sourceFiles)`, entità proprie e passaggio N→N+1.
Il manifest contiene metadata serializzabili; `KernelPluginDefinition.migrations`
contiene gli stessi metadata e la funzione `run`. File e checksum di un passo registrato
non si modificano: aggiungere una nuova migrazione. I contratti restano experimental.

`startCmsApp` controlla lo schema prima di eseguire moduli/hook del plugin. Lo schema
corrente può essere inizializzato solo su un'entità vuota; dati presenti senza registro
sono bloccati e richiedono recupero esplicito. Per migrazioni configurare
`migrations.packageRoots[pluginId]` con la directory reale dell'artefatto distribuito.
Il controllo registra come `baseline` i passi precedenti di uno schema installato vuoto;
questo stato indica inizializzazione, non esecuzione della trasformazione.

Il deploy host esporta `createMigrationDeployHost()` da un modulo JS locale compilato:
`runner`, `getPlugin(id)`, `authenticateOperator(token)`, `verifyBackupReference(ref,id)`
e `close()`. `getPlugin` restituisce manifest, definizioni, artifactVersion e SHA-256
dell'artefatto verificato, più namespace opzionale. L'autenticazione deve validare identità
e permesso operatore tramite il provider del deploy; una stringa actorId nel body non è
una credenziale. La verifica backup appartiene all'infrastruttura e deve controllare
integrità e una prova restore. La fixture in `scripts/release/fixtures/migration-host.mjs`
è solo un test, con una credenziale effimera e un piccolo backup dati verificato.

## Upgrade

1. Verificare tarball/inventario checksum, versioni esatte e dipendenze. Conservare gli
   artefatti N e N+1 e l'identità del backup nello stesso registro di deploy.
2. `cms migrations plan --host ./deploy-host.mjs --plugin catalog-plugin`: legge metadata,
   checksum e stato; non chiama `run`, non modifica il registro e non simula effetti esterni.
3. Attivare maintenance per gli owner interessati tramite `PlatformMaintenance.set`,
   fermare dispatcher/job e attendere drain/ack da tutte le istanze note. Il writer guard
   tocca la fence nella stessa sessione Mongo della mutazione; le sole verifiche HTTP
   iniziali non sostituiscono questo controllo. I fence sono partizionati per owner.
4. Eseguire un backup completo tramite l'infrastruttura Mongo, verificarne hash/integrità
   e ripristinarlo in un database isolato prima di autorizzare un passo distruttivo.
5. Fornire `CMS_OPERATOR_TOKEN` attraverso il secret store del deploy, poi eseguire:

   ```sh
   cms migrations apply --host ./deploy-host.mjs --plugin catalog-plugin
   # Solo per i passi dichiarati destructive, con backup verificato dall'host:
   cms migrations apply --host ./deploy-host.mjs --plugin catalog-plugin \
     --allow-destructive --backup backup-reference
   ```

6. `cms migrations status --host ./deploy-host.mjs --plugin catalog-plugin`: verificare
   applied/checkpoint/attempt/epoch. Il runner rilascia la lease, mantiene la maintenance.
7. Distribuire N+1 e verificare schema, readiness, artefatti su tutte le istanze e flussi
   applicativi. Disattivare maintenance e riavviare worker soltanto dopo gli ack C2.

Lease default 30 secondi, heartbeat 10; epoch monotona e scrittura del lock nella stessa
sessione di dati, checkpoint, versione e audit. Due runner non possiedono la stessa lease.
Un runner stale non può sovrascrivere dati o storia dopo takeover. Le callback transazionali
possono essere ritentate da Mongo: nessuna rete o effetto esterno dentro `run`.

Batch: massimo/default 500, keyset ID stabile, filtro di vecchia versione e trasformazione
idempotente. Restituire `{ done, checkpoint }` (JSON ≤64 KiB) con avanzamento del cursor.
Dati e checkpoint committano insieme; un crash conserva l'ultimo batch completo.
Passi index possono chiamare `context.ensureIndexes()` solo per entità dichiarate, senza
repository transazionali. Creare il sostituto prima di eliminare indici precedenti;
DDL non è atomicamente annullabile e richiede riconciliazione prima della ripresa.

## Errore e recupero

Conservare maintenance. La storia memorizza codici redatti, senza body/token/stack.
Un passo failed o interrotto si riprende automaticamente solo se idempotente, dopo
revisione esplicita, con `--resume`. Un passo non idempotente richiede il suo runbook;
non forzare lo stato applied. Checksum mutato o catena incompleta bloccano il piano.

Un artefatto N non si carica se il registro richiede lo schema N+1. Preferire una
correzione forward; se necessario ripristinare il backup verificato insieme ai binari
corrispondenti e accettare esplicitamente il punto di ripresa dei dati. Non esiste un
comando down universale. Nessun database di sviluppo viene resettato dal runner.

## Uninstall e purge

`PluginRemovalService` è un'orchestrazione host, distinta da unregister. Richiede callback
per autorizzare l'operatore, drenare tutte le istanze, revocare credenziali/grant, staccare
l'artefatto e pianificare/verificare le referenze di purge. Il servizio non inventa una
procedura per eliminare file o collezioni di un dominio che non conosce.

Uninstall: blocca dipendenti obbligatori/migrazioni attive, attiva maintenance, drena
operation facade e handler, disable/unregister e rimozione integrazione/artefatto. Conserva
dati e storia schema. Intento e risultato sono audit separati; un errore dopo un effetto
esterno richiede riconciliazione dell'operatore, senza fingere rollback della distribuzione.

Purge: operazione separata con backup, owner esplicito per ogni risorsa, piano riletto,
assenza di referenze e delivery pendenti. Collezioni kernel condivise si filtrano per owner;
mai cancellare collezioni globali. Audit minimo resta conservato. Un handler che ignora
il segnale di drain resta attivo: dopo timeout massimo 30 secondi il comando fallisce,
nessun dato si cancella sotto quel codice; arrestare l'istanza e rieseguire il preflight.

Verifiche automatiche: upgrade/crash/checkpoint, due runner/takeover, indice duplicato
con recovery, writer HTTP/DB in maintenance, uninstall che conserva dati e rifiuta
handler non drenati, purge con referenze/owner errato, CLI nel tarball senza workspace,
backup/restore della fixture e smoke backup Mongo completo in Chromium. La prova su
più host in staging resta il gate C2/G3, non è sostituita dai test locali del runner.

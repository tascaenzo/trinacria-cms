# Specifica: migrazioni, upgrade e lifecycle operativo

Copre checklist 8 e parte del 10; decisioni PP11 e PP15. Target di implementazione;
[piano](../plugin-platform-implementation-plan.md).


Si applica il [vincolo prima del primo rilascio](../plugin-platform-implementation-plan.md):
nessuna retrocompatibilità con il codice attuale; consumer aggiornati insieme.

## C0 — Migrazioni come operazione di deploy

Il CMS resta Mongo-first. Non introdurre un adapter multi-database o assumere che
`beginTransaction()` renda transazionali repository creati fuori dalla sessione.
Usare `DbAdapter.withTransaction` e repository restituiti dall'adapter della callback.
È richiesto un replica set; mancanza di questa capability è un errore di preflight.
Per passi con locks/registry kernel e dati plugin usare `HostUnitOfWork` A0 con allowlist
host; non rimuovere il controllo namespace dalla transazione pubblica per risolvere
questa dipendenza. La stessa sessione deve coprire batch, checkpoint e lock fence.

Migrazioni sono file di codice del pacchetto fidato, referenziati dalla definizione plugin
e descritti da metadata serializzabili nel manifest. Non salvare funzioni nel DB.
Contratto target:

```ts
interface PluginMigrationDefinition {
  id: string; // ordinamento sequenziale stabile, es. 0001-add-status
  checksum: string;
  fromSchemaVersion: number;
  toSchemaVersion: number;
  kind: "transactional" | "batched" | "index";
  destructive: boolean;
  run(context: MigrationContext): Promise<void>;
}
```

La versione dati è per entità dichiarata, separata dalla versione pacchetto. Ogni
migrazione elenca entità/namespace interessati, prerequisiti e intervallo dati. Supportare
catene complete, non saltare automaticamente versioni. Checksum SHA-256 del contenuto
canonico dei file distribuiti della migrazione: fissato durante il build, immutabile dopo
release. Se il checksum di una migrazione applicata cambia, bloccare upgrade e richiedere
una nuova migrazione; non sostituire il record di storia.

Comandi CLI da distribuire con kernel: `cms migrations plan`, `apply`, `status`;
`plan` legge stato/schema/dipendenze e restituisce azioni, non esegue il codice `run`.
Non promettere un dry-run generico capace di simulare codice con effetti esterni.
`apply` richiede versione artefatti, maintenance attiva e token operatore valido.
Per `destructive` richiedere backup reference e flag esplicito; mai dal normale update
del modello o dalla pagina enable del plugin. La prima CLI è locale sul deploy host,
non un endpoint che esegue codice arbitrario.

Collezioni kernel dedicate:

- `plugin_migrations`: pluginId, namespace/workspace, migrationId, checksum,
  from/to, status pending/running/applied/failed, attempt, checkpoint, lockEpoch,
  actor, timestamps ed errore redatto. Indice unico sulla tripletta owner/namespace/id.
- `plugin_schema_versions`: entità, owner/namespace e versione applicata.
- `platform_locks`: key, ownerInstanceId, epoch, leaseUntil e heartbeat.

Acquisizione lease atomica, rinnovo ogni 10 secondi, durata iniziale 30 secondi.
Epoch monotona, controllata nelle scritture di migrazione: una nuova lease invalida
un vecchio runner. Per passi transazionali leggere/aggiornare il documento lock nella
stessa transazione delle modifiche dati e del registro applied, generando conflitto
se l'owner cambia. Testare veramente la concorrenza; una lettura isolata della lease
prima della transazione non è fencing sufficiente.

Migrazioni grandi: batch iniziale 500 documenti, keyset cursor con ID stabile,
checkpoint persistito nella stessa transazione del batch, trasformazione idempotente
e filtri versione old→new. Se una migrazione non è idempotente non può essere ripresa
automaticamente: status failed, recovery esplicito. Indici tramite passo `index`:
creare il sostituto prima di rimuovere il precedente, validare duplicati e registrare
lo stato. DDL/nontransactional non promette rollback atomico: per un lock perso fermare
e riconciliare lo stato effettivo prima di riprendere. Nessuna rete esterna dentro
migrazioni transazionali o callback ritentabili.

## Procedura upgrade decisa

1. Verificare tarball/checksum, dependency graph, range core/admin e piano delle migrazioni.
2. Attivare maintenance: writer HTTP/job/plugin devono rifiutare nuove mutazioni;
   attendere in-flight e fermare dispatcher, ottenendo ack dalle istanze note.
3. Eseguire backup verificato; prova restore periodica in ambiente separato.
4. Un runner esegue le migrazioni; gli altri host restano read-only/non-ready per scritture.
5. Avviare artefatti N+1, verificare schema e dipendenze, caricare plugin e provare i flussi.
6. Rimuovere maintenance e riavviare worker soltanto dopo readiness di tutte le istanze.

Prima release: upgrade con finestra maintenance. Rolling upgrade e dual-write non sono
supportati implicitamente. Il bootstrap può creare uno schema nuovo vuoto, ma su DB
esistente blocca plugin con schema incompatibile e segnala migrazioni pending; niente
modifica automatica dei dati al load. Host instance lease/ack definiti in C2.

Recupero: su errore mantenere maintenance e registrare step/checkpoint. Riprendere
soltanto migrazioni idempotenti; altrimenti runbook specifico. Downgrade consentito solo
quando manifest vecchio dichiara compatibilità con lo schema attuale. Se incompatibile,
restore del backup con binari corrispondenti e accettazione esplicita del punto di ripresa
dati; una compensazione forward è preferita se validata. Nessun comando `down` universale.

## Disable, unregister e cancellazione

| Azione | Effetti decisi |
| --- | --- |
| unload | Ferma moduli/handler locali, conserva dati e preferenza globale |
| disable | Desired state disabled, blocca nuove delivery/operazioni, conserva dati/grant audit |
| enable | Desired state enabled, caricamento dopo controllo dipendenze e schema |
| reload | Nuova generazione locale del codice già distribuito, non installa una nuova versione |
| unregister | Rimuove definizione runtime quando non loaded e senza dipendenti obbligatori |
| uninstall | Drain, revoca credenziali/grant attivi, rimuove integrazione host e artefatto; conserva dati |
| purge | Operazione distinta distruttiva, operatore autorizzato, backup e piano delle referenze |

Unregister esistente mantiene la sua semantica; aggiungere un'orchestrazione uninstall
senza trasformare implicitamente il suo hook in eliminazione dati. Bloccare uninstall
con dipendenti obbligatori o migrazione in corso. Nessuna cascata automatica di plugin
e referenze editoriali/media. Un piano purge elenca collezioni, file, relazioni e delivery
pendenti; dati kernel condivisi si eliminano per owner, mai collezioni globali intere.
Audit minimo di rimozione resta conservato. La rimozione dal registro npm non è uninstall.

Worker su disable: nessuna nuova acquisizione; handler in corso ha drain cooperativo
fino a 30 secondi. Se non termina, istanza degraded e operazione non dichiarata riuscita.
Un timeout Promise non ferma codice JavaScript. Uninstall/purge attendono o richiedono
arresto dell'istanza; non cancellare dati sotto handler ancora attivi.

## Test e responsabilità

Kernel possiede registry, locks, runner e lifecycle; plugin possiede trasformazioni dati
e invarianti; host/infra possiede backup, maintenance e distribuzione binari. Nessun
dominio Editorial/Media entra nel runner generico.

Test: upgrade di fixture N→N+1 con dati reali, checksum modificato, catena incompleta,
due runner, lease scaduta/runner stale, crash tra batch/checkpoint, fallimento indice,
backup/restore, writer che tenta di operare in maintenance, downgrade incompatibile,
uninstall con dipendenti, purge con referenze e handler non drenato. Test fencing deve
dimostrare che l'owner precedente non può completare una nuova scrittura dopo il takeover.

Gate: nessun dato cancellato da load/disable/unregister; migrazione fallita non sblocca
readiness; registro recuperabile e runbook applicato in staging prima di release.

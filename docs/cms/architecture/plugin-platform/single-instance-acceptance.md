# Consolidamento: acceptance su singola istanza

Il profilo standard usa plugin fidati nello stesso processo Node.js, un CMS e Mongo
replica set. Redis/S3 sono opzionali. La prova multi-replica resta nel gate G3.
Questo registro è pronto per il team; lo staging e il partecipante indipendente
devono ancora essere assegnati. Nessun risultato automatico sostituisce queste prove.

## 1. Artefatto riproducibile — maintainer

Da un checkout pulito del commit candidato, con Node di `.nvmrc` e npm del manifest:

```sh
npm ci
npm run check
npm run build
npm run sdk:check
npm run storybook:build
TRINACRIA_RUN_MONGO_INTEGRATION=1 npm run test:integration -- --concurrency=1
TRINACRIA_RUN_MONGO_INTEGRATION=1 npm run test -w @trinacria-cms/playground
npm run e2e:ci
npm run release:pack
npm run release:test
```

Le integrazioni e i browser usano DB dedicati; eseguirli in sequenza. Attivare
esplicitamente anche Redis/S3 se previsti dal deployment, impostando endpoint e
credenziali del solo ambiente di prova. Installare Chromium prima di `release:test`.
Conservare commit, runtime, lockfile, log, inventario SHA-256 dei tarball e report
redatti della fixture. La CI conserva i report; serve il suo esito sul commit candidato.
Non pubblicare la versione interna 0.1.0 senza la decisione di release G2.

## 2. Installazione e lifecycle — sviluppatore del team

Su un DB nuovo dedicato allo staging, configurare Mongo replica set, JWT e keyring
secondo `.env.example`; verificare la pagina prerequisiti prima del wizard. Completare
il setup vuoto, entrare nel backoffice, creare un contenuto e un media. Ripetere il
setup demo su un secondo DB di prova: riavvio e hook non devono duplicare dati.

Installare lo starter da tarball nell'host esterno. Verificare 401 anonimo, 403 senza
permessi, CRUD autorizzato, settings propri, evento nel consumer e chiamata pubblica.
Provare unload/reload con i dipendenti drenati: una sola route/provider, servizi
precedenti invalidi. Disable blocca l'uso; enable/load lo ripristina. Uninstall conserva
items/observations. Purge non fa parte di questa acceptance.

Compilare il [registro indipendente D0](external-plugin-human-acceptance.md) con tempi,
ostacoli ed evidenze. Il partecipante deve essere diverso dall'autore dello starter.

## 3. Upgrade e recovery — responsabile del deployment

Prima della prova scegliere host, URL, DB sorgente e DB di restore distinto; documentare
storage locale/S3, supervisor, root dei pacchetti, keyring e strumenti backup disponibili.
Usare dati di prova rappresentativi, un file con digest noto e un account verificato.
La root del provider media locale viene risolta all'avvio: dopo modificarla nei settings,
riavviare prima di verificare upload/download o creare il backup.

1. Bloccare nuove scritture e fermare CMS/worker con il supervisor del deployment.
   Conservare pacchetti e admin precedenti; registrare lo stato delle delivery pendenti.
2. Creare un backup completo con lo strumento Mongo approvato per quell'ambiente.
   Copiare media locali o snapshot/versioni degli oggetti S3, configurazione e keyring.
   Conservare chiavi e credenziali nel secret store, separatamente dal report pubblico.
   Registrare digest, timestamp e coerenza del punto di arresto.
3. Installare il pacchetto aggiornato e usare `cms migrations plan/apply/status` con
   il deploy host configurato secondo il [runbook migrazioni](migrations-and-lifecycle.md).
   Controllare checksum, schema e dati conservati; ricompilare l'admin se cambia il renderer.
4. Riavviare, verificare `/ready`, login, contenuti, media, CRUD e consumer durevole.
5. Arrestare la copia di restore; ripristinare il backup su DB e storage distinti e vuoti.
   Ripristinare anche configurazione, chiavi e pacchetti della stessa versione del backup.
   Non puntare la copia alla coda o ai media scrivibili dell'istanza originale.
6. Avviare la copia, verificare login, stato installato, schema/indici, dati e digest del
   file; controllare readiness e ripresa delle delivery. Annotare RTO misurato e punto
   di recovery. Un downgrade del solo codice non costituisce rollback dei dati.

La fixture automatica prova BSON, indici, media locali e configurazione su DB dedicati.
Il suo helper `catalog-recovery.mjs` è specifico della fixture: non usarlo come utility
di backup del deployment. Il risultato locale non valida snapshot S3, procedure del
supervisor, TLS/reverse proxy o recovery dello staging.

## 4. Misure e decisione — reviewer

Registrare hardware, versione Node/Mongo, plugin caricati, RSS, tempi di cold start e
latenza p50/p95 con numero di richieste e concorrenza dichiarati. Le 50 letture seriali
della fixture forniscono una baseline locale; la capacità del deployment richiede
il carico rappresentativo concordato dal team, senza soglie inventate dal test.

| Gate | Evidenza richiesta | Stato del team |
| --- | --- | --- |
| CI del candidato | URL run, commit, artifact digest | Da eseguire dopo push |
| D0 indipendente | Registro, partecipante, tempi e ostacoli risolti | Da assegnare |
| Singola istanza | URL/host, primo avvio e lifecycle | Ambiente da assegnare |
| Recovery | Backup, media/chiavi, restore e RTO | Da eseguire sullo staging |
| G2 | Reviewer e versione pubblicabile concordata | Aperto |
| G3/G4 | Multi-replica / sito pubblico nello staging | Gate separati, aperti |

Un esito fallito richiede correzione e ripetizione del passaggio con il nuovo commit.
Non inserire password, token, payload sensibili o backup nei documenti versionati.

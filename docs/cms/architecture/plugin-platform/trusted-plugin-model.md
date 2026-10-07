# Modello standard dei plugin fidati

Decisione approvata dal maintainer il 3 ottobre 2026. Questo documento prevale sulle
specifiche della piattaforma plugin e del deployment standard.
La beta non è stata rilasciata: esempi, SDK e host vengono aggiornati insieme.

## Fiducia e responsabilità

Un plugin installato è codice fidato scelto dall'operatore, eseguito nel processo Node.js
del CMS. Dipendenze npm e aggiornamenti fanno parte della stessa scelta di fiducia.
Le API pubbliche danno contratti, ownership e controlli contro errori; non impediscono
al codice installato di importare filesystem/rete o accedere alle risorse del processo.
Non si promette isolamento dal sistema operativo, contenimento dei crash o interruzione
forzata del codice JavaScript. Un plugin difettoso può compromettere l'intera istanza.

Riferimenti architetturali: [Server API Strapi](https://docs.strapi.io/cms/plugins-development/server-api)
e [plugin Medusa](https://docs.medusajs.com/learn/fundamentals/plugins). Medusa è una
piattaforma commerce: il riferimento riguarda la composizione di moduli e funzionalità.

## Contratti e autorizzazione

- `services.operations.call(owner, name, input)` invoca funzioni nello stesso processo.
- Le integrazioni tra plugin richiedono una dipendenza nel manifest, un owner attivo,
  un'operazione pubblica e un permesso dichiarato dall'owner. Le dipendenze opzionali
  consentono l'integrazione solo quando l'owner è presente e caricato.
- Il permesso descrive l'operazione e serve anche all'autorizzazione degli utenti.
  Installazione/configurazione delle estensioni fidate autorizzano l'integrazione;
  non si creano richieste pending né approvazioni nel database per ogni collegamento.
- Gli eventi protected/audit mantengono contratto e requiredPermission dichiarati,
  con dipendenza dall'owner e sottoscrizione nel manifest. Gli eventi private restano
  riservati al proprietario. La policy standard legge il registro locale in memoria.
- Il vault conserva cifratura, scadenza, CAS monouso e consumer autorizzati dal producer.
  La policy standard verifica plugin attivi, evento del producer, permesso dichiarato
  dal producer o dal consumer e sottoscrizione del consumer; una sottoscrizione wildcard
  a notifiche pubbliche non amplia la lista
  dei consumer ammessi dal singolo payload. Non serve un'approvazione separata nel DB.
- Un contesto utente o una delega mantiene sempre i permessi dell'utente. Identità,
  proprietà dei contenuti, ACL Media e permessi del workflow non provengono dal body.
- Le facade standard autorizzano i target prima dell'esecuzione, una volta per target.
  I controlli dinamici del dominio restano nella transazione dove occorre verificare
  dati/stato. Il metodo host `OperationAuthorizer.run` deve autorizzare prima di eseguire;
  senza `run`, la facade chiama `assert` su tutti i target.
- Un'operazione accettata può terminare dopo un cambio della configurazione; le nuove
  operazioni vengono valutate con la configurazione corrente. Non ci sono fence o
  scritture ai record dei grant per chiamate standard. Il drain del lifecycle blocca
  nuovi lavori e attende la conclusione reale di quelli tracciati.

Un client HTTP con firma plugin **non è codice installato**. Il percorso preesistente
di accesso remoto ai settings conserva autenticazione, nonce persistiti e grant espliciti
verificati al momento della richiesta. Le API amministrative dei grant rimangono per
quel percorso e per composizioni host sperimentali; non governano le integrazioni locali.
Il backoffice standard non presenta più il centro approvazioni dei plugin.
La policy dei client HTTP firmati è `ExternalPluginHttpAccessPolicyService`.
Le sottoscrizioni e i claim dei plugin installati usano esclusivamente la policy locale.

## Deployment con una sola istanza

`startCmsApp` senza `cluster` avvia il runtime locale. Il playground usa questa modalità
per default; `PLAYGROUND_CLUSTER_ENABLED=true` attiva esplicitamente il coordinamento
distribuito e il calcolo dei checksum degli artefatti.

Il backoffice usa le stesse API lifecycle per load/unload/reload/disable/enable. Inventario
e comandi sono disponibili nella sezione **Settings → Plugins**, con i permessi utente
del runtime. La gestione delle estensioni non richiede la configurazione del cluster.
L'inventario espone `executionMode` e `operationRevision`; il client invia quest'ultima
come `expectedRevision`. In locale la revisione deriva dall'ultimo evento lifecycle del
plugin, conservato nel suo record anche dopo la rotazione del buffer diagnostico.
Una sola operazione lifecycle viene eseguita per volta nell'istanza, con controllo
dipendenze e drain del runtime. I retry identici condividono il risultato; chiavi riusate
con comandi diversi, revisioni obsolete e comandi concorrenti sono rifiutati.

La cronologia delle richieste locali è in memoria, al massimo 1000 risultati per cinque
minuti, e si perde al riavvio. Lo stato disabled usa invece lo store persistito del runtime.
Nessuna garanzia di idempotenza dei comandi attraverso riavvii; dopo un riavvio ricaricare
l'inventario. Il risultato locale ha `participants: ["local"]` e nessuna osservazione cluster.

Mongo deve ancora supportare transazioni: il suo replica set è un requisito del database,
non un obbligo di eseguire più processi CMS. Restano ownership persistita, CAS, transazioni,
sessioni/nonce/rate limit, backup, migrazioni e manutenzione. Gli eventi sync usano il bus
locale; solo gli eventi async/deferred dichiarati usano outbox/inbox e worker persistenti.

Per aggiornare una singola istanza: backup, arresto del CMS, plan/apply/status delle
migrazioni revisionate, installazione dei nuovi artefatti e riavvio. Non usare un secondo
writer durante la manutenzione. Per più istanze utilizzare il profilo cluster e il
[runbook distribuito](distributed-runtime-runbook.md), inclusi drain e deploy coordinato.

## Verifica operativa

1. Caricare Core, catalog e consumer con le dipendenze dichiarate e zero approvazioni.
2. Verificare chiamata pubblica, evento protected e scrittura del consumer nel suo namespace.
3. Monitorare Mongo: nessun comando sulla collection dei grant durante queste integrazioni.
4. Verificare dinieghi per dipendenza assente, permessi utenti insufficienti, contesti falsi,
   operazioni private e riferimenti di una precedente attivazione.
5. Verificare disable/reload locale con lavoro in corso, retry e revisione obsoleta.
6. Eseguire build/check, suite Mongo, E2E e tarball esterni. Il profilo cluster resta
   verificato dai suoi test dedicati e dalla fixture di upgrade distribuito.

La misura richiesta riguarda i comandi DB evitati e il numero di valutazioni della policy.
Non si deducono percentuali di latenza o throughput senza benchmark rappresentativi.
Prova umana indipendente dello starter e acceptance del deployment rimangono aperti.

# Operazioni editoriali

Stato verificato: 1 ottobre 2026. Vedi anche [stato e qualità](../../project-quality-status.md).

## Modelli e contenuti

I preset `article` e `page` vengono creati una sola volta. Le modifiche amministrative ai campi
non vengono sovrascritte al riavvio. Le API sono sotto `/v1/editorial/content-types` e
`/v1/editorial/entries`; richiedono una sessione e i permessi del dominio.

Lo slug è facoltativo e unico all'interno di un modello quando presente. Il campo `version`
restituito da lettura e salvataggio va inviato come `expectedVersion` negli aggiornamenti per
rilevare modifiche concorrenti. In caso di conflitto rileggere il contenuto prima di ritentare.

## Workflow e permessi

Il preset `review` procede da `draft` a `in_review`, `approved` e `published`. Le azioni sono
`submit`, `approve` e `publish`; `request_changes` riporta una revisione alla bozza e `unpublish`
riporta un contenuto pubblicato alla bozza. Il preset `direct` consente publish/unpublish tra
bozza e pubblicazione. Le definizioni personalizzate vengono risolte dal modello.

Ogni transizione verifica il proprio permesso e lo stato di partenza. Entrare o uscire da
`published` richiede sempre `editorial-pack:entries:publish`, anche nei workflow personalizzati.
Con `require_reviewer_assignment` attivo, l'invio in revisione richiede un revisore assegnato.
Una data `scheduledAt` futura impedisce la pubblicazione immediata; non esiste ancora uno
scheduler che pubblichi automaticamente alla scadenza.

La policy `author_scope` ammette contenuti propri, tutti i contenuti oppure la scelta per modello
tramite `ownershipScope`. Il revisore può accedere ai contenuti assegnati; il solo permesso
`review` non apre l'intero archivio. Approvatori, publisher e utenti con delete hanno accesso
globale, sempre subordinato al permesso specifico richiesto dall'endpoint.

## Revisioni e ripristino

Creazione e transizioni producono revisioni; il salvataggio ordinario e l'autosave non producono
uno snapshot ad ogni richiesta. Uno snapshot esplicito si crea con POST
`/v1/editorial/entries/:id/revisions`. La lettura richiede `editorial-pack:revisions:read`;
il ripristino richiede `editorial-pack:revisions:restore` e accesso all'entry.

Il ripristino recupera titolo, slug, documento e campi, validandoli contro il modello corrente.
Conserva stato corrente, revisore, programmazione e timestamp di pubblicazione. Per pubblicare
un contenuto ripristinato bisogna eseguire la normale transizione autorizzata. Entry e storico
sono scritti nella stessa transazione Mongo; un errore nello storico annulla la modifica.

## Modifiche ai modelli popolati

Sono consentite etichette e nuovi campi facoltativi. Rimozioni, cambi di tipo/cardinalità,
restrizioni delle opzioni, nuovi campi obbligatori e cambi di workflow richiedono una migrazione
esplicita. Anche la cancellazione di un modello con entry è rifiutata. Preparare un backup
verificato e una migrazione controllata dei dati prima di applicare questi cambiamenti.

## Requisiti e diagnostica

Mongo deve supportare transazioni: replica set o cluster sharded. Il compose locale fornisce
un replica set autenticato a nodo singolo; non costituisce alta disponibilità.
Errori di autorizzazione richiedono la verifica di permessi e ownership. Gli errori di
validazione richiedono la correzione dei campi, della transizione o del riferimento alla revisione.
Gli errori di concorrenza richiedono una nuova lettura, senza sovrascrivere il lavoro altrui.

Verifica automatizzata: test unitari del pack, integrazioni Mongo con
`TRINACRIA_RUN_MONGO_INTEGRATION=1 npm run test:integration` e suite `npm run e2e:ci`.

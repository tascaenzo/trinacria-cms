# Stato e qualità del progetto — 1 ottobre 2026

Questa è la fonte aggiornata per lo stato del checkout dopo il consolidamento di qualità,
l’aggiornamento delle dipendenze, l’unificazione UI e la revisione Tailwind 4.3.
Le milestone M1–M6 documentano risultati storici; non descrivono da sole Editorial e Media.

## Funzionalità presenti

- Kernel: discovery, lifecycle e dipendenze plugin, namespace, persistenza e diagnostica.
- Core: installazione, autenticazione/sessioni/MFA, utenti, ruoli, permessi e settings.
- Backoffice: runtime condiviso, contributi dichiarativi e renderer plugin, dashboard e design system.
- Email: template, delivery e integrazione con i flussi utente.
- Editorial: modelli configurabili, entry, documento a blocchi, workflow, revisioni e ownership.
- Media: file manager, upload, ACL, storage locale e compatibile S3.

Il prodotto resta una beta avanzata. La specifica editoriale comprende anche capacità future
(tassonomie dedicate, pubblicazione automatica pianificata, migrazioni guidate) che non devono
essere dedotte dall'esistenza dei relativi campi o permessi. Le chiamate editoriali admin usano
il metodo generico `cms.request`; l'estensione dei metodi SDK generati resta un task distinto.

## Interventi di consolidamento

1. Ripristinate le dipendenze dal lockfile; test axe/accessibilità e typecheck UI nuovamente eseguibili.
2. Corretto il formato del guardrail UI; escluso il HOME temporaneo di Storybook e rimosso il suo
   file di configurazione generato dal versionamento.
3. Applicate `author_scope` e `ownershipScope` nel servizio editoriale. Filtri di accesso eseguiti
   prima della paginazione. Il solo permesso `review` concede accesso alle entry assegnate, senza
   estendere la policy globale per autori ai revisori. Revisioni protette anche da `revisions:read`.
4. Il ripristino di una revisione recupera titolo, slug, corpo e dati. Stato, assegnazione,
   programmazione e timestamp di pubblicazione restano quelli correnti. Lo snapshot viene
   parsato e validato contro il modello attuale; la revisione viene cercata direttamente per ID.
5. Le transizioni che entrano o escono da `published` richiedono sempre `publish`, anche se il
   workflow configura un altro permesso.
6. Indice unico slug parziale (`slug` stringa). Il runtime crea il nuovo indice prima di rimuovere
   il precedente indice unico sparse sullo stesso insieme di campi, senza eliminare dati.
7. Scritture di entry e revisioni eseguite nella stessa transazione Mongo. Sessione condivisa,
   retry dei conflitti transitori e rollback gestiti dal driver. Snapshot concorrenti serializzati
   tramite aggiornamento ottimistico dell'entry. Eventi emessi soltanto dopo il commit.
8. Modelli popolati: bloccate rimozioni/cambi di tipo o cardinalità, nuovi campi obbligatori,
   restrizioni select/relazioni e cambi di workflow; bloccata la cancellazione di modelli con entry.
   Restano consentite modifiche compatibili come etichette e campi opzionali. Il bootstrap non
   reinserisce campi intenzionalmente rimossi dai preset.
9. Separati canvas, controlli, metadati e campi dell'editor a blocchi; separati file manager,
   inspector, tipi e utility. Facciate pubbliche conservate.
10. Renderer dei domini caricati tramite React lazy/Suspense; runtime React separato in un chunk
    riutilizzabile. Bundle principale circa 400 kB minificati dopo UI/Tailwind, contro i precedenti 794 kB
    (397 kB al termine del solo consolidamento).
11. React, SDK e UI diventano peer opzionali dei pack con dipendenze di sviluppo esplicite.
    `boundaries:check` vieta import runtime frontend nel grafo server e import delle implementazioni
    server nel codice admin. La separazione usa subpath pubblici nello stesso workspace.
12. Attivate verifiche ARIA, tipo dei pulsanti e dipendenze degli hook. Corretti callback toast,
    dipendenze dei form e caricamenti tramite effect event. Le eccezioni dei token di refresh
    intenzionali sono motivate nel punto interessato.
13. Corretti problemi precedenti rilevati dagli E2E: apertura diretta delle pagine prima del
    caricamento dei permessi, dialog cartelle chiuso prima dell’esito, messaggi media troppo tecnici,
    emissione di eventi durante il bootstrap
    editoriale e asserzioni riferite a dashboard/impostazioni precedenti. I grant plugin,
    intenzionalmente nascosti dalle impostazioni, mantengono copertura operativa tramite API.

## Mongo e migrazioni

Editorial richiede MongoDB replica set o cluster sharded con transazioni. Il compose di sviluppo
usa un replica set autenticato a nodo singolo con chiave privata persistita nel volume. La CI
avvia lo stesso servizio e attende un primary pronto. Nessun dato viene cancellato dalla migrazione
all'indice slug parziale.

Per cambiare distruttivamente un modello popolato: backup verificato, definizione del nuovo schema,
migrazione esplicita dei dati/stati in un ambiente controllato, verifica e successiva applicazione.
Il normale endpoint di update non è uno strumento di migrazione e rifiuta queste operazioni.
Non viene introdotta una migrazione automatica o un rollback del modello implicito.

## Verifica

I test nuovi coprono slug facoltativi e duplicati, indici legacy, policy globali/per-modello,
assegnazione revisori, snapshot concorrenti, rollback su fallimento dello storico, ripristino,
modelli popolati e gestione della sessione Mongo. Gli E2E includono salvataggio editoriale con
loading/errore/retry, pubblicazione/ripristino, upload con byte reali e creazione cartelle.

Gli esiti finali sono registrati nel task di consolidamento e nel changelog M7. I database di test
sono isolati; nessun database di sviluppo viene resettato. I comandi ordinari dei test unitari
saltano le integrazioni quando i flag non sono abilitati; la CI le abilita esplicitamente.

Esiti dopo l'aggiornamento delle dipendenze: 464 test della suite ordinaria passati, 11 integrazioni
Mongo/S3/Redis passate senza skip e 17/17 scenari Chromium passati. Installazione pulita dal lock,
build senza cache, format, lint, typecheck, SDK e Storybook verdi. L'audit npm completo segnala
zero vulnerabilità note: esbuild è ora 0.28.2. Node è allineato alla linea 24 e Trinacria alle
versioni stabili. Versioni e verifiche sono registrate in
[`dependency-audit-2026-10-01.md`](dependency-audit-2026-10-01.md).

## Unificazione UI — 1 ottobre 2026

Esportati Toolbar, ToolbarButton, ToolbarSelect, ContextMenu, IconTile, PageCanvas e
CenteredPanel da trinacria-ui, con tipi, stories e documentazione. Accesso/MFA, editor,
workflow e file manager adottano superfici, azioni e colori condivisi. Menu incorporati
conservano il tema, link e azioni distruttive usano componenti comuni; toolbar e notifiche
sono verificate anche su mobile.

La verifica dell’intervento UI ha registrato 463 test ordinari e 17/17 scenari Chromium.
La verifica delle dipendenze sopra ha registrato 464 test ordinari e
11 integrazioni Mongo/S3/Redis. I conteggi dei task e del changelog conservano il risultato
della rispettiva fase. Bundle principale circa 400 kB.

## Compatibilità Tailwind 4.3

La configurazione attiva usa `@import` e `@source`; eliminate le due configurazioni
TypeScript non caricate. Uniformati i token a `utility-(--token)`, aggiornati gradienti,
wrapping e outline accessibili. Le 98 conversioni distinte dei token producono le stesse
dichiarazioni CSS. Check, build e Storybook verdi; toolbar, login e menu verificati a
390 px nei temi light/dark. Il guardrail Tailwind è incluso in `npm run ui:guardrails`.

Riferimenti operativi: [guida UI](trinacria-ui-design-system.md),
[audit backoffice](backoffice-ui-audit.md) e
[task Tailwind](../workflow/tasks/done/2026-10-01-tailwind-compatibility.md).

## Semplificazione interna dei menu — 1 ottobre 2026

DropdownMenu e ContextMenu condividono la navigazione delle voci e il contratto di selezione.
Eliminati i gestori duplicati nel trigger dropdown e il cast `as never` del ref.
ContextMenu rispetta ora `closeOnSelect={false}` e le selezioni annullate con `preventDefault()`.
API pubbliche, tema e layout sono conservati.

Ultima verifica ordinaria: 470 test passati, di cui 96 in trinacria-ui; check completo,
build e Storybook verdi. Sei test aggiunti coprono navigazione, selezione persistente/annullata
e trigger standard/custom. Le integrazioni Mongo/S3/Redis e i 17 scenari Chromium restano
quelli registrati nella verifica precedente: non sono stati rieseguiti per questo refactor.

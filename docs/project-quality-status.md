# Stato e qualità del progetto — 5 ottobre 2026

Questa è la fonte aggiornata per lo stato del checkout dopo il consolidamento di qualità,
l’aggiornamento delle dipendenze, l’unificazione UI e la revisione Tailwind 4.3.
Le milestone M1–M6 documentano risultati storici; non descrivono da sole Editorial e Media.

## Consolidamento corrente — 5 ottobre 2026

Completati primo avvio riprendibile, prerequisiti separati dal wizard e collection
leggibili. La suite di riferimento D0 esegue tutti i nove scenari nel backend esterno
fisico tramite CLI distribuita: `status:passed, complete:true`. Include upgrade 0.1→0.2,
reinstallazione esplicita, CRUD/browser/overlay e restore completo su DB separato.

Verifica locale con Node 24.21.0/npm 11.16.0: **605 test ordinari passati**, 34 integrazioni
opt-in saltate nel comando ordinario; suite **45 test d'integrazione passati senza skip**
con Mongo/Redis/S3 attivi, **12 test playground senza skip** incluso primo avvio Mongo,
**28/28 Chromium**, build **15/15**, Storybook **11/11**, SDK, API, signing e template verdi.
I conteggi delle sezioni precedenti sono risultati storici delle rispettive consegne.

Il report locale con sei plugin misura 8.13 s per avvio e primo login, RSS circa 327 MiB,
50 letture HTTP seriali dopo cinque warmup: mediana 9.14 ms, p95 10.06 ms. Restore e
verifica locale richiedono 10.76 s su 27 collection/69 indici e un media reale. Queste
misure descrivono la fixture, non la capacità o il recovery time del vostro deployment.

CI aggiornata per installare Chromium prima della prova di distribuzione, eseguire
le suite complete e conservare le evidenze. Nessun file compilato senza sorgente viene
ammesso nei tarball. DB mock conservato: 31 collection, 4 utenti, 13 entry e 3 media.
La CI remota, lo staging e il partecipante indipendente restano da registrare;
G2/G3/G4 rimangono aperti per le rispettive acceptance.
[Procedura del team](cms/architecture/plugin-platform/single-instance-acceptance.md) ·
[Consegna e verifiche](../workflow/tasks/done/2026-10-05-cms-foundation-consolidation.md).

## Modello standard dei plugin

Plugin installati fidati nello stesso processo, contratti dei manifest senza approvazioni
DB, singola istanza per default e cluster opzionale. Permessi utente, deleghe, ownership,
schema, vault cifrato/atomico, transazioni e migrazioni rimangono attivi. I client HTTP
firmati mantengono accessi espliciti e anti-replay. Settings → Plugins permette
load/unload/disable/enable con revisioni stabili e drain anche senza cluster.

Il codice dei percorsi sperimentali non utilizzati è stato eliminato insieme a test,
export e documenti obsoleti. [Modello corrente](cms/architecture/plugin-platform/trusted-plugin-model.md)
e [registro di pulizia e verifiche](../workflow/tasks/done/2026-10-03-plugin-code-and-docs-cleanup.md).
La prova umana dello starter e l'acceptance del deployment restano aperte.

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
i 22 metodi SDK generati; OpenAPI e overlay esterni sono verificati dal blocco B1.

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

Verifica ordinaria di questo intervento: 470 test passati, di cui 96 in trinacria-ui; check completo,
build e Storybook verdi. Sei test aggiunti coprono navigazione, selezione persistente/annullata
e trigger standard/custom. Le integrazioni Mongo/S3/Redis e i 17 scenari Chromium restano
quelli registrati nella verifica precedente: non sono stati rieseguiti per questo refactor.


## Piattaforma plugin A0/A1 — 1 ottobre 2026

Implementati contesti `services` senza app/container diretto, ownership entità/storage
persistente con nomi hash canonici, discovery sotto root realpath host, transazioni
cross-namespace riservate all'host e operazioni nominate con identità fissata dal runtime.
Pack ufficiali e consumer aggiornati insieme, senza alias di retrocompatibilità.
A1 nega eventi protected/audit senza policy e rivaluta ogni consegna con diagnostica
redatta, rollback dei binding e invalidazione generazioni.

Verifica della consegna A0 su Node 24.21.0/npm 11.16.0 senza cache Turbo: 512 test passati,
7 integrazioni opt-in saltate nella suite ordinaria; format/lint/typecheck/guardrail,
dipendenze, confini e build passano. SDK allineato, import backend senza React,
11 integrazioni Mongo passate e 17/17 Chromium. Redis/S3 non ripetuti in A0; i risultati
precedenti restano storici. Nessuna modifica UI: Storybook non ripetuto.

Collezioni Mongo del layout precedente bloccano lo storage esplicitamente: usare un DB
vuoto oppure pianificare recupero dati verificato. Nessun reset dei DB di sviluppo.
Il progetto non è mai stato rilasciato e i plugin in-process restano fidati; non è una sandbox.
Alla consegna A0 il blocco successivo era A2; policy applicativa completa, grant condivisi,
API/SDK Editorial e consegna durevole restano aperti. Vedi [piano M8](./cms/architecture/plugin-platform-implementation-plan.md)
e [consegna A0](../workflow/tasks/done/2026-10-01-plugin-host-context-and-storage-boundaries.md).


## Vault A2 — 1 ottobre 2026

Claim CAS con retry/policy, identità host e DTO senza ciphertext implementati. Scadenza,
stato, limiti e destinatario non possono essere superati da authorizer permissivi.
Keyring esplicito obbligatorio anche in sviluppo; retention 24h configurabile con TTL.
Rotazione CAS e comando inventario/apply riprendibile verificati. Corretto anche il
bootstrap: la policy Core registrata dopo la costruzione del vault è risolta al claim.

Verifica corrente su Node 24.21.0/npm 11.16.0 senza cache Turbo: **541 passati, 13 skip
opt-in** in check, **17 integrazioni Mongo, 2 skip Redis/S3**, **17/17 Chromium** e build
12/12 task. SDK generato allineato; import backend senza React passati. Redis/S3 e
Storybook non ripetuti: nessuna modifica nei relativi percorsi. CI remota non eseguita.

Nessun reset dei dati di sviluppo, nessun fallback delle chiavi. A0/A1/A2 completati;
alla consegna A2 il prossimo blocco era A3 autorizzazione applicativa. [Consegna A2](../workflow/tasks/done/2026-10-01-secure-payload-atomic-claim-and-keyring.md)
e [runbook](cms/architecture/plugin-platform/secure-payload-keyring-runbook.md).

## Operazioni applicative A3 — 2 ottobre 2026

Implementati contesti certificati host, authorizer Core, doppio controllo delle deleghe
utente/plugin e facade nei sei domini Editorial/Media/Settings/Accesso/Runtime/Email.
Principal e approver non sono ricavati dal body. Permessi di secrets, grants e runtime
manage separati; nuovi privilegi operativi assegnati al solo admin. Editorial rivaluta
workflow e permessi nella sessione; fence modello su retry, restore preserva lo stato.
Media filtra ACL prima di paginare e ricontrolla replacement a ogni fase. Grant API
approvati/revocati in Settings e operazioni nominate con contesto fissato dal runtime.

Verifica senza cache, Node 24.21.0/npm 11.16.0: **561 passati, 13 skip opt-in** in check,
**20 integrazioni Mongo, 2 skip Redis/S3**, **17/17 Chromium**, build **12/12 task**.
SDK generato allineato e import backend con React/react-dom bloccati passati.
Docker avviato dopo il primo tentativo di integrazione: nessun reset dei dati di sviluppo.
Storybook non ripetuto (UI invariata), Redis/S3 non attivati, CI remota non eseguita.

A0/A1/A2/A3 e G1 coperti; prossimo B0/B1, export pubblici e OpenAPI/SDK Editorial.
M8 resta aperta. Store grant condiviso C2 e outbox/inbox/job C1 implementati e sottoposti a prove Mongo;
plugin in-process fidati. [Consegna](../workflow/tasks/done/2026-10-02-application-operation-authorization.md)
e [inventario](cms/architecture/plugin-platform/application-operation-inventory.md).

## Piattaforma plugin e sito pubblico

Il generatore e i tool conformità sono distribuiti nel tarball kernel. Catalogo e consumer
sono verificati fuori dal monorepo con CRUD, permessi, evento protetto atomico, lifecycle,
uninstall conservativo, overlay SDK e Chromium. L'upgrade catalogo 0.1→0.2 conserva i dati.
Le integrazioni locali non creano approvazioni né interrogano i grant HTTP.

Il sito pubblico ha snapshot separati dalla working copy, delivery Media, preview,
SSR/SEO, cache e invalidazioni persistenti. I controlli automatici sono registrati nei
rispettivi task; prova umana dello starter e deployment del team rimangono aperti.
[Runbook sito](cms/architecture/plugin-platform/public-site-runbook.md) ·
[Milestone M8](../workflow/milestones/M8-public-plugin-platform.md).

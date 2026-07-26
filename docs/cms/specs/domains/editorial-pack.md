# Editorial Pack

## Stato

- Milestone: prossima milestone dominio, dopo M6
- Stato: functional-spec-v1
- Scope: motore editoriale configurabile per blog personali e redazioni
- Ultimo aggiornamento: 2026-07-17

## 1. Decisione

@trinacria-cms/editorial-pack è un plugin dominio separato. Fornisce contenuti
strutturati, editor a blocchi, workflow, revisioni, tassonomie e relazioni; non
è un plugin limitato a post e pagine.

Un amministratore crea Articolo, Pagina, Evento e futuri tipi senza sviluppo.
Sono configurazioni di content_types; le rispettive voci sono entries validate
contro lo schema del tipo. Non si crea una collection per ogni tipo configurato.

| Preset | Flusso |
| --- | --- |
| Blog | draft -> published, con ritiro della pubblicazione |
| Redazione | draft -> in_review -> approved -> published, con rifiuto e ritorno in bozza |

Preset, stati e transizioni sono configurabili e sovrascrivibili per ogni tipo
di contenuto. Il primo rilascio redazionale include assegnazione del revisore,
commenti interni e notifiche operative.

## 2. Confini e dipendenze

| Area | Owner | Responsabilità |
| --- | --- | --- |
| Lifecycle, manifest e namespace | kernel | Caricamento e validazione plugin |
| Utenti, ruoli, permission, settings e audit | core-pack | Sicurezza e configurazione |
| Asset e byte storage | media-pack | Upload, ACL, URL e stato dei file |
| Contenuti e processi editoriali | editorial-pack | Modello e regole qui descritti |
| Route e UI backoffice | editorial-pack + admin-kernel | Contribution dichiarative e renderer |

Dipendenze runtime obbligatorie: core-pack per sicurezza e impostazioni e
media-pack per selezione e validazione degli asset. Editorial Pack conserva
solo assetId, didascalia, alt text, crop e placement: non accede alle collection
del Media Pack e non costruisce URL di storage.

## 3. Sicurezza, ruoli e ownership

Le permission sono il gate generale. Il servizio editoriale applica poi
ownership, stato dell'entry e configurazione del content type. Il frontend
nasconde azioni non disponibili, ma non è una fonte di autorizzazione.

| Permission | Scopo |
| --- | --- |
| editorial-pack:content-types:read / manage | Vedere e configurare tipi e campi |
| editorial-pack:entries:read / create / update / delete | Operazioni sulle entry autorizzate |
| editorial-pack:entries:submit | Inviare in revisione |
| editorial-pack:entries:review | Gestire revisione e commentare |
| editorial-pack:entries:approve | Approvare o rifiutare |
| editorial-pack:entries:publish | Pubblicare, programmare o ritirare |
| editorial-pack:revisions:read / restore | Consultare e ripristinare lo storico |
| editorial-pack:taxonomy:manage | Gestire vocabolari e termini |
| editorial-pack:settings:manage | Configurare workflow e policy |

Grant iniziali: author crea, modifica e invia le proprie entry; reviewer legge
e revisiona quelle assegnate; editor approva, pubblica e gestisce tassonomie;
content-manager gestisce anche tipi e impostazioni; admin ha tutte le permission.

### Policy ownership configurabile

La setting editorial-pack:access:author_scope è obbligatoria:

- own_entries: l'autore vede e modifica soltanto le proprie entry;
- all_entries: chi ha permission autore opera su tutte le entry;
- by_content_type: la regola viene configurata singolarmente per ogni tipo.

ownerUserId resta sempre registrato. Il backend applica questa policy ad ogni
lettura, modifica, transizione, commento e ripristino, anche se il frontend
filtra già le liste.

## 4. Modello funzionale

### Content type

Un content type definisce identità, schema, editor e policy di una famiglia di
contenuti. Contiene id, key immutabile, nome, icona, stato, schema campi, campi
di lista/filtro, tassonomie ammesse, relazioni consentite, workflow e ownership
effettivi. Workflow e ownership possono ereditare il default o usare un override.

I field type iniziali sono testo breve/lungo, rich text a blocchi, numero,
booleano, data/ora, selezione, URL, media, relazione a entry, JSON e campo
ripetibile. Ogni campo supporta label, help text, required, default,
validazione, cardinalità e regole di visibilità nell'editor e nelle liste.

Ogni entry dispone di titolo, slug, excerpt, corpo a blocchi, autore, stato,
data di pubblicazione, SEO e timestamp. Titolo, slug e corpo sono facoltativi o
nascosti quando non sono pertinenti, per esempio in un evento.

### Entry e editor

I dati custom vivono in data e vengono validati alla scrittura contro lo schema
versione del tipo. Il corpo è un documento JSON ordinato di blocchi: paragrafo,
titoli, lista, citazione, immagine, galleria, embed, separatore e codice.

L'editor offre autosalvataggio, annulla/ripristina locale, drag and drop, slash
command e Media Picker. Il pannello laterale contiene stato, revisore,
programmazione, tassonomie, relazioni, SEO e pubblicazione. L'anteprima usa un
adapter del sito o una preview neutra: i template frontend non sono del plugin.

### Tassonomie e relazioni

Una tassonomia è gerarchica (Categorie) o piatta (Tag). Il content type dichiara
vocabolari consentiti e cardinalità. I termini hanno slug, descrizione, ordine
e parentId quando applicabile.

Le relazioni dichiarano tipi sorgente/destinazione, cardinalità e comportamento
alla rimozione. I contenuti correlati sono una relazione esplicita ordinabile;
la raccomandazione automatica è fuori scope v1.

### Workflow, revisione e commenti

Ogni transizione dichiara stato origine/destinazione, permission e condizioni.

    draft --submit--> in_review --approve--> approved --publish--> published
       ^                 |                    |                        |
       |---request-changes / reject------------+------unpublish---------+

Nel preset blog, publish da draft è consentito a chi ha permission. Nel preset
redazione, submit richiede revisione salvata, revisore assegnato e validazione
pre-publish; approvazione e rifiuto sono tracciati. L'assegnazione può essere a
un utente o a un ruolo; un revisore può accettare l'incarico se la policy lo
permette.

I commenti sono interni, associati a entry, revisione o blocco/campo. Supportano
menzioni e stato open/resolved; non entrano nelle API pubbliche. Le notifiche
v1 sono in-app ed evento. L'email potrà usare email-pack senza una dipendenza
obbligatoria nel v1.

Ogni aggiornamento rilevante o transizione crea una revisione immutabile. Il
ripristino crea una nuova revisione e non sovrascrive la storia. Un diff visuale
completo è fuori scope v1.

## 5. Impostazioni e configurazione

La sezione Editoriale delle impostazioni CMS è owner del plugin e usa il
registry di core-pack. I content type hanno una pagina dedicata per gli
override per-tipo.

| Chiave | Valore | Scopo |
| --- | --- | --- |
| editorial-pack:workflow:default_preset | blog o newsroom | Flusso predefinito per nuovi tipi |
| editorial-pack:workflow:definitions | JSON | Stati, transizioni, condizioni e template |
| editorial-pack:workflow:require_reviewer_assignment | boolean | Richiede assegnazione prima dell'invio |
| editorial-pack:access:author_scope | enum | Policy ownership |
| editorial-pack:revisions:retention | JSON | Conservazione dello storico |
| editorial-pack:publication:validation_rules | JSON | Checklist globale pre-publish |
| editorial-pack:notifications:in_app_enabled | boolean | Notifiche operative |

Definizioni workflow e policy passano JSON Schema e non possono lasciare stati
senza transizioni terminali o permission inesistenti. Le modifiche future alle
configurazioni non riscrivono contenuti già pubblicati.

## 6. Backoffice

| Pagina | Accesso | Funzione |
| --- | --- | --- |
| Contenuti | entries:read | Lista filtrabile per tipo, stato, autore, revisore e tassonomia |
| Tipo di contenuto | entries:read | Lista e creazione delle entry del tipo |
| Editor entry | permission azione | Editor, metadata, workflow, commenti e storico |
| Modelli di contenuto | content-types:read | Lista e configurazione tipi/campi |
| Tassonomie | taxonomy:manage | Vocabolari e termini |
| Impostazioni editoriali | settings:manage | Preset, workflow, ownership e notifiche |
| Dashboard | entries:read | Mie bozze, revisioni assegnate e pubblicazioni pianificate |

Le tabelle hanno ricerca testuale, filtri salvabili, colonne configurabili per
tipo e bulk action solo quando la policy di transizione lo consente.

## 7. Dati e persistenza

| Collection | Scopo | Indici essenziali |
| --- | --- | --- |
| content_types | Definizione tipi e schema | id/key unici, status |
| entries | Contenuti correnti | id; contentTypeId/status/updatedAt; ownerUserId/status/updatedAt; slug per policy |
| entry_revisions | Snapshot immutabili | entryId/revisionNumber unico; entryId/createdAt |
| review_assignments | Incarichi revisione | entryId/status; assigneeUserId/status |
| editorial_comments | Commenti e risoluzioni | entryId/status/createdAt |
| taxonomies e taxonomy_terms | Vocabolari e termini | key e taxonomyId/slug unici |
| entry_taxonomy_terms | Associazione entry/termine | entryId/termId unico |
| entry_relations | Relazioni ordinate | sourceEntryId/fieldKey/position; targetEntryId |

Le collection usano il namespace del plugin. Tutti i documenti registrano
timestamp, attore dove rilevante e schemaVersion. La validazione dinamica è del
service editoriale; indici arbitrari su campi custom restano fuori scope.

## 8. API ed eventi

Le API richiedono bearer admin e applicano permission, ownership e workflow.

| Metodo | Path | Scopo |
| --- | --- | --- |
| GET/POST | /v1/editorial/content-types | Lista e creazione tipi |
| GET/PATCH | /v1/editorial/content-types/{id} | Dettaglio e configurazione |
| GET/POST | /v1/editorial/entries | Lista filtrata e creazione entry |
| GET/PATCH/DELETE | /v1/editorial/entries/{id} | Dettaglio, modifica e archiviazione |
| POST | /v1/editorial/entries/{id}/transitions/{transition} | Transizione autorizzata |
| GET/POST | /v1/editorial/entries/{id}/review-assignments | Lettura e assegnazione revisore |
| GET/POST | /v1/editorial/entries/{id}/comments | Lettura e creazione commenti |
| PATCH | /v1/editorial/comments/{id} | Risoluzione o aggiornamento commento |
| GET | /v1/editorial/entries/{id}/revisions | Storico |
| POST | /v1/editorial/entries/{id}/revisions/{revision}/restore | Ripristino non distruttivo |
| GET/POST | /v1/editorial/taxonomies | Vocabolari |

Eventi iniziali: entry-created, entry-updated, entry-transitioned,
entry-review-assigned, entry-commented, entry-published, entry-unpublished,
entry-archived. Tutti includono entryId, contentTypeId, attore, timestamp e
stato quando applicabile. Gli eventi di pubblicazione sono protected; audit e
notifiche restano separati.

## 9. Criteri di accettazione v1

- un content manager crea Articolo ed Evento da backoffice, con campi,
  tassonomie, relazioni e workflow diversi, senza deploy;
- un autore con own_entries non legge o modifica entry altrui, anche tramite
  API diretta;
- autore, revisore ed editor completano bozza, revisione, commento,
  approvazione e pubblicazione con storico completo;
- nella modalità blog un utente abilitato pubblica direttamente una bozza;
- un evento usa data/ora, media e categoria; un articolo usa blocchi e
  contenuti correlati;
- la pubblicazione fallisce finché validazione e asset Media Pack non sono
  utilizzabili;
- ritiro della pubblicazione e ripristino revisione non eliminano storico;
- menu, pagine e impostazioni sono contribution del plugin, non modifiche core.

## 10. Fuori scope v1

- collaborazione simultanea in tempo reale;
- diff visuale avanzato fra revisioni;
- rendering pubblico, temi e delivery frontend;
- multilingua dei contenuti;
- suggerimento automatico di contenuti correlati;
- calendario editoriale avanzato;
- workflow condizionale multi-step oltre stati/transizioni configurabili.

Queste estensioni restano compatibili con il modello e potranno diventare
moduli dell'Editorial Pack o plugin satelliti.

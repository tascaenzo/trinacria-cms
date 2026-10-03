# Specifica: sito pubblico

Contratto corrente: [plugin installati fidati](trusted-plugin-model.md).

Copre il verticale sito pubblico della checklist, decisione PP16.
[piano](../plugin-platform-implementation-plan.md). Il sito ha un gate di prodotto dedicato.


Si applica il [vincolo prima del primo rilascio](../plugin-platform-implementation-plan.md):
nessuna retrocompatibilità con il codice attuale; consumer aggiornati insieme.

## E0 — Verticale prodotto scelto

Sito editoriale/blog con home, lista articoli, pagina articolo, pagine informative,
navigazione e anteprima autenticata. Implementazione di riferimento `apps/public-site`:
React con SSR Node e build Vite client/server, dipendenze già coerenti con il monorepo;
contenuti ottenuti dal client SDK, nessun accesso Mongo dal frontend pubblico.
Non introdurre un site builder drag-and-drop, ecommerce, tassonomie o scheduling per
chiudere questo verticale. Un frontend esterno può usare le stesse API di delivery.

### Pubblicazione come snapshot esplicito

Evidenza: entry correnti includono stato e body modificabili; revisioni sono append-only.
Leggere soltanto `status=published` rischia di rendere pubbliche modifiche di lavoro
successive. Decisione: snapshot di pubblicazione immutabile con publicationVersion e
publishedRevisionId, generato nel servizio applicativo alla pubblicazione autorizzata.
Persistenza atomica di entry/pointer/snapshot/outbox nella transazione Editorial.

Aggiornare una entry pubblicata modifica la working copy, non lo snapshot pubblico.
La ripubblicazione esplicita richiede publish e expectedVersion; nuovo endpoint
POST `/v1/editorial/entries/{id}/publication`, operation ID `publishEditorialEntrySnapshot`.
La prima pubblicazione passa anche dalla transizione di workflow esistente; endpoint
publish corrente viene aggiornato per generare lo snapshot. Unpublish cancella il pointer
attivo e invalida delivery, senza eliminare working copy/revisioni. Restore revisione
mantiene stato come oggi e non aggiorna lo snapshot pubblico senza ripubblicazione.

Nuove installazioni usano subito gli snapshot. Se si sceglie il recupero di dati di
sviluppo, C0 migra entry già published a uno snapshot della working copy presente al momento
della migrazione e registra questa provenienza, senza inventare la storia precedente.
Contenuti privi di slug/modello pubblico/media pubblicabile vengono segnalati e non
esposti; il report elenca cosa deve correggere l'operatore. Nessuna promozione di bozze.

Configurazione delivery sul content type, default disabled: enabled, publicFields
allowlist, exposeTitle, exposeBody, exposeSlug. Ogni campo nuovo è interno per default.
Body pubblico richiede validazione dei blocchi consentiti e referenze Media pubbliche.
Applicare projection in servizio dedicato, non serializzare l'intero EntryRecord.
Non esporre owner, reviewer, workflow interno, settings, revisioni o dati non allowlisted.
Relazioni espandono soltanto risorse con snapshot pubblico, profondità max 2 e limite
100 elementi complessivi; private/mancanti restano omesse secondo schema documentato.

### API di delivery e anteprima

| Endpoint target | Accesso |
| --- | --- |
| GET `/v1/delivery/content-types/{key}/entries` | Anonimo, soli snapshot pubblici e campi allowlisted |
| GET `/v1/delivery/content-types/{key}/entries/{slug}` | Anonimo, snapshot pubblico oppure 404 |
| POST `/v1/editorial/entries/{id}/preview-tokens` | Utente autenticato con read e accesso all'entry |
| POST `/v1/preview/sessions` | Exchange token monouso da sito ammesso |
| GET `/v1/preview/entries/{id}` | Sessione preview limitata, ricontrollo permessi utente |

Grouppi SDK delivery/preview distinti da editorial admin. Rate limit pubblico default
120 richieste/minuto per client, query allowlist, limite pagina 50/max100 e ordinamento
deterministico. Filtri non pubblici ignorati o rifiutati, mai tradotti in query Mongo libera.
404 non distingue bozza, modello privato e risorsa assente. DTO con ETag basato su
publicationVersion più deliveryConfigVersion: cambi della projection invalidano la cache.

Preview: token firmato con keyring separato da access JWT, jti, userId, entryId,
audience site ID, expiry 60 secondi; monouso tramite store atomico C2. Form POST dal
backoffice all'origine sito allowlisted, niente token in URL. Il sito scambia il token
server-to-server con CMS e imposta cookie HttpOnly/Secure/SameSite=Lax con sessione
preview opaca valida 10 minuti; nel DB solo hash del session ID e scope.
La chiamata preview CMS usa credenziale di sessione limitata, non JWT admin persistito
nel browser pubblico. Origine/audience, redirect e CSRF del form di ingresso sono
validati; niente CORS wildcard. Il servizio ricontrolla utente attivo/read/ownership
ad ogni fetch, quindi revoca/disable utente impedisce nuove letture.

Preview risposte `Cache-Control: private, no-store`, niente CDN o service worker caching;
session/token esclusi dai log. Pulire cookie all'uscita preview. Non renderizzare l'anteprima
come URL pubblico indicizzabile: robots noindex e banner visibile.

### Cache, rendering, navigazione e SEO

Prima release usa cache server condivisa con TTL massimo 30 secondi, senza cache CDN di
pagina completa; evento durevole C1 invalida per entry/content type/menu/projection.
TTL limita la stale window quando worker è in errore; se unpublish deve essere immediato,
verificare pointer pubblicazione ad ogni lettura prima di servire la cache. Questa
verifica è obbligatoria, non affidata solo all'evento. Asset public revocato deve passare
da Media, non un URL permanente bypassabile prodotto dal sito. ETag/304 solo dopo la
verifica di pubblicazione e ACL.

Il frontend renderizza blocchi consentiti come React components; nessun eval/script
custom o raw HTML non sanitizzato. URL schema allowlist http/https e media validati;
escape della serializzazione SSR e CSP compatibile con hydration. Le immagini private
non diventano pubbliche perché referenziate in un articolo; publication validateUse
di Media deve bloccare la pubblicazione fino a regolarizzazione esplicita.

Menu è una risorsa del dominio sito separata da navigation admin: item label, path/link,
ordine, target pubblicato. Config tramite setting/schema del pack sito, mutazioni
autorizzate; link esterni con scheme ammesso. SEO iniziale: title/description/canonical,
OpenGraph, robots e sitemap con soli snapshot pubblici. Meta title usa titolo pubblico;
canonical origin configurata, non header Host arbitrario. URL slug collisioni e redirect
sono gestiti nel sito con mapping esplicito, non eliminando altri contenuti.

Deploy: artefatto Node SSR separato, API base server-only, origin sito/CORS/CSRF
configurate, nessuna credenziale admin nell'asset browser. Health e readiness distinti;
API unavailable mostra errore controllato e non pubblica bozza di fallback. Test keyboard,
mobile e SEO del sito indipendenti dalle prove del backoffice.

Gate E0: autore crea bozza → preview → pubblica → sito mostra snapshot → modifica resta
in preview → ripubblica → sito aggiornato → unpublish produce 404. Test campi privati,
relazioni, media ACL, XSS nei blocchi/SSR, preview replay/revoca/scadenza/cache e backup
del pointer. Le API aggiuntive aggiornano il catalogo B1 senza rinominare le 22 esistenti.

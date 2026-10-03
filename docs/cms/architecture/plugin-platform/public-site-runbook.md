# E0 — Operare sito pubblico e anteprime

Implementazione beta del 2 ottobre 2026. Il sito è un processo SSR distinto dal CMS,
in `apps/public-site`; usa soltanto l’SDK ufficiale. Le API anonime sono nei gruppi
`delivery` e `preview`, separate dalle operazioni amministrative `editorial`.

## Configurare i contenuti

1. Nel dettaglio del modello abilitare “Sito pubblico”, titolo/documento/slug e i
   soli campi che devono essere pubblici. Il default è disabled; campi aggiunti
   successivamente restano interni. Salvare il modello richiede content-types:manage.
2. Creare una entry con slug. Tutte le immagini del documento richiedono assetId;
   i riferimenti Media esposti devono essere ready/public. URL javascript/data,
   controlli e backslash non sono ammessi. I link vengono renderizzati come dati.
3. Pubblicare tramite workflow. Entry, revisione, snapshot, pointer e intent outbox
   vengono salvati atomicamente. Modifica e restore cambiano la working copy;
   “Ripubblica sul sito” richiede entries:publish ed expectedVersion corrente.
4. Unpublish cancella il pointer, conservando snapshot e storia. Le API restituiscono
   404 anche per bozza, modello privato/archiviato o riferimento Media revocato.
   Un If-None-Match precedente non può trasformare queste condizioni in 304.

Non recuperare automaticamente entry published precedenti senza snapshot. Nessun
reset viene eseguito: eventuale recupero dei dati di sviluppo richiede inventario e
migrazione C0 esplicita, con provenienza dichiarata e report degli elementi non validi.

## Anteprima privata

Nel processo CMS configurare CMS_PREVIEW_ACTIVE_KEY_ID, CMS_PREVIEW_KEYS_JSON e
CMS_PREVIEW_SITES_JSON, come nell’esempio `.env.example`. Ogni chiave è almeno 32 byte
casuali, base64 canonico, distinta dal JWT di accesso. Conservare le vecchie chiavi
solo per la breve sovrapposizione scelta dall’operatore; rimuoverle revoca token non
ancora scambiati. Le sessioni già emesse restano limitate da scadenza/utente/permessi.
Origini HTTPS esatte senza path/trailing slash; HTTP loopback è ammesso solo fuori
produzione. Configurazione assente disabilita l’emissione; incompleta non usa fallback.

Il backoffice ottiene il token da createEditorialPreviewToken e lo invia in un form
POST al sito allowlisted `/preview`. Token di 60 secondi, audience siteId e consumo
atomico condiviso. Il sito valida Origin del backoffice e scambia il token tramite
SDK server-to-server, poi imposta `__Host-trinacria-preview`, HttpOnly/Secure/Lax,
Max-Age=600. Nel DB è persistito solo l’hash della sessione, con entry/user/site scope.
Nessun token in URL, localStorage o asset client; nessun JWT admin trasferito al sito.
Non usare noreferrer sul form: renderebbe Origin=null e il controllo CSRF lo rifiuta.
noopener mantiene la separazione dalla finestra chiamante.

Ogni fetch preview ricontrolla sessione, utente active, entries:read e ownership.
La preview usa la stessa allowlist dei campi e riferimenti pubblicabili della delivery;
non promuove media privati. Relazioni espandono solo snapshot pubblici. Risposte e
pagine no-store/noindex; il banner offre uscita con revoca della sessione e cookie.

## Avvio e deployment SSR

Compilare `npm run build`, poi configurare nel solo processo sito:

- PUBLIC_SITE_ORIGIN: origine canonica HTTPS; mai derivata da Host/X-Forwarded-Host.
- PUBLIC_SITE_API_BASE_URL: URL CMS server-only, senza credenziali; il client non lo riceve.
- PUBLIC_SITE_ID: siteId registrato nel CMS, default public-site.
- PUBLIC_SITE_BACKOFFICE_ORIGINS_JSON: array di origini esatte autorizzate al form.
- PUBLIC_SITE_HOST e PUBLIC_SITE_PORT: bind/porta, default 127.0.0.1/4180.
- PUBLIC_SITE_CLIENT_DIRECTORY: directory client compilata; avviando dal workspace
  public-site il default dist/client è corretto.
- PUBLIC_SITE_TLS_CERT_FILE e PUBLIC_SITE_TLS_KEY_FILE: entrambi per TLS diretto;
  in alternativa terminare TLS su reverse proxy controllato. Il certificato del test
  Chromium è self-signed e non è un artefatto di deployment.

Avviare `npm run start -w @trinacria-cms/public-site`. Usare un hostname sito distinto
da quello del backoffice, senza cookie Domain condivisi: i cookie non sono isolati
per porta. In produzione tutte le origini configurate richiedono HTTPS.

`/health` verifica il processo; `/ready` verifica la delivery CMS. Errori API producono
una pagina controllata 503, senza fallback a bozze né dettagli di storage. Il sito
non inoltra cookie del browser all’API. Richieste SDK timeout 5 secondi; JSON massimo
1 MiB, media massimo 16 MiB nel proxy sito, senza redirect automatici. File maggiori
richiedono una strategia di streaming dedicata prima di ampliare i limiti.

## Cache, menu e SEO

Cache DTO di dettaglio condivisa Mongo con scadenza massima 30 secondi, verificata
anche prima del cleanup TTL. Chiave snapshot/config; dipendenze per entry e modello.
Ogni hit ricontrolla pointer, projection e ACL Media, prima di ETag/304. Eventi privati
async delivery-invalidated aggiornano epoch condivise nella transazione C1/inbox;
republish/unpublish e modifica modello scrivono intent nello stesso commit del dominio.
Cache/DB indisponibile produce 503. Nessuna cache CDN di pagina intera.

Lista e menu sono letti freschi per ogni richiesta. La navigazione è il setting
`editorial-pack:site:navigation`, modificabile tramite Settings autorizzato: array di
label + href esterno/home oppure label + contentTypeKey/slug. Target senza snapshot
pubblico omessi; ordine preservato. Nessuna dipendenza dalla navigazione admin.

Il sito espone home, /articles, /articles/:slug, /pages/:slug e /content/:key/:slug.
Title/description/canonical/OpenGraph vengono da projection/origine configurata;
robots e sitemap escludono preview. Renderer React per blocchi ammessi, escaping JSON
SSR e CSP con nonce; nessun raw HTML/eval. Asset passano dalla delivery Media ad ogni
richiesta, con no-store/nosniff e contenuti attivi trattati come allegati.

## Verifica e gate

Test Mongo: immutabilità/CAS/rollback outbox, projection/relazioni/Media, contatore
condiviso tra repliche, preview replay/scadenza/revoca e cache/epoch condivisa.
Test sito HTTP: SSR/XSS, canonical, CSRF, sessione hash-only e API unavailable.
Chromium: draft→preview→publish→edit→republish→unpublish, cookie sicuro, assenza
JWT admin sul sito, mobile/keyboard e uscita preview. Il worker deve concludere le
invalidazioni, verificabili nelle route operative deliveries.

M8 non è chiusa da questo incremento. Recupero opzionale di dati precedenti, backup
di snapshot/pointer e prova di deployment/recovery del team restano acceptance da
registrare; la prova umana dello starter D0 ha un gate indipendente.

# E0 — Sito editoriale SSR, snapshot pubblici e preview

## Obiettivo

Consegnare il blocco E0 del piano tecnico, applicando decisioni e criteri della specifica collegata.

## Area

`editorial-pack | media-pack | sdk | backoffice | infra`

## Milestone

[M8 — Piattaforma plugin pubblica](../../milestones/M8-public-plugin-platform.md).
Stato: implementazione e acceptance locali verificati il 2 ottobre 2026; deployment SSR del team ancora aperto.
Responsabile: owner dei package indicati nell'area; reviewer dei contratti kernel/Core.

## Specifica esecutiva

[Sito editoriale SSR, snapshot pubblici e preview](../../../docs/cms/architecture/plugin-platform/public-site-contracts.md).
[Piano e registro decisioni](../../../docs/cms/architecture/plugin-platform-implementation-plan.md).
La specifica fissa semantiche, errori, contratti target, default, recovery e acceptance;
questa scheda ne organizza gli incrementi, senza introdurre alternative architetturali.

## Dipendenze

A3/B1 e C0 per schema snapshot; C1 invalidazione e C2 preview nonce/sessioni.

## Scope e incrementi

- [x] Snapshot pubblico immutabile e ripubblicazione esplicita; nuove configurazioni delivery default private.
- [x] API delivery projection/relazioni/media validate e API preview monouso/sessione limitata.
- [x] apps/public-site React SSR/Vite, home/lista/articolo/pagine/menu e SEO iniziale.
- [x] Cache con controllo pointer prima di ETag/304, preview no-store e rendering blocchi sicuri.
- [ ] Snapshot target, recupero published precedenti opzionale con report e deployment SSR separato.

Fuori scope: gli altri blocchi M8, salvo integrazioni necessarie dichiarate nella specifica.
Ogni incremento deve avere test e consumer aggiornati; recupero dati di sviluppo solo se richiesto, senza reset automatici; non segnare il task done dopo il solo scaffolding.

## File impattati

Editorial servizi/schema/snapshot/controllers, Media integration, SDK delivery/preview, public-site e template/docs.
I path sotto kernel/Core/pack sono relativi a `packages/`; i nuovi moduli mantengono
la struttura esistente e i contratti pubblici definiti nella specifica.

## Check e criterio di chiusura

Draft-preview-publish-edit-republish-unpublish, campi privati/referenze/media, XSS/SSR, preview replay/revoca, mobile/keyboard e API down.

- Test mirati e integrazioni reali del requisito, inclusi casi negativi e recovery.
- `npm run check` e `npm run build` con Node di `.nvmrc`.
- SDK check per API/generatore; Chromium per i flussi modificati; Storybook per UI/renderer.
- Documentazione, checklist e changelog aggiornati; risultati e skip registrati.
- Chiudere solo dopo gli acceptance della specifica e le dipendenze richieste dal relativo gate.

## Incremento corrente

SDK allineato a 150 route registrate, con gruppi delivery/preview distinti; le 22
operation ID originali Editorial sono conservate. Aggiunte publication, preview-token
e preview-sites sotto /v1/editorial, oltre alle API anonime/sessione. Proxy Media
local-disk verificato con byte reali e revoca; capability S3 implementata, prova S3
ancora opt-in. Rate limiter Mongo condiviso 120/min con TTL BSON Date e contatori
atomici, senza fidarsi degli header forwarded. Manifest TTL ora validati esplicitamente.

Preview su due istanze: exchange singolo, hash-only sessione, scope entry/site,
revoca utente/permesso, scadenza e uscita. Browser HTTPS locale: flusso completo,
XSS, campi privati, cookie, mobile e keyboard passati. Il modulo SSR ha prove HTTP
per CSRF/API unavailable/canonical/escaping. Cache di dettaglio Mongo 30s e epoch
C1 implementate; liste/menu restano sempre freschi. [Runbook](../../../docs/cms/architecture/plugin-platform/public-site-runbook.md).

Verificati cache C1 nel browser e su Mongo, Storybook (11 task), backup logico e
ripristino in un secondo database temporaneo: pointer e snapshot pubblicato conservati
anche con working copy diversa. Check completo (23 task test), build (15 task),
41 test di integrazione passati / 2 skip Redis-S3 e 20/20 scenari Chromium.
Log locali: `/private/tmp/trinacria-e0-check-2.log`, `trinacria-e0-all-integration-2.log`,
`trinacria-e0-storybook.log`, `trinacria-e0-e2e.log`. Il primo test SMTP a deadline
15 ms poteva scadere durante preflight Mongo; ora verifica esplicitamente avvio provider
prima della scadenza a 2 s.

Resta il deployment SSR del team secondo il runbook; recupero di precedenti contenuti
di sviluppo è opzionale e non viene eseguito automaticamente. Nessun database di
sviluppo cancellato. Il gate produzione non è dedotto dalle prove locali.

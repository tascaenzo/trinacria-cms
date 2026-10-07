# D0 — Percorso operativo per uno sviluppatore esterno

Contratto corrente: [plugin installati fidati](trusted-plugin-model.md).

Il generatore distribuito in `@trinacria-cms/kernel` crea un progetto autonomo da
un template versionato; non installa dipendenze e non esegue script. La destinazione
deve essere nuova. Nome plugin canonico, namespace, semver e licenza sono da revieware.
Node 24.21 e Mongo replica set sono i prerequisiti del backend durevole.

## Creare, integrare e verificare

1. Installare gli otto pacchetti della versione beta prevista in un host esterno.
   Eseguire `create-trinacria-plugin ./catalog-plugin catalog-plugin`. Poi installare
   le dipendenze del progetto creato, build/typecheck/test e produrre un tarball.
   Non usare link workspace per la prova di distribuzione.
2. Nell'host fidato registrare `createCorePackPlugin()` e `createCatalogPlugin()`
   tramite `startCmsApp({ plugins: [...] })`, con storage Mongo, keyring e runtime
   configurati. In cluster configurare digest/revisioni e readiness del deployment.
   Async/deferred richiedono lo store durevole inizializzato prima del load.
3. Nel backoffice importare i metadata da `catalog-plugin/admin-manifest` e i
   renderer da `catalog-plugin/admin`. Passarli a `definePluginBackofficeModule`
   nel registro della shell, mantenendo una sola copia React 19; ricompilare l'host.
   L'import metadata non porta codice backend nel browser.
4. Provisionare read/write agli utenti previsti. Le richieste anonymous devono
   restituire 401; un utente senza write riceve 403. Update/delete includono
   expectedVersion. Su 409 rileggere e ripetere la decisione; non forzare la versione.
   Il setting prefix è proprio, dichiarato/nonsecret e limitato a 40 caratteri.
5. Il consumer separato dichiara dipendenza dal catalogo, sottoscrizione a
   `catalog-plugin:item-created` e permesso `catalog-plugin:items:read`.
   L'handler scrive observations nel proprio namespace nella transazione delivery/inbox.
   La chiamata pubblica `items.get` usa i contratti del manifest, senza approvazioni DB.
6. Salvare `/openapi.json` dell'host e generare l'overlay:
   `trinacria-sdk ./openapi.json ./generated/catalog --mode overlay --owner catalog-plugin`.
   Compilare un consumer esterno e chiamare create/get/update/delete via
   `createPluginSdk(cms).catalog`, senza modificare i gruppi del client ufficiale.
7. Per reload disattivare/drenare prima i dipendenti; riavviare il provider, poi i
   consumer. Un reload con dipendenti attivi è rifiutato. Verificare route/provider
   unici e servizi della vecchia generation inutilizzabili dopo unload.
8. Per upgrade distribuire manifest e migrazioni immutabili con checksum dei file
   compilati; packageRoot esplicito nel deploy host. Su singola istanza: backup,
   arresto del CMS, `cms migrations plan/apply/status`, installazione e riavvio.
   Su cluster seguire il runbook distribuito per disable/drain, migrazioni,
   `cms plugins deploy` con expectedRevision e convergenza/readiness.
9. Uninstall revoca credenziali/grants, rimuove route/contributi e conserva items e
   observations. Purge è un'azione distinta con backup e autorizzazione esplicita.

## Conformità e prova indipendente

`cms-plugin-conformance --manifest ./manifest.json --core-version 0.1.0
--openapi ./openapi.json` verifica contratti statici e restituisce `complete:false`.
Con `--scenario ./conformance.mjs` esegue soltanto il modulo locale esplicitamente
scelto. Il modulo deve esportare tests per negative-authz, lifecycle, reload-cleanup,
missing-provider, headless, browser, migration, disable-remove-preserve e sdk-overlay.
Ogni funzione esegue assertion reali; l'assenza di uno scenario o un errore fa fallire
il comando. Non è una certificazione di sicurezza e non autorizza codice non fidato.
Il controllo statico riporta `status: incomplete`; una suite completa riuscita riporta
`status: passed, complete: true`, con durata/esito dei nove scenari. Errori, funzioni
mancanti o teardown fallito danno `status: failed` ed exit 1. I log dei moduli vanno
a stderr; stdout contiene il report JSON.

La fixture `npm run release:test` genera il progetto, compila e installa tarball veri,
usando solo export pubblici. Verifica Mongo, permessi, evento protetto atomico,
dinieghi utente, reload, uninstall con dati conservati, overlay TypeScript e Chromium con
CRUD, conflitto e recupero API. L'upgrade dello stesso catalogo 0.1→0.2 aggiunge
currency tramite CLI e riavvia un host nuovo sui dati conservati. Questa prova è
verificata dalla fixture automatica: storia migration applicata e campo currency=EUR verificati
su HTTP dopo un nuovo cold start. Il report locale è `.tmp/release/external-host-result.json`.

La prova umana richiede un membro del team che non abbia scritto lo starter: compilare
il [registro di acceptance](external-plugin-human-acceptance.md), annotando tempi,
errori, passaggi ambigui e rebuild necessari. Le prove automatiche non la completano.

Il modulo di riferimento è `scripts/release/fixtures/catalog-conformance.mjs`, copiato
dalla fixture nel progetto backend fisico e avviato con la CLI distribuita. Aggiunge
missing-provider e tutti gli altri otto scenari nello stesso report. Il percorso
migrazione include snapshot BSON/indici, media reali e configurazione, restore su DB
vuoto e cold start; il report è `.tmp/release/catalog-conformance-result.json`.
L'helper di recovery è dedicato ai dati della fixture; per lo staging usare la
[procedura operativa del team](single-instance-acceptance.md).

Dopo uninstall il writer fence resta in maintenance. Una reinstallazione autorizzata
deve verificare artefatto/schema, riaprire il fence tramite `runner.maintenance.set`
per gli owner interessati e caricare i plugin. Il normale avvio non azzera maintenance.

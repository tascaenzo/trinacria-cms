# Specifica: API, SDK, compatibilità, packaging e percorso esterno

Contratto corrente: [plugin installati fidati](trusted-plugin-model.md).

Copre checklist 5–7 e 11, decisioni PP07–PP10. Target di implementazione;
[piano e gate](../plugin-platform-implementation-plan.md).


Si applica il [vincolo prima del primo rilascio](../plugin-platform-implementation-plan.md):
nessuna retrocompatibilità con il codice attuale; consumer aggiornati insieme.

## B0 — Export e compatibilità

Kernel mantiene `contracts`, `plugin-api`, `errors` e i token intenzionali pubblici.
`runtime` è una superficie avanzata versionata; classi/repository dei domini non diventano
pubblici automaticamente perché esportati dall'index corrente. Inventariare tutti gli
export di ogni package in un file di baseline sotto `docs/cms/specs/core-platform/`:
simbolo, subpath e stato pubblico/experimental/interno previsto per la prima release.
Prima release beta: helper manifest/admin/settings/security, DTO/errori e contratti
riusabili sono stable nella linea beta; migrazioni e API durevoli restano experimental
finché il loro gate passa. Rimuovere gli export non intenzionali e aggiornare i consumer.

Il progetto non è mai stato rilasciato: modificare direttamente gli export e le route
esistenti, aggiornando SDK, backoffice, pack ed esempi insieme. Non mantenere route
parallele o periodi di deprecazione. Snapshot `.d.ts`, OpenAPI e fixture TypeScript
verificano il contratto target e i suoi consumer; le diff richiedono revisione, senza
bloccare cambiamenti incompatibili deliberati. Documentare le modifiche nel changelog.
Prima della pubblicazione G2 fissare la baseline pubblica e la politica per le release
successive; tale politica non impone compatibilità con il codice interno attuale.

**Semver:** la funzione locale `evaluateComparator` tratta `^0.1.0` come `<1.0.0`.
Sostituire la sua logica con `semver` come dipendenza diretta kernel, conservando
`isValidVersion`, `isValidVersionRange`, `satisfiesVersion` come wrapper. Scegliere
semantica rigorosa npm: prerelease escluse salvo range che le ammette, nessun loose mode.
Aggiornare lockfile e test; non dipendere da `semver` transitivo di un tool di sviluppo.
I plugin del repository fuori range devono dichiarare versioni corrette,
non allargare il parser per farli passare.

Test necessari: `^0.0.3`, `^0.1.0`, `^1.2.3`, `~`, OR, comparator multipli, wildcard,
build metadata e prerelease. `0.2.0` non deve soddisfare `^0.1.0`; falsi positivi
attuali sono correzioni, non compatibilità da conservare.

## B1 — OpenAPI Editorial e validazione delle route

Riutilizzare `toOpenApiSchema` e schemi Trinacria dei controller. Non creare schemi
JSON separati scritti a mano per ogni DTO. Aggiungere schemi di risposta per entry,
modelli, revisioni e envelope, senza serializzare repository/sessioni. L'editor ha dati
dinamici: `data` resta un oggetto JSON validato dal modello runtime; non promettere che
il generatore base conosca ogni content type del progetto.

Inventario Editorial obbligatorio, gruppo SDK `editorial`, operation ID nuovi fissati:

| Metodo e suffix sotto `/v1/editorial` | operationId |
| --- | --- |
| GET `/content-types` | listEditorialContentTypes |
| GET `/content-types/deleted` | listDeletedEditorialContentTypes |
| GET `/content-types/{id}` | getEditorialContentType |
| POST `/content-types` | createEditorialContentType |
| PATCH `/content-types/{id}` | updateEditorialContentType |
| POST `/content-types/{id}/restore` | restoreEditorialContentType |
| DELETE `/content-types/{id}/permanent` | permanentlyDeleteEditorialContentType |
| DELETE `/content-types/{id}` | deleteEditorialContentType |
| GET `/entries` | listEditorialEntries |
| GET `/entries/{id}` | getEditorialEntry |
| POST `/entries` | createEditorialEntry |
| PATCH `/entries/{id}` | updateEditorialEntry |
| DELETE `/entries/{id}` | deleteEditorialEntry |
| POST `/entries/{id}/submit` | submitEditorialEntry |
| POST `/entries/{id}/approve` | approveEditorialEntry |
| POST `/entries/{id}/request-changes` | requestEditorialEntryChanges |
| POST `/entries/{id}/publish` | publishEditorialEntry |
| POST `/entries/{id}/unpublish` | unpublishEditorialEntry |
| POST `/entries/{id}/transition` | transitionEditorialEntry |
| GET `/entries/{id}/revisions` | listEditorialEntryRevisions |
| POST `/entries/{id}/revisions` | createEditorialEntryRevision |
| POST `/entries/{id}/revisions/{revisionId}/restore` | restoreEditorialEntryRevision |

Documentare 200/201 secondo comportamento effettivo, 400 validazione, 401 autenticazione,
403 permesso, 404 risorsa non visibile/esistente e 409 conflitto ottimistico/modello
incompatibile dove applicabile. Nessun cambio di status soltanto per adattare lo snapshot.
Se i conflitti attuali sono 400, migrare esplicitamente a errore tipizzato e 409 in A3/B1.
`meta.count` resta numero di elementi restituiti, non totale; total opzionale solo se
calcolato sul filtro autorizzato. Conservare offset/limit esistenti, massimo 100,
sort deterministico con tie-break ID. Cursor può essere additive successivo.

Sicurezza: descrivere bearer e cookie access token come alternative OpenAPI, con
cookie name derivato dal bootstrap; CSRF resta obbligatorio sulle mutazioni cookie.
Non trattare la firma plugin come bearer: il flusso necessita dei sei header v2 e
del body canonico. Dichiarare tutti gli header, non soltanto la signature apiKey.
Il generic `x-api-key` del client non implica che ogni route server lo accetti.

Gate CI: ottenere manifest route dal bootstrap applicativo e confrontare method/path
normalizzati con il documento generato. Ogni route è public API oppure internal/operational
con esclusione esplicita e motivata: nessun silenzio del generatore. Validare operation ID
unici prima e dopo sanitizzazione, tag coerenti, riferimenti risolti, path params obbligatori,
security e body/response. Gestire nel generatore i costrutti realmente usati dagli schemi
(`$ref`, union, nullable, enum, arrays, additionalProperties); schema non supportato deve
fallire la generazione, non degenerare silenziosamente in un tipo ingannevole.

Rigenerare snapshot e SDK, includere Editorial nel catalogo ufficiale, sostituire gli
usi editoriali di `cms.request`. Testare roundtrip request/response contro HTTP reale,
oltre al `sdk:check` che verifica solo l'allineamento al file versionato.

## Overlay SDK per plugin custom

Il generatore attuale scrive import relativi a `../runtime/types.js` e pulisce l'output;
così com'è non è uno strumento esterno completo. Esportare `sdk/runtime` e aggiungere
una CLI SDK distribuita con modalità `official` e `overlay`. Official mantiene l'output
interno; overlay importa i tipi da `@trinacria-cms/sdk/runtime` e produce
`createPluginSdk(core: CmsSdkClientCore)` in una directory del progetto consumer.

L'overlay viene consumato separatamente, per esempio `const catalog = createPluginSdk(cms)`;
non usare Object.assign sul client base né sovrascriverne gruppi/metodi. Selezionare le
operazioni tramite metadata owner `x-cms-plugin-id`, introdotto dai controller;
selezione esplicita ammessa per documenti terzi privi di metadata owner. Tag/ID collidenti falliscono.
La CLI legge file locali per default; download HTTP solo da URL fornito dall'autore,
nessuna discovery automatica di segreti. Generazione deterministica e offline in CI.

Pulizia solo dei file elencati nel manifest del generatore della directory dichiarata;
rifiutare output root, repository root, directory non vuota senza marker e node_modules.
Il client conserva fetch/transport, credentials, abort ed errori già disponibili, zero
dipendenze runtime. La CLI può avere dipendenze di build, separate dagli import browser.

## B2 — Pacchetti e admin

Pacchetti da distribuire: kernel, core-pack, SDK, admin-kernel, trinacria-ui, editorial-pack,
media-pack ed email-pack. Root, playground, backoffice ed esempi restano privati; gli
starter possono essere scaricati come template senza diventare dipendenze runtime.
Conservare la licenza MIT presente nel repository, copiarla nei tarball e dichiararla
nei manifest. Allowlist `files`: dist, README, LICENSE e CSS/assets necessari; mai test,
env, credenziali, cache Storybook o node_modules. Esaminare sourcemap e contenuti prima
di pubblicare. Contratti e renderer via export subpath, nessun path verso `src`.

Prima beta: versioni coordinate e dipendenze ufficiali esatte della stessa release.
La versione del primo pacchetto completo è da fissare al gate G2, senza presumere
una baseline pubblicata 0.1.x. Registrarla nel manifest della release. I plugin ufficiali
dichiarano un `requiresCore` che ammette esplicitamente il prerelease verificato: per
esempio `^0.2.0-beta.1` se questa sarà la versione scelta; `^0.2.0` da solo non ammette
automaticamente una beta. Aggiornare manifest plugin,
versioni package e peer coordinati nello stesso lotto, senza pubblicare artefatti parziali.
Peer React/ReactDOM dei pack admin opzionali sul backend, ma richiesti dal progetto
frontend che importa `/admin`; Mongoose peer allineato alla major supportata. Verificare
server-only in fixture senza installare React. Il meta-host admin mantiene un solo React.
Mantenere i guardrail del grafo runtime, estendendoli ai plugin della fixture esterna.

Renderer fidati integrati al build host con manifest e componentRef; niente download
arbitrario JS dall'admin. L'API discovery abilita contributi solo dei plugin loaded;
il bundle non deve esporre pagine di plugin disabilitati. Una dipendenza plugin può
richiedere host UI rebuild, esplicitamente documentato nella procedura install/upgrade.

Pipeline: build → pack in ordine topologico → registry locale temporaneo isolato →
npm install da tarball/registry fixture → verifiche → inventario checksum artefatti →
pubblicazione della release beta. Non risolvere dipendenze della fixture tramite workspace
o symlink al sorgente. Pubblicazione solo da CI con identità del maintainer e provenienza;
la creazione di queste specifiche non pubblica nulla. Non ritirare versioni funzionanti
per gestire un rollback; pubblicare correzione, recuperare dati con il runbook C0.

## D0 — Starter e conformità

Starter scelto: `catalog-plugin`, piccolo catalogo articoli con un'entità, CRUD validato,
setting di prefisso, permesso read/write, evento `item-created` con metadata e widget/pagina
admin. Un secondo plugin consumer verifica eventi protetti e accesso cross-plugin,
senza import delle implementazioni del catalogo. Non dipende da Editorial per funzionare.

CLI `create-trinacria-plugin` copia il template versionato, valida pluginId e directory,
non sovrascrive file esistenti, usa nomi namespace coerenti e non installa/esegue script
di pacchetti sconosciuti automaticamente. Offre una configurazione esplicita backend/admin
e istruzioni install/build/test. Nessun endpoint o credenziale sensibile precompilati.

Suite di conformità distribuita come tool di sviluppo: manifest, compatibilità semver,
owner, errori/schema HTTP, negative authz, lifecycle/reload/cleanup, migrazione N→N+1,
provider mancanti, headless e browser. La conformità non certifica che il codice sia innocuo.
Test esterno ripetibile in CI; prova umana con un autore del team che non ha scritto lo
starter, registrando attriti e modifiche all'host. Nessuna modifica al kernel ammessa
durante la prova; integrazione host esplicita e ricompilazione admin sono ammesse.

Acceptance B0/B1/B2/D0: semver corretto, 22 route Editorial documentate e tipizzate,
OpenAPI runtime allineata, overlay compilabile fuori dal monorepo, tarball completi,
cold start senza sorgenti workspace, browser con una copia React e ciclo upgrade/remove
del catalogo con dati conservati. Aggiornare README SDK e guide EN/IT alla procedura reale.

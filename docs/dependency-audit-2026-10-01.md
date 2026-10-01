# Analisi delle dipendenze — 1 ottobre 2026

## Aggiornamento eseguito

Il piano è stato applicato per gruppi, comprese le migrazioni major separate. Tutti i pacchetti
segnalati nell'analisi iniziale sono aggiornati alle versioni disponibili, con l'eccezione
intenzionale di `@types/node`: viene mantenuta la linea 24 coerente con il runtime, non la 26.
I tipi Redis superflui sono stati rimossi; npm resta 11.16.0 come previsto.

Versioni finali principali:

- Node 24.21.0 fissato in `.nvmrc`, CI e requisiti del progetto; tipi Node 24.19.0.
- Trinacria core/events/http/schema 0.1.1 stabile, aggiornati insieme.
- Storybook e addon 10.6.1; esbuild 0.28.2, unica versione nel lock.
- React e relativi tipi 19.3.0, Vite 8.3.2/plugin-react 6.1.1, Tailwind/PostCSS plugin 4.3.3,
  PostCSS 8.5.28 e axe-core 4.13.0.
- Mongoose 9.10.3, dipendenze limitate alla major 9 e peer kernel `>=9 <10`.
- AWS SDK S3/presigner 3.1144.0, jose 6.2.12, ioredis 6.0.0, tipi Nodemailer 8.0.2.
- dotenv 18.0.5, jsdom 30.1.1/tipi 30.0.0 e Lucide 1.49.0.

Le prove sono state eseguite su Node 24.21.0 scaricato in una cartella temporanea, senza cambiare
l'installazione globale Node del computer. Il README documenta l'attivazione tramite nvm.

### Validazione finale

| Controllo | Esito |
| --- | --- |
| Installazione pulita `npm ci` | Passa |
| `npm run check` | Passa: format, lint, typecheck, test, dipendenze e confini dei pack |
| Suite ordinaria, eseguita direttamente nei workspace senza cache Turbo | 464 passati, 0 falliti; 5 integrazioni saltate qui e abilitate nella suite dedicata |
| Integrazioni reali Mongo/S3/Redis | 11 passate, 0 fallite, 0 skip |
| Chromium dopo tutte le migrazioni | 17/17 passati |
| Build applicazione e Storybook con `--force` | Passano, senza cache |
| SDK generated check | Passa |
| `npm ls --all` | Nessun problema di dipendenze o peer |
| `npm audit` completo | 0 vulnerabilità note |
| `git diff --check` | Passa |

Sono state controllate anche le schermate desktop e mobile dell'editor prodotte dagli E2E:
icone, toolbar, tipografia e notifiche risultano renderizzate correttamente. Storybook mantiene
un avviso non bloccante sulla dimensione di alcuni chunk.

È stata aggiunta un'integrazione Redis ripetibile che verifica JSON, TTL, cancellazione e
isolamento dei namespace. È stata abilitata anche in CI con un servizio Redis temporaneo.
La prova con ioredis 6 usa il protocollo predefinito RESP3 contro Redis 7; non è stato necessario
forzare RESP2. Proxy Redis esterni non sono stati verificati.

È stato aggiunto un test del bootstrap dotenv che verifica la priorità di `CMS_ENV_FILE` e il
mantenimento dei valori già presenti nel processo. Trinacria stabile, jsdom 30 e Lucide 1 non
hanno richiesto modifiche alle API applicative per passare i controlli. Il peer Swagger di HTTP
è opzionale; il controller Swagger del CMS continua a usare la configurazione esistente.

Durante il controllo finale è stato corretto un errore di sola formattazione in
`dashboard-widget-board.tsx`, senza modificarne il comportamento. Le integrazioni hanno usato
database di test dedicati e servizi S3/Redis temporanei, senza resettare database di sviluppo.

## Esito dell'analisi iniziale

Il monorepo contiene 11 workspace e 38 dipendenze esterne dirette distinte, contando anche devDependencies e peerDependencies. Il registro npm segnala aggiornamenti per 29 di queste. L'albero installato non presenta dipendenze mancanti o peer incompatibili secondo `npm ls --all`; il controllo delle dichiarazioni interne passa per tutti gli 11 workspace.

L'audit npm completo segnala **1 vulnerabilità bassa**, transitiva e di sviluppo, in esbuild. L'audit con `--omit=dev` segnala **0 vulnerabilità note**. Questi risultati descrivono gli advisory npm disponibili al momento della verifica, non certificano l'assenza di problemi.

Al momento dell'analisi iniziale non erano stati aggiornati package.json, package-lock.json o node_modules. La tabella seguente conserva lo stato prima dell'intervento e i target allora proposti; gli esiti dell'aggiornamento sono registrati sopra.

## Priorità 1: runtime, sicurezza e vincoli

### Allineare Node e i tipi

- Ambiente locale: Node **24.18.0**, npm **11.16.0**.
- CI: Node **22**, in `.github/workflows/ci.yml`.
- README: requisito generico **Node 20+**.
- Tipi installati: `@types/node` **25.9.1**, con minimi diversi tra root e workspace.
- Non c'è un requisito `engines.node` nel package.json root.

Consiglio di adottare **Node 24 LTS** in sviluppo, CI e produzione, aggiornare il runtime alla patch verificata **24.21.0**, uniformare i tipi alla linea **24** (registro: **24.19.0**) e dichiarare la versione supportata. I tipi possono esporre API che Node 22/24 non possiede; non c'è evidenza in questa analisi che il codice attuale le utilizzi, ma l'allineamento elimina questo rischio.

La scelta di Node 24 è anche un prerequisito concreto per Trinacria stabile: **tutti e quattro i pacchetti `@trinacria/*@0.1.1` dichiarano `node: >=24 <25`**. La CI Node 22 sarebbe fuori supporto dopo quell'aggiornamento. Anche Node 26 sarebbe fuori dal loro vincolo attuale. Node 20 è arrivato a fine supporto: [fonte ufficiale Node](https://nodejs.org/en/about/eol).

Il registro indica npm **12.2.0** come latest, ma npm **11.16.0** è coerente con `packageManager` e non richiede una migrazione immediata. Valutare npm 12 separatamente per evitare di cambiare contemporaneamente il comportamento del resolver e tutte le librerie.

### Eliminare l'advisory esbuild attraverso Storybook

Il lock contiene:

- `node_modules/esbuild`: **0.27.7**, usato da Storybook **10.4.0**, vulnerabile.
- `node_modules/tsx/node_modules/esbuild`: **0.28.2**, già corretto.

[GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr) riguarda letture arbitrarie di file tramite il server di sviluppo esbuild su Windows. Le versioni interessate sono `>=0.27.3 <0.28.1`; la correzione parte da **0.28.1**. Il contesto macOS locale e Ubuntu della CI non corrisponde alla piattaforma interessata.

Storybook 10.4.0 ammette esbuild fino alla linea 0.27; **Storybook 10.6.1 ammette anche `^0.28.0`**. Consiglio di portare Storybook, react-vite, addon-docs e addon-a11y tutti a **10.6.1**, risolvere il lock su esbuild corretto e rieseguire l'audit. L'aggiornamento dei soli pacchetti diretti non garantisce che una versione transitiva già bloccata venga sostituita: verificare il lock risultante. Evitare un override forzato fuori dai vincoli di Storybook 10.4.0.

### Limitare Mongoose alla major validata

Il vincolo **`>=9`** compare in core-pack, kernel, editorial-pack e media-pack. Consente anche future major 10, 11 e successive. Consiglio **`^9.10.3`** per le dipendenze installate e **`>=9 <10`** per il peer del kernel, fino alla validazione di altre major. La versione attuale è **9.9.1**; quella disponibile è **9.10.3**. Verificare query, transazioni, revisioni e adapter Mongo con i test di integrazione.

### Rimuovere i tipi Redis della linea 4

`@types/ioredis@4.28.10` è ancora dichiarato in core-pack, mentre il runtime usa ioredis 5. La versione installata dei tipi non è segnalata come deprecata nel lock: il problema è che è superflua rispetto ai tipi inclusi in ioredis 5. Gli import del codice arrivano direttamente da `ioredis`. La [guida ufficiale](https://github.com/redis/ioredis/wiki/Upgrading-from-v4-to-v5) raccomanda di disinstallare `@types/ioredis` dalla versione 5. Dopo la rimozione eseguire il typecheck.

## Versioni disponibili e decisioni

“Target” è la versione che consiglio per il prossimo intervento, non una versione già testata. Le versioni vengono dal registro npm interrogato durante questa analisi.

| Dipendenza | Installata | Latest | Target / valutazione |
| --- | --- | --- | --- |
| @aws-sdk/client-s3 | 3.1089.0 | 3.1144.0 | 3.1144.0, insieme al presigner; test S3/MinIO |
| @aws-sdk/s3-request-presigner | 3.1089.0 | 3.1144.0 | 3.1144.0; verificare upload e URL firmati |
| storybook | 10.4.0 | 10.6.1 | 10.6.1, gruppo completo |
| @storybook/react-vite | 10.4.0 | 10.6.1 | 10.6.1 |
| @storybook/addon-docs | 10.4.0 | 10.6.1 | 10.6.1 |
| @storybook/addon-a11y | 10.4.0 | 10.6.1 | 10.6.1 |
| tailwindcss | 4.2.2 | 4.3.3 | 4.3.3; verifica visiva backoffice e stories |
| @tailwindcss/postcss | 4.2.2 | 4.3.3 | 4.3.3, insieme a Tailwind |
| postcss | 8.5.25 | 8.5.28 | 8.5.28 |
| vite | 8.1.4 | 8.3.2 | 8.3.2; build e preview |
| @vitejs/plugin-react | 6.0.2 | 6.1.1 | 6.1.1, insieme a Vite |
| react | 19.2.4 | 19.3.0 | 19.3.0, insieme a react-dom e tipi |
| react-dom | 19.2.4 | 19.3.0 | 19.3.0 |
| @types/react | 19.2.14 | 19.3.0 | 19.3.0 |
| @types/react-dom | 19.2.3 | 19.3.0 | 19.3.0 |
| @types/node | 25.9.1 | 26.6.3 | 24.19.0 per Node 24; non inseguire latest |
| @types/nodemailer | 8.0.1 | 8.0.2 | 8.0.2; typecheck sul trasporto email |
| jose | 6.2.0 | 6.2.12 | 6.2.12; test autenticazione e token |
| mongoose | 9.9.1 | 9.10.3 | 9.10.3 con vincolo limitato alla major 9 |
| axe-core | 4.11.0 | 4.13.0 | 4.13.0; possibili nuove segnalazioni a11y |
| ioredis | 5.10.1 | 6.0.0 | 5.11.1 ora; major 6 in intervento separato |
| dotenv | 17.4.2 | 18.0.5 | Tenere 17.4.2 per il primo lotto; poi migrazione 18 |
| jsdom | 29.1.1 | 30.1.1 | Migrazione separata a 30.1.1 |
| @types/jsdom | 28.0.3 | 30.0.0 | 30.0.0 insieme a jsdom 30 |
| lucide-react | 0.577.0 | 1.49.0 | Migrazione separata a 1.49.0 |
| @trinacria/core | 0.1.1-alpha.0 | 0.1.1 | Stabile dopo allineamento Node 24 |
| @trinacria/events | 0.1.1-alpha.0 | 0.1.1 | Stabile insieme a core/http/schema |
| @trinacria/http | 0.1.1-alpha.0 | 0.1.1 | Stabile; verificare anche il peer Swagger |
| @trinacria/schema | 0.1.0 | 0.1.1 | Insieme al gruppo Trinacria |

Non risultano aggiornamenti da `npm outdated` per: **Biome 2.5.5, Playwright 1.61.1, tsx 4.23.15, Turbo 2.10.7, TypeScript 6.0.3, Nodemailer 10.0.13, qrcode 1.5.4, @types/qrcode 1.5.6, @types/ioredis 4.28.10**. Quest'ultimo resta candidato alla rimozione per le ragioni sopra.

## Migrazioni da tenere separate

- **Trinacria stabile:** passare insieme core/events/http/schema. Events e HTTP stabili richiedono `@trinacria/core: ^0.1.1`; aggiornare solo events può lasciare core alpha fuori dal peer richiesto. HTTP stabile dichiara anche `swagger-ui-dist: ^5.32.12` come peer. Verificare la risoluzione e l'esposizione Swagger, oltre a routing, eventi, DI e validazione. Gli attuali pin di core/http/schema richiedono modifiche ai manifest; un semplice `npm update` non basta.
- **ioredis 6:** passa a RESP3 per impostazione predefinita e richiede Node 20+. Il factory attuale non seleziona il protocollo. Verificare il server Redis e il comportamento della cache; `protocol: 2` permette di mantenere il protocollo precedente se necessario. Per il primo lotto preferire **5.11.1**. [Guida ufficiale 5 → 6](https://github.com/redis/ioredis/wiki/Upgrading-from-v5-to-v6).
- **dotenv 18:** rimuove il preload storico e il supporto .env.vault, cambia il logging e aggiunge una CLI. Il playground chiama già `config({ path })`, quindi il caricamento esplicito è un buon punto di partenza; validare comunque priorità dei file e bootstrap. [Changelog ufficiale](https://github.com/motdotla/dotenv/blob/master/CHANGELOG.md).
- **jsdom 30:** richiede Node `^22.22.2 || ^24.15.0 || >=26.0.0`. Il Node locale 24.18.0 soddisfa il requisito; la CI con la sola major 22 dipende dalla patch risolta. Allineare anche @types/jsdom ed eseguire i test dei componenti UI e di accessibilità.
- **Lucide 1:** cambia accessibilità predefinita e rimuove icone di brand. Gli import sono concentrati nel registro Icon, ma alias, rendering e semantica accessibile vanno controllati con typecheck, stories e test UI. [Guida ufficiale v1](https://lucide.dev/guide/version-1).

## Sequenza suggerita e validazione

1. Allineare Node 24, tipi Node e requisito documentato; rimuovere @types/ioredis e correggere i vincoli Mongoose.
2. Aggiornare tutto il gruppo Storybook e risolvere esbuild corretto; eseguire `npm run storybook:build`, test UI e `npm audit`.
3. Aggiornare patch/minor backend: jose, Mongoose, AWS SDK, ioredis 5.11.1 e tipi Nodemailer. Eseguire typecheck, unit test e integrazioni Mongo/S3; verificare cache Redis e flusso email con i servizi disponibili.
4. Aggiornare insieme React e tipi, poi Vite/plugin e Tailwind/PostCSS. Eseguire build, test UI, Storybook e i flussi E2E del backoffice, con controllo visivo delle pagine.
5. Gestire Trinacria stabile, ioredis 6, dotenv 18, jsdom 30 e Lucide 1 in lotti separati, così da isolare eventuali regressioni.

Alla fine eseguire i controlli del progetto (`npm run check`, build, Storybook, SDK generated check, integrazioni ed E2E) e ripetere `npm ls --all` e `npm audit`. Non è consigliabile un aggiornamento indiscriminato con `--force`.

## Metodo e limiti dell'analisi iniziale

Controlli eseguiti: lettura dei manifest e del lock, `npm outdated --workspaces --include-workspace-root --json`, `npm audit --json`, `npm audit --omit=dev --json`, `npm ls --all --json`, `npm run dependencies:check`, metadati npm `engines`, dipendenze e peer dei pacchetti critici, documentazione ufficiale sulle migrazioni.

Durante l'analisi iniziale non erano stati eseguiti build e test sulle versioni proposte; sono stati completati nel successivo aggiornamento, con gli esiti registrati all'inizio del documento. La verifica non comprende scansione delle immagini Docker, vulnerabilità dei servizi Mongo/Redis/MinIO o revisione delle versioni GitHub Actions: richiedono controlli distinti rispetto all'audit npm.

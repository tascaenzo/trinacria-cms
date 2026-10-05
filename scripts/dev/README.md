# Database CMS con dati mock

Il mock completo è distinto dalla scelta demo del wizard (due bozze): lo script
avvia un CMS vuoto e lo popola tramite API.

Il database di sviluppo è `trinacria_cms`. Lo script usa il Mongo locale configurato
nel `.env` del playground e ricrea i dati tramite installer e SDK del CMS.
Non viene eseguito durante il normale avvio.

## Comandi

Richiede Node/npm nelle versioni del progetto e il replica set Mongo del compose attivo.
Fermare prima i processi CMS e i test che usano questo Mongo.

```sh
docker compose up -d --wait mongo
npm run db:mock:plan
```

Il piano non modifica database, configurazione o dati mock. Prima del reset, salvare un
backup del database corrente. Per il Mongo del compose:

```sh
mkdir -p .tmp/db-backups
docker compose exec -T mongo sh -c 'exec mongodump --host 127.0.0.1 --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db trinacria_cms --archive --gzip' > .tmp/db-backups/before-mock-reset.archive.gz
chmod 600 .tmp/db-backups/before-mock-reset.archive.gz
npm run db:mock:reset
```

Il reset elimina tutti i dati di `trinacria_cms`, ricrea il CMS e, dopo le verifiche API,
elimina gli altri database con prefisso `trinacria_` presenti al momento del piano.
Rifiuta Mongo remoto, URI SRV, nomi di database diversi e `NODE_ENV=production`.
I database interni `admin`, `config`, `local` e gli eventuali database di altri progetti
non sono inclusi nella pulizia. Le chiavi del vault vengono generate nel `.env` locale
solo se mancanti, per consentire anche i successivi avvii del CMS.

## Dati creati

- Installazione completata: Trinacria Demo, lingua italiana, fuso Europe/Rome.
- Quattro utenti: amministratore e profili content manager, reviewer e author con ruoli assegnati.
- Tre modelli: Pagine, Articoli con revisione, Servizi.
- Tredici contenuti: dieci pubblicati, due bozze e uno in revisione.
- Tre immagini PNG valide nella cartella pubblica Immagini demo.
- Navigazione pubblica con quattro voci e campi interni esclusi dalla delivery.
- Permessi, impostazioni, traduzioni e template email inizializzati dai plugin ufficiali.

L'unico account con credenziali di accesso è `admin@trinacria.local`.
La password casuale viene salvata in `.tmp/mock-cms/access.json` con permessi `600`,
fuori da Git. È possibile impostare `MOCK_ADMIN_PASSWORD` prima del comando per
sceglierla esplicitamente. Gli altri utenti sono profili dimostrativi senza password.
Le credenziali non vengono stampate nei log. Il riepilogo delle verifiche è in
`.tmp/mock-cms/result.json`.

Lo script salva il percorso assoluto dello storage locale nelle impostazioni e usa
chiavi opache diverse per i nuovi file. I vecchi file media sono conservati per poter
ripristinare il precedente database insieme al relativo storage. Il percorso usato
dall'esecuzione è riportato nel file `result.json`.

Per usare il dataset, avviare normalmente playground e backoffice con `npm run dev`.
Il reset lascia il Mongo attivo e chiude il processo CMS temporaneo usato per popolare i dati.

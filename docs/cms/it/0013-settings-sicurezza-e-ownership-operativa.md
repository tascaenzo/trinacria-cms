# 0013 - Settings: sicurezza e ownership operativa

## Obiettivo

Fissare la policy operativa del dominio `settings` prima di introdurre UX di scrittura o aperture amministrative che potrebbero rompere il modello di ownership plugin.

La direzione scelta in `M2` e questa:

- le definizioni settings restano superficie leggibile dagli operatori autenticati nel backoffice e dalle integrazioni che hanno gia accesso ai metadati di configurazione;
- i valori risolti non-segreti restano leggibili nel backoffice per scopi operativi e di debug;
- i secret non vengono mai esposti in chiaro al backoffice umano tramite JWT admin generico;
- scrittura, export e reveal restano operazioni plugin-aware, cioe abilitate solo al plugin owner autenticato con firma;
- il backoffice puo aiutare l'operatore a preparare o inoltrare operazioni di scrittura, ma non puo impersonare il plugin owner.

## Problema da risolvere

Il dominio `settings` esiste gia con:

- ownership derivata dalla chiave (`ownerPluginId`);
- protocollo `SettingsPluginAuth` per le operazioni sensibili;
- backoffice orientato alla lettura.

Mancava pero una decisione esplicita su un punto delicato: cosa puo fare un admin umano senza introdurre un bypass del modello di ownership dei plugin.

Senza questa decisione, qualunque UX di scrittura rischia di trasformare il backoffice in un super-client con privilegi impliciti sui settings di terzi.

## Attori

### 1. Operatore umano autenticato nel backoffice

Utente con JWT admin e permessi CMS classici. Non rappresenta automaticamente un plugin owner.

### 2. Plugin owner autenticato via `SettingsPluginAuth`

Integrazione server-to-server che possiede il namespace della chiave e firma la richiesta con `x-cms-plugin-*`.

### 3. Integrazione macchina non-owner

Servizio o plugin autenticato, ma non proprietario della chiave target.

### 4. Sistema CMS

Backend `core-pack`, SDK ufficiale e backoffice. Deve riflettere le stesse regole senza scorciatoie diverse per canale.

## Decisione

### 1. Ownership come vincolo primario

L'ownership del setting continua a essere determinata dal namespace della chiave.

Esempio:

- `core-pack:site:name` appartiene a `core-pack`;
- `seo-pack:analytics:measurement_id` appartiene a `seo-pack`.

Nessun admin umano e nessun plugin non-owner puo scrivere, esportare o fare reveal fuori dal proprio namespace solo perche possiede privilegi amministrativi generici.

### 2. Letture operative consentite

Sono considerate letture operative accettabili:

- elenco definizioni;
- dettaglio definizione;
- valore risolto non-secret, incluso fallback al default;
- metadata del secret solo in forma mascherata e senza plaintext.

Queste letture servono a:

- capire lo shape della configurazione;
- diagnosticare deriva tra default e valore esplicito;
- verificare se un secret esiste, quando e stato aggiornato e da chi;
- costruire viste CMS utilizzabili senza sbloccare dati sensibili.

### 3. Reveal dei secret vietato al backoffice admin generico

Il plaintext del secret e una capacita riservata al plugin owner autenticato via firma.

Motivi:

- l'admin del CMS non coincide necessariamente con il maintainer dell'integrazione esterna;
- il reveal rompe la separazione tra governance piattaforma e responsabilita del plugin;
- il rischio operativo e alto: copia manuale, screenshot, log accidentali, session hijack, support access.

Conseguenza: il backoffice puo mostrare solo stato e metadata mascherati dei secret, mai il valore in chiaro tramite JWT admin.

### 4. Scritture admin solo come broker plugin-aware

Se il backoffice deve supportare scrittura settings, la direzione ammessa non e "admin scrive direttamente", ma:

- il backoffice raccoglie intent e payload in forma tipata;
- l'operazione viene eseguita solo contro endpoint che richiedono identita owner coerente;
- il sistema deve rendere esplicito quale plugin owner sta autorizzando la scrittura;
- se non esiste un caller plugin valido, la scrittura non viene eseguita.

Questo significa che il backoffice puo diventare un broker o orchestratore di richieste plugin-aware, non un sostituto dell'ownership plugin.

### 5. Export come operazione owner-scoped

L'export snapshot di un plugin rimane limitato al plugin owner che esporta il proprio namespace.

Un admin umano puo consultare le viste aggregate utili nel backoffice, ma non puo richiedere export raw arbitrari dei namespace altrui tramite JWT.

## Matrice attori -> operazioni

| Operazione | Backoffice admin umano | Plugin owner signed | Integrazione non-owner | Note |
| --- | --- | --- | --- | --- |
| Leggere elenco definizioni | si | si | si | Superficie documentale/operativa |
| Leggere dettaglio definizione | si | si | si | Nessun plaintext sensibile |
| Leggere valore risolto non-secret | si | si | si | Utile per debugging operativo |
| Leggere metadata secret mascherati | si, ma senza plaintext | si | no | Il non-owner non deve enumerare metadata sensibili di terzi |
| Reveal secret | no | si | no | Solo owner signed |
| Scrivere definizione | no in modo diretto | si | no | Eventuale UX admin solo brokerizzata |
| Scrivere valore non-secret | no in modo diretto | si | no | Eventuale UX admin solo brokerizzata |
| Scrivere secret | no in modo diretto | si | no | Sempre owner signed |
| Export snapshot plugin | no in modo diretto | si, solo per il proprio plugin | no | Nessun export cross-plugin |

## Implicazioni architetturali

### Backend

- i controller devono distinguere chiaramente tra letture operative e operazioni owner-only;
- gli errori di ownership devono restare espliciti e stabili;
- OpenAPI deve documentare in modo netto quali route sono admin-readable e quali sono signed-only.

### SDK

- l'SDK deve riflettere i contratti effettivi, senza suggerire che un bearer admin basti per scritture o reveal;
- le API sensibili devono restare tipizzate come plugin-signed workflows.

### Backoffice

- la UI puo leggere definizioni, valori risolti e metadata mascherati;
- la UI non deve introdurre bottoni "reveal" o "save" che chiamano direttamente endpoint owner-only con il solo contesto admin;
- eventuali flussi di scrittura devono esplicitare il plugin owner coinvolto e la natura brokerizzata dell'operazione.

Stato operativo corrente in `M2`:

- il backoffice prepara handoff di scrittura per valori non-secret;
- il payload viene composto lato UI ma non eseguito dal browser admin;
- il plugin owner resta il soggetto che deve firmare ed eseguire la chiamata effettiva.

### Documentazione e governance

- la policy settings diventa parte del modello di sicurezza del CMS;
- ogni futura apertura amministrativa sul dominio `settings` deve dichiarare come preserva l'ownership plugin.

## Alternative scartate

### 1. Admin onnipotente sui settings

Scartata perche rende il backoffice un bypass generale dell'ownership plugin.

Effetti collaterali:

- disallineamento tra backend e modello concettuale plugin-based;
- rischio alto sui secret;
- difficile audit di responsabilita.

### 2. Nessuna lettura dal backoffice

Scartata perche il dominio diventerebbe corretto ma inutilizzabile operativamente.

Gli operatori hanno bisogno di:

- vedere il catalogo settings;
- diagnosticare valori correnti;
- capire se una integrazione e configurata.

### 3. Reveal consentito agli admin ma non scrittura

Scartata perche il reveal e gia di per se l'operazione piu sensibile del dominio. Consentirlo a un admin generico introdurrebbe comunque il bypass che stiamo evitando.

## Decisioni operative per M2

Le attivita successive della milestone devono seguire questi vincoli:

1. backend, OpenAPI e SDK devono convergere su questa matrice;
2. il backoffice puo introdurre un write flow solo se plugin-aware e senza impersonazione;
3. la documentazione end-to-end deve distinguere chiaramente lettura operativa, scrittura owner-scoped, export owner-scoped e reveal owner-only.

## Stato

Decisione accettata per `M2`.

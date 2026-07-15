# Direzione architetturale: CMS plugin-first

Questo documento fissa la direzione architetturale scelta per Trinacria CMS prima
di proseguire con la stesura del core e dei plugin dominio.

## Decisione

Trinacria CMS deve evolvere come una piattaforma **plugin-first**, piu vicina al
modello WordPress modulare che a un generatore universale di CRUD.

Il CMS e costruito sopra Trinacria, una libreria/framework separata che fornisce
DI, moduli, lifecycle, HTTP, schema e tooling. Il core CMS deve quindi restare
piccolo e infrastrutturale: non deve duplicare Trinacria, ma specializzarla per
un prodotto CMS estendibile. Le funzionalita applicative devono arrivare da
plugin separati.

## Relazione con Trinacria

Trinacria e la fondazione tecnica.

Trinacria CMS e un prodotto costruito sopra quella fondazione.

```text
@trinacria/*            = framework base
@trinacria-cms/kernel   = layer CMS sopra Trinacria
@trinacria-cms/core-pack = plugin ufficiale minimo
plugin dominio          = funzionalita applicative
```

Questa separazione e importante: se una funzionalita e generica per qualunque
runtime modulare, appartiene a Trinacria. Se invece serve a costruire un CMS
plugin-first, appartiene al kernel CMS o a un plugin.

## Core minimo

Il core ufficiale deve occuparsi solo delle capacita trasversali necessarie a
far funzionare il CMS:

- installazione iniziale
- autenticazione
- utenti
- ruoli
- permessi
- settings
- configuration registry e secrets
- signed plugin caller authentication
- plugin runtime
- lifecycle plugin
- namespace storage
- namespace governance e alias
- event bus plugin opzionale
- Mongo storage core
- security/capability model
- backoffice shell e registry admin

Il core non deve contenere domini come ecommerce, editoriale, media library, SEO,
booking o analytics. Questi devono essere plugin.

## Plugin funzionali

I plugin sono il punto in cui il CMS acquisisce funzionalita concrete.

Esempi:

- `commerce-pack`: prodotti, ordini, clienti, coupon, pagamenti
- `media-pack`: asset, cartelle, trasformazioni, metadati
- `seo-pack`: metadata, sitemap, redirect, canonical URL
- `booking-pack`: disponibilita, prenotazioni, calendari
- `analytics-pack`: eventi, dashboard, aggregazioni
- `domain-pack`: funzionalita verticali definite dal progetto

Un plugin puo dichiarare:

- manifest
- capability
- permission
- entity
- repository
- API/controller
- settings
- lifecycle hook
- eventi emessi/sottoscritti
- admin route
- admin resource
- widget dashboard
- UI custom

## Resource-driven admin

Il sistema resource-driven non e l'identita principale del CMS. E una utility per
ridurre codice ripetitivo nei plugin.

Va usato per CRUD standard:

- liste
- create/edit semplici
- status toggle
- dettagli base
- tassonomie
- cataloghi
- settings strutturati

Non deve forzare plugin complessi dentro un generatore generico. Un plugin deve
sempre poter sostituire o estendere la UI generata con componenti custom.

Esempio:

- un plugin semplice puo usare admin resource per cataloghi e tassonomie
- un plugin complesso puo usare UI custom per workflow e viste operative

## Configuration registry

La collection `settings` e il registro centralizzato della configurazione
piattaforma.

Deve supportare:

- configurazioni core
- configurazioni plugin
- valori pubblici
- valori protetti
- secret cifrati e mascherati
- accesso in chiaro solo a owner o policy esplicite
- audit di reveal, scrittura e rotazione

Il backoffice non diventa proprietario dei secret: agisce come broker operativo.

## Namespace, alias ed eventi

Il kernel deve governare namespace e alias per evitare collisioni tra plugin su
entity, settings, permission, route admin, resource ed eventi.

Il CMS deve inoltre offrire un event bus opzionale basato sulle primitive eventi
di Trinacria. I plugin possono emettere e sottoscrivere eventi dichiarati,
riducendo dipendenze dirette tra plugin.

## Differenza rispetto a un approccio Strapi-like puro

Un approccio Strapi-like mette al centro il content model e tende a generare
molto backoffice da schema/entity.

Trinacria CMS mette al centro il plugin:

- il plugin porta dominio e comportamento
- le entity sono una parte del plugin, non il prodotto intero
- le UI possono essere generate o custom
- capability e permission sono parte del contratto plugin
- il backoffice si compone da contribution

Quindi:

```text
Non:  schema -> CRUD -> CMS
Si:   plugin -> capability/API/entity/admin -> funzionalita CMS
```

## Perche MongoDB

Trinacria CMS e una piattaforma **Mongo-first**.

MongoDB non e un dettaglio sostituibile dietro un'astrazione multi-database
generica. E una scelta architetturale coerente con questa direzione perche lascia
liberta ai plugin senza obbligare subito ogni dominio a un modello relazionale
rigido.

Vantaggi attesi:

- ogni plugin puo avere entity con shape diverse
- documenti e configurazioni possono evolvere in modo incrementale
- campi custom e metadata plugin-specific sono naturali
- settings, schema dinamici e contenuti flessibili sono piu semplici
- il namespace fisico per plugin/entity e diretto

Questa liberta non significa assenza di contratti.

Ogni plugin deve comunque dichiarare schema, DTO, repository e validazioni. Mongo
e usato come storage flessibile, non come scusa per dati non governati.

Il kernel deve quindi possedere il **Mongo storage core**:

- connessione e handle Mongo condivisi
- namespace plugin/entity
- `EntityRegistry`
- convenzioni repository
- dichiarazione indici
- mapping errori storage
- regole di isolamento tra plugin

`core-pack` e i plugin dominio non devono definire un proprio layer storage
parallelo. Devono dichiarare entity, schema, repository e indici usando i
contratti Mongo-first del kernel.

Non e un obiettivo supportare altri database nella prima architettura del CMS.
Se in futuro servira un secondo storage, dovra essere una nuova decisione
architetturale, non una complessita preventiva.

## Confini di responsabilita

### `kernel`

Responsabile di:

- runtime plugin
- lifecycle
- namespace
- Mongo storage core
- entity registry
- contratti security
- error model

Non responsabile di:

- logiche ecommerce
- logiche editoriali
- UI dominio
- business workflow specifici

### `core-pack`

Responsabile delle funzionalita ufficiali minime:

- auth
- installation
- users
- roles
- permissions
- settings
- manifest provisioning (security, settings, and i18n)
- signed plugin caller authentication

Non deve diventare il contenitore di tutti i moduli applicativi.

### `admin-kernel`

Responsabile di:

- shell backoffice
- route registry
- resource registry
- capability-aware rendering
- adapter SDK/frontend
- componenti runtime condivisi per pagine admin

Non deve conoscere i dettagli business di ecommerce, editoriale o altri plugin
verticali.

### `trinacria-ui`

Responsabile di componenti visivi, design system e pattern backoffice riusabili.

Non deve contenere logica CMS.

## Forma target di un plugin

Un plugin dominio dovrebbe poter essere strutturato cosi:

```text
plugin/
  manifest
  capabilities
  permissions
  entities
  repositories
  services
  controllers
  settings
  admin-contribution
  optional custom admin UI
```

Esempio concettuale:

```ts
defineCmsPlugin({
  id: "domain-plugin",
  capabilities: ["domain.read", "domain.write"],
  entities: [DOMAIN_ENTITY],
  admin: {
    navigation: [...],
    resources: [...],
    routes: [...]
  }
});
```

## Prossima milestone consigliata

La prossima milestone non deve ancora essere un plugin dominio.

Dovrebbe essere:

## Specifiche core della piattaforma plugin-first

Prima di definire prodotti editoriali, commerce, media o altri domini, il
progetto deve chiudere le specifiche di base:

- contratto plugin
- runtime plugin
- security core
- Mongo storage core
- configuration registry
- namespace governance
- plugin event bus
- settings core
- admin extensibility
- installation/bootstrap
- packaging e discovery
- observability e operations
- API/SDK contract

Questa milestone dimostra che il CMS puo crescere con plugin funzionali solo
dopo aver chiuso contratti core stabili e verificabili.

## Regole guida

1. Il core deve rimanere piccolo.
2. Ogni dominio applicativo vive in un plugin.
3. Le entity sono dichiarate e validate, anche se Mongo e flessibile.
4. Le capability sono il contratto operativo tra plugin, API e backoffice.
5. Il backoffice si estende tramite contribution.
6. Resource-driven admin accelera i CRUD standard, ma non sostituisce UI custom.
7. Ogni plugin importante deve poter portare workflow propri.
8. Nessun dominio verticale deve entrare nel core senza una ragione infrastrutturale.
9. Il kernel governa Mongo, non una astrazione multi-database preventiva.

## Implicazione sul piano attuale

Le milestone content/editorial esistenti devono uscire dal percorso attivo del
core. Per ora restano come riferimento storico o backlog dominio, ma non guidano
la prossima implementazione.

`M4.0` e la milestone documentale della piattaforma core. Solo dopo la chiusura
delle specifiche core si potra aprire una milestone dominio separata.

Il lavoro gia fatto su admin resources resta utile come infrastruttura per i
plugin, ma non deve guidare da solo la forma del CMS.

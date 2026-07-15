# Confini core plugin-first

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: documentale
- Ultimo aggiornamento: `2026-05-20`

## Decisione

Trinacria CMS adotta una separazione esplicita tra framework, prodotto CMS,
baseline ufficiale e plugin dominio.

```text
@trinacria/*             -> framework base
@trinacria-cms/kernel    -> layer CMS sopra Trinacria
@trinacria-cms/core-pack -> plugin ufficiale minimo
plugin dominio           -> funzionalita applicative
```

Il core CMS non e un monolite funzionale e non e un generatore universale di
CRUD. Il core e l'infrastruttura che rende possibile installare, proteggere,
orchestrare ed estendere il CMS tramite plugin.

La regola principale e:

```text
framework generico -> Trinacria
runtime CMS        -> kernel
baseline CMS       -> core-pack
dominio prodotto   -> plugin
```

## Obiettivi

- evitare che il kernel replichi responsabilita gia coperte da Trinacria
- evitare che `core-pack` diventi un contenitore di funzionalita verticali
- dare ai plugin liberta di dominio senza rompere contratti, sicurezza e admin
- rendere chiaro dove collocare una nuova feature prima di implementarla

## Non obiettivi

- definire la API TypeScript definitiva dei plugin
- implementare nuovi package
- migrare le pagine backoffice esistenti
- imporre una UI generata per ogni entity

## Responsabilita di Trinacria

Trinacria e la libreria/framework base. Le sue responsabilita devono restare
generiche e riusabili anche fuori dal CMS.

Appartengono a Trinacria:

- dependency injection
- moduli applicativi
- lifecycle tecnico dei moduli
- primitive HTTP
- schema e validazione generica
- eventi
- cron
- CLI e tooling generico
- pattern runtime riusabili

Non appartengono a Trinacria:

- concetti CMS come plugin installati, capability CMS o admin contribution
- utenti, ruoli, permessi CMS
- entity registry CMS
- convenzioni storage per plugin CMS
- shell backoffice
- domini come editoriale, commerce, media o SEO

Una feature va in Trinacria solo se avrebbe senso anche in un'applicazione non
CMS.

## Responsabilita del kernel CMS

`@trinacria-cms/kernel` specializza Trinacria per costruire un CMS plugin-first.

Appartengono al kernel:

- contratto runtime dei plugin CMS
- validazione manifest e compatibilita
- dependency graph tra plugin
- lifecycle plugin: register, load, unload, reload, disable
- state machine runtime
- rollback su failure
- namespace plugin
- Mongo storage core
- `EntityRegistry`
- error model CMS
- contratti security e authz
- provisioning hook trasversali
- health e osservabilita runtime

Non appartengono al kernel:

- logiche business di dominio
- controller editoriali, commerce, media, booking o SEO
- workflow approvativi specifici
- UI backoffice di dominio
- repository concreti di feature verticali

Il kernel deve conoscere che un plugin puo dichiarare entity, capability, route o
admin contribution. Non deve conoscere il significato business di `post`,
`product`, `asset`, `order` o `booking`.

## Responsabilita del core-pack

`@trinacria-cms/core-pack` e il plugin ufficiale minimo installabile in ogni
istanza CMS.

Appartengono a `core-pack`:

- installation bootstrap
- autenticazione
- utenti
- ruoli
- permessi
- policy authorization
- settings base
- secrets/settings isolation
- signed plugin caller authentication for owner-scoped operations
- manifest provisioning dichiarato dai plugin (security, settings e i18n)
- endpoint amministrativi per la baseline piattaforma

Non appartengono a `core-pack`:

- post, pagine, categorie editoriali
- prodotti, ordini, clienti e pagamenti
- media library avanzata
- SEO, redirect, sitemap
- booking, calendari e disponibilita
- analytics dominio

`core-pack` puo fornire le basi per autorizzare e configurare plugin dominio, ma
non deve assorbirne le funzionalita.

## Responsabilita dei plugin dominio

Un plugin dominio aggiunge funzionalita applicative concrete al CMS.

Appartengono a un plugin dominio:

- capability specifiche
- permission specifiche
- entity e schema dominio
- repository dominio
- servizi applicativi
- controller/API dominio
- settings plugin-specific
- lifecycle hook dominio
- admin navigation
- admin resource
- admin route
- UI custom quando la resource UI non basta

Esempi:

| Plugin           | Responsabilita principali                              |
| ---------------- | ------------------------------------------------------ |
| `commerce-pack`  | products, orders, customers, coupons, payments         |
| `media-pack`     | assets, folders, metadata, transforms                  |
| `seo-pack`       | metadata, sitemap, redirects, canonical URL            |
| `booking-pack`   | availability, reservations, calendars                  |
| `analytics-pack` | tracking events, aggregates, dashboards, export/report |
| `domain-pack`    | funzionalita verticali definite dal progetto           |

## Responsabilita di admin-kernel

`packages/admin-kernel` ospita il runtime backoffice condiviso.

Appartengono ad `admin-kernel`:

- shell backoffice
- route registry
- resource registry
- rendering capability-aware
- sessione admin
- adapter SDK/frontend
- discovery delle contribution
- pagine baseline che parlano con `core-pack`
- primitive runtime per pagine admin

Non appartengono ad `admin-kernel`:

- logiche business dei plugin dominio
- stato applicativo persistente dei domini
- editor complessi hardcoded per domini futuri
- assunzioni specifiche su post, prodotti, asset o ordini

`admin-kernel` puo rendere una resource o montare una route custom dichiarata da
un plugin. Non deve decidere il modello dominio del plugin.

## Responsabilita di trinacria-ui

`packages/trinacria-ui` contiene design system e componenti riusabili.

Appartengono a `trinacria-ui`:

- primitive visuali
- componenti atomici/molecolari/organismi
- shell visuale riusabile
- pattern UI per resource, table, form, feedback e layout
- token e theme

Non appartengono a `trinacria-ui`:

- chiamate SDK CMS
- sessione admin
- permessi CMS
- logica entity
- logica dominio

Un componente UI puo essere generico e riusabile. La decisione di usarlo per
`posts`, `products` o `users` appartiene ad `admin-kernel` o al plugin.

## Regole decisionali

Quando arriva una nuova feature, si applica questa sequenza.

### 1. Serve anche fuori dal CMS?

Se si, candidata per Trinacria.

Esempi:

- schema validation generica
- HTTP routing generico
- eventi generici
- cron generico

### 2. Serve a orchestrare plugin CMS?

Se si, candidata per `kernel`.

Esempi:

- dependency graph plugin
- stato runtime plugin
- namespace storage plugin
- manifest validation
- `EntityRegistry`

### 3. Serve a rendere installabile e sicuro il CMS base?

Se si, candidata per `core-pack`.

Esempi:

- login
- utenti
- ruoli
- permessi
- settings base
- provisioning permission dichiarate da plugin

### 4. Porta una funzionalita prodotto specifica?

Se si, deve essere un plugin dominio.

Esempi:

- catalogo prodotti
- ordini
- asset media
- redirect SEO
- booking

### 5. E solo una rappresentazione admin?

Se si, va in `admin-kernel` o nella contribution del plugin.

Esempi:

- resource standard condivisa -> `admin-kernel`
- schermata ordini con workflow pagamento -> plugin `commerce-pack`
- vista operativa custom -> plugin dominio

### 6. E solo un componente visuale riusabile?

Se si, candidata per `trinacria-ui`.

Esempi:

- table
- field
- dialog
- resource toolbar
- status badge

## Esempi concreti

| Feature                               | Collocazione              | Motivo                                   |
| ------------------------------------- | ------------------------- | ---------------------------------------- |
| `parsePermissionKey`                  | `kernel`                  | Contratto security CMS trasversale       |
| creazione ruolo admin iniziale        | `core-pack`               | Bootstrap della baseline CMS             |
| componente `ResourceTable`            | `trinacria-ui`            | UI generica riusabile                    |
| registro risorse admin                | `admin-kernel`            | Composizione backoffice condivisa        |
| validazione schema generica           | Trinacria                 | Utilita framework non CMS-specific       |
| controller `POST /admin/api/products` | `commerce-pack`           | API dominio commerce                     |
| namespace Mongo per entity plugin     | `kernel`                  | Regola infrastrutturale condivisa        |
| collezione Mongo di un plugin dominio | plugin runtime            | Dato dominio creato via contratto kernel |
| route admin custom di un plugin       | plugin dominio            | UI dominio                               |
| pagina admin utenti                   | `admin-kernel` + core API | Baseline piattaforma                     |
| supporto multi-database generico      | fuori scope               | Complessita preventiva non richiesta     |

## Resource-driven admin

La resource-driven admin e una utility, non il modello principale del prodotto.

Va usata quando:

- la entity ha CRUD standard
- lista, filtri e form sono prevedibili
- le azioni sono semplici
- la UI custom non aggiunge valore immediato

Va evitata come unica strada quando:

- il flusso ha stati, revisioni, approvazioni o workflow complessi
- servono layout operativi dedicati
- l'esperienza utente e parte del valore del plugin
- la resource diventerebbe un generatore generico difficile da estendere

Regola:

```text
resource admin = acceleratore per casi standard
custom admin   = scelta normale per domini complessi
```

## Mongo storage core e confini

Trinacria CMS e Mongo-first. Il kernel deve governare Mongo come storage core
della piattaforma, non nasconderlo dietro una astrazione multi-database generica.

MongoDB abilita flessibilita per plugin diversi, ma non sposta responsabilita di
dominio nel core.

Il kernel deve fornire:

- connessione e handle Mongo condivisi
- namespace plugin/entity
- registrazione entity
- primitive per indici e validazione
- convenzioni repository
- mapping errori storage
- regole di isolamento

Il plugin deve fornire:

- schema della propria entity
- DTO pubblici
- repository e query dominio
- indici richiesti
- regole di evoluzione dati

Il database puo essere flessibile. I confini non devono esserlo.

Non e obiettivo della piattaforma supportare piu database nella prima
architettura. Se un giorno servira un secondo backend storage, sara una decisione
architetturale separata.

## Anti-pattern

Sono considerati anti-pattern:

- aggiungere `posts`, `products` o `assets` a `core-pack`
- mettere logiche di business dominio in `kernel`
- far dipendere `trinacria-ui` dal CMS SDK
- usare `admin-kernel` come contenitore di editor verticali
- trattare `EntityRegistry` come generatore automatico completo di prodotto
- creare plugin che saltano capability, permission e manifest
- usare Mongo senza schema, DTO e repository dichiarati
- introdurre astrazioni multi-database senza un requisito reale
- duplicare in `kernel` primitive gia offerte da Trinacria

## Impatto sulle milestone successive

La milestone implementativa successiva deve dimostrare questa separazione con un
blocco core della piattaforma, non con un plugin dominio.

I candidati implementativi sono:

- contratto plugin consolidato
- runtime plugin install/enabled/loaded
- manifest provisioning (security, settings e i18n)
- storage namespace/entity registry
- admin extensibility core

Il lavoro non deve trasformare M4/M5 in espansioni di domini applicativi dentro
il core. I domini saranno milestone separate solo dopo aver chiuso la piattaforma
core.

## Criterio di chiusura

Questa specifica e chiusa quando:

- le responsabilita per package sono accettate
- le regole decisionali sono sufficienti a classificare nuove feature
- M4/M5 sono riallineate alla direzione plugin-first
- le specifiche successive possono riferirsi a questi confini senza ripetere la
  decisione

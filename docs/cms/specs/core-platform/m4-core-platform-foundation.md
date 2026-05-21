# M4.0 Core Platform Foundation

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: documentale/funzionale
- Ultimo aggiornamento: `2026-05-20`

## Scopo

Questo documento sintetizza la base funzionale della milestone M4.0.

M4.0 non definisce un dominio applicativo. Definisce la piattaforma su cui i
domini potranno vivere: plugin runtime, sicurezza, storage Mongo-first,
configuration registry, namespace, event bus, backoffice extensibility,
bootstrap, operations e contratti API/SDK.

Questa e la roccia del CMS: ogni implementazione core successiva deve rispettare
queste decisioni o aggiornare esplicitamente la milestone.

## Decisioni fondative

### 1. Kernel e core-pack restano separati

`kernel` e il motore tecnico CMS.

`core-pack` e il plugin ufficiale minimo del prodotto.

Il kernel non deve conoscere utenti, ruoli, settings concreti o API business. Il
core-pack usa i contratti del kernel per implementare auth, utenti, ruoli,
permessi, settings, API keys e provisioning baseline.

### 2. La piattaforma e plugin-first

Ogni funzionalita verticale entra tramite plugin.

Il core deve offrire contratti, lifecycle, sicurezza, storage, comunicazione e
admin extensibility. Non deve diventare un contenitore di domini.

### 3. La piattaforma e Mongo-first

Il kernel possiede il Mongo storage core: namespace, entity registry, repository
conventions, indici, isolamento e mapping errori.

Non e obiettivo supportare altri database nella prima architettura.

### 4. Settings diventa Configuration Registry

La collection `settings` non e una tabella generica di configurazione.

E il configuration registry sicuro della piattaforma, usato da core e plugin per
valori pubblici, protetti e secret cifrati.

### 5. Namespace e alias sono governati dal core

Ogni plugin deve avere identificatori, namespace e alias non ambigui.

Il core deve definire regole di collisione, reserved namespace, ownership e
risoluzione degli alias prima di caricare contributi runtime.

### 6. L'event bus e opzionale ma di piattaforma

I plugin possono comunicare tramite eventi.

Il kernel espone il contratto CMS dell'event bus e si appoggia alle primitive
eventi di Trinacria. I plugin possono emettere e sottoscrivere eventi dichiarati,
senza creare dipendenze dirette tra domini.

La prima implementazione dell'event bus e in-process (`sync`/`async`). Delivery
persistente e broker esterni sono evoluzioni future.

### 7. Ruoli, permessi e capability sono contratti core

Capability e permission sono il linguaggio comune tra plugin, API, backoffice e
policy.

Il core-pack implementa utenti/ruoli/grant come baseline, ma il contratto di
sicurezza e trasversale alla piattaforma.

### 8. Audit centralizzato nel core-pack

Il kernel produce runtime diagnostics e runtime events.

`core-pack` possiede lo storage audit centralizzato per security, settings,
admin operations e audit events prodotti dalla piattaforma.

## Superfici core da specificare

| Area                     | Responsabilita principale                                       |
| ------------------------ | --------------------------------------------------------------- |
| Plugin contract          | Manifest, capability, permission, entity, settings, admin       |
| Plugin runtime           | Stati, lifecycle, ordering, rollback, enable/disable            |
| Security core            | Permission, ruoli, policy, provisioning, guards, signed calls   |
| Mongo storage core       | Namespace, entity registry, repository convention, indici       |
| Configuration registry   | Settings, secret, ownership, visibility, masking, audit         |
| Namespace governance     | Collisioni, alias, reserved names, ownership, canonical IDs     |
| Event bus                | Eventi dichiarati, publish/subscribe, delivery, policy          |
| Admin extensibility      | Navigation, route, resource, widget, visibility, custom UI      |
| Installation/bootstrap   | Primo setup, admin user, baseline provisioning, idempotenza     |
| Packaging/discovery      | Package shape, manifest location, compatibility, enable/disable |
| Observability/operations | Health, event log, diagnostics, audit operativo, error context  |
| API/SDK contract         | OpenAPI, API envelope, generated SDK, versioning                |

## Regole di implementazione futura

1. Prima si chiude la specifica, poi si implementa.
2. Nessuna feature dominio entra nella milestone core.
3. Nessun plugin accede a Mongo ignorando namespace e registry.
4. Nessun secret viene letto in chiaro dal backoffice come owner implicito.
5. Nessun alias o namespace viene accettato se collide con core, plugin attivi o
   reserved names.
6. Nessun plugin consuma eventi privati senza policy esplicita.
7. Nessun endpoint core rompe API envelope e OpenAPI/SDK workflow.

## Criterio di chiusura M4.0

M4.0 e chiusa quando esistono specifiche accettate per tutte le superfici core
elencate sopra e quando la milestone successiva puo implementare un primo blocco
core senza dover decidere architettura durante il codice.

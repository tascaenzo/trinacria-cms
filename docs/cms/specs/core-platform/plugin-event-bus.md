# Plugin event bus

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: funzionale
- Ultimo aggiornamento: `2026-05-20`

## Decisione

Trinacria CMS deve offrire un event bus opzionale per comunicazione intra-core e
inter-plugin.

Il kernel definisce il contratto CMS dell'event bus. L'implementazione deve
riusare le primitive eventi di Trinacria quando possibile.

Decisione chiusa: la prima implementazione e **in-process** e supporta `sync` e
`async`. `deferred` resta nel contratto come valore riservato per una futura
delivery persistente, ma non e obbligatorio nella prima milestone implementativa.

## Obiettivi

- ridurre dipendenze dirette tra plugin
- permettere notifiche e reazioni tra moduli
- supportare eventi core osservabili
- rendere espliciti eventi pubblici, privati e protetti
- mantenere la comunicazione opzionale per plugin semplici

## Tipi di evento

| Tipo        | Visibilita                      | Esempio                         |
| ----------- | ------------------------------- | ------------------------------- |
| `core`      | piattaforma                     | `core.plugin.loaded`            |
| `public`    | sottoscrivibile da plugin       | `commerce.order.created`        |
| `protected` | sottoscrivibile con capability  | `payments.transaction.captured` |
| `private`   | interno al plugin owner         | `commerce.inventory.recomputed` |
| `audit`     | operativo, append-only/loggable | `settings.secret.revealed`      |

## Contratto evento

Un evento deve dichiarare:

- `name`
- `ownerPluginId`
- `visibility`
- `version`
- `payloadSchema`
- `delivery`: sync, async o deferred
- `retries`
- `idempotencyKey` quando necessario
- `auditPolicy`

## Publish e subscribe

Regole:

1. Un plugin puo emettere solo eventi che possiede o che il core gli consente.
2. Un plugin puo sottoscrivere eventi `public`.
3. Un plugin puo sottoscrivere eventi `protected` solo con capability/policy.
4. Gli eventi `private` non sono parte del contratto pubblico.
5. Gli handler non devono bloccare il runtime plugin in modo non governato.
6. Errori handler devono produrre diagnostics senza rompere il producer, salvo
   eventi dichiarati come transazionali.

## Delivery

Semantica minima:

- `sync`: dentro il flusso chiamante, solo per hook controllati
- `async`: dispatch non bloccante
- `deferred`: persistito o programmato per elaborazione successiva

La prima implementazione deve partire da `sync`/`async` in-process. Persistenza,
code esterne e delivery `deferred` sono evoluzioni future.

## Audit events

Gli eventi con visibility `audit` vengono pubblicati sull'event bus e
materializzati nello storage audit centralizzato del `core-pack`.

Il kernel emette runtime events e puo pubblicare audit events, ma non possiede lo
storage audit generale della piattaforma.

## Out of scope

- message broker esterno obbligatorio
- garanzia exactly-once
- orchestrazione workflow complessa
- event sourcing globale della piattaforma

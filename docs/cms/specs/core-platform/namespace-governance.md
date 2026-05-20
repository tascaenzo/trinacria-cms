# Namespace governance e alias

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: funzionale
- Ultimo aggiornamento: `2026-05-20`

## Decisione

Il kernel governa namespace, alias e collisioni.

Un plugin non puo introdurre identificatori globali ambigui. Prima di essere
caricato, il manifest e le contribution devono passare una validazione di
namespace.

## Namespace governati

La governance copre:

- plugin ID
- capability
- permission
- entity
- Mongo collection namespace
- settings namespace
- event name
- admin route
- admin navigation item
- resource ID
- dashboard widget ID
- alias pubblici

## Regole base

1. Ogni identificatore globale deve avere un owner.
2. Ogni owner deve avere un namespace canonico.
3. Un plugin non puo registrare namespace reserved.
4. Un alias non puo sovrascrivere un alias gia attivo.
5. Le collisioni bloccanti impediscono il load del plugin.
6. Le collisioni non bloccanti producono warning operativo e richiedono fallback
   deterministico.

## Reserved namespace

Sono reserved:

- `core`
- `kernel`
- `system`
- `admin`
- `trinacria`
- `core-pack`

Il core puo aggiungere reserved namespace tramite configurazione di piattaforma.

## Alias

Un alias e un nome breve o user-facing che punta a un identificatore canonico.

Esempio:

```text
canonical: commerce.products
alias: products
```

Regole:

- il canonical ID e sempre la fonte di verita
- gli alias sono opzionali
- gli alias devono dichiarare owner e target
- se due plugin chiedono lo stesso alias, vince solo chi ha priorita esplicita o
  ownership preesistente
- in assenza di priorita, il plugin non viene caricato con quell'alias

## Collision policy

| Collisione                  | Esito consigliato |
| --------------------------- | ----------------- |
| stesso plugin ID            | errore bloccante  |
| stessa entity canonica      | errore bloccante  |
| stessa permission canonica  | errore bloccante  |
| stesso event pubblico       | errore bloccante  |
| stesso alias opzionale      | warning/fallback  |
| stessa label navigation     | non bloccante     |
| stessa route admin assoluta | errore bloccante  |

## Out of scope

- marketplace remoto
- risoluzione automatica complessa tra plugin terzi
- rename/migration automatica di namespace gia persistiti

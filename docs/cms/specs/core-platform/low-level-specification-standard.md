# Standard specifiche low-level M4.0

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: standard documentale
- Ultimo aggiornamento: `2026-05-20`

## Obiettivo

Ogni specifica M4.0 deve essere abbastanza dettagliata da guidare lo sviluppo
senza dover decidere architettura durante il codice.

Una specifica low-level deve descrivere contratti, API, DTO, storage, errori,
security, lifecycle e acceptance criteria.

## Struttura obbligatoria

Ogni documento deve avere queste sezioni:

1. Decisione
2. Responsabilita
3. Modello dati
4. Contratti TypeScript target
5. API HTTP target
6. DTO request/response
7. Storage Mongo
8. Security e permission
9. Eventi
10. Errori
11. Lifecycle
12. Compatibilita e versioning
13. Acceptance criteria
14. Out of scope
15. Gap rispetto al codice attuale

## Livello di dettaglio atteso

### Contratti TypeScript

Ogni interfaccia deve indicare:

- nome
- package owner
- campi richiesti
- campi opzionali
- default
- regole di validazione
- invarianti

### API HTTP

Ogni endpoint deve indicare:

- metodo
- path
- owner package
- auth richiesta
- permission richiesta
- request DTO
- response DTO
- errori
- note OpenAPI/SDK

### Storage Mongo

Ogni collection deve indicare:

- nome logico
- namespace fisico
- owner
- schema documento
- indici
- unique constraints
- retention se applicabile
- campi audit
- strategia migrazione/evoluzione

### Security

Ogni specifica deve dire:

- chi puo leggere
- chi puo scrivere
- chi puo fare reveal se ci sono secret
- quali permission/capability servono
- come viene auditata l'operazione
- cosa puo fare il backoffice e cosa non puo fare

### Eventi

Ogni evento deve indicare:

- nome canonico
- owner
- visibility
- payload schema
- delivery
- retry
- idempotency
- audit policy

## Regola di qualita

Una specifica e implementabile quando un developer puo aprirla e sapere:

- quali file/package creare o modificare
- quali DTO esporre
- quali collection usare
- quali indici creare
- quali permission verificare
- quali errori restituire
- quali test scrivere

Se una decisione resta aperta, deve comparire in una sezione `Open questions`.

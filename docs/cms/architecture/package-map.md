# Package map

## Stato

- Area: architettura repository
- Stato: `draft`
- Ultimo aggiornamento: `2026-05-21`

## Scopo

Questo documento spiega perche esistono i package sotto `packages/`, a cosa
servono e dove va collocata una nuova funzionalita.

La regola pragmatica e:

```text
kernel        -> contratti e runtime CMS
core-pack     -> funzionalita CMS baseline installabili come plugin
sdk           -> client TypeScript per API HTTP
admin-kernel  -> runtime applicativo del backoffice
trinacria-ui  -> componenti visuali riusabili del backoffice
```

## Mappa sintetica

| Package                 | Serve a                                    | Deve restare? | Motivo                                                  |
| ----------------------- | ------------------------------------------ | ------------- | ------------------------------------------------------- |
| `packages/kernel`       | runtime CMS, contratti plugin, Mongo core  | si            | e il centro infrastrutturale del CMS plugin-first       |
| `packages/core-pack`    | plugin ufficiale baseline                  | si            | contiene utenti, ruoli, permessi, auth, settings, setup |
| `packages/sdk`          | client API HTTP generato/stabile           | si            | separa frontend/consumer esterni dal codice backend     |
| `packages/admin-kernel` | applicazione backoffice condivisa          | si            | evita che `apps/backoffice` diventi il vero prodotto    |
| `packages/trinacria-ui` | design system e componenti React riusabili | si            | separa UI pura da routing, SDK, sessione e logica admin |

Conclusione: i package attuali servono tutti. La confusione non nasce dal
numero, ma dal fatto che `admin-kernel` e `trinacria-ui` sono vicini come area
funzionale e devono avere confini espliciti.

## Dependency direction

Direzione consentita:

```text
apps/playground
  -> kernel
  -> core-pack

apps/backoffice
  -> admin-kernel

core-pack
  -> kernel

admin-kernel
  -> sdk
  -> trinacria-ui

sdk
  -> nessun package CMS runtime

trinacria-ui
  -> nessun package CMS runtime
```

Direzione da evitare:

```text
kernel -> core-pack
kernel -> admin-kernel
kernel -> trinacria-ui
core-pack -> admin-kernel
core-pack -> trinacria-ui
trinacria-ui -> sdk
trinacria-ui -> admin-kernel
sdk -> admin-kernel
sdk -> core-pack runtime code
```

## Package per package

### `@trinacria-cms/kernel`

Responsabilita:

- manifest plugin
- runtime plugin
- lifecycle e state machine
- dependency graph
- namespace governance
- contribution catalog derivato dai manifest
- contratti security/authz
- contratti Mongo-first
- entity registry
- db adapter Mongo-first
- health, diagnostics, runtime events
- starter app CMS

Non deve contenere:

- utenti concreti
- ruoli concreti
- settings storage applicativo completo
- pagine admin
- componenti React
- domini editoriali, commerce, media, SEO

Regola decisionale:

Una cosa va nel kernel solo se serve a tutti i plugin e non rappresenta una
feature CMS installabile.

### `@trinacria-cms/core-pack`

Responsabilita:

- installation bootstrap
- auth
- utenti
- ruoli
- permessi
- policy rules
- API keys
- settings definitions/values/secrets
- security provisioning dai manifest plugin
- servizi baseline necessari a ogni installazione

Non deve contenere:

- domini verticali
- pagine custom di prodotto
- rendering admin generico
- componenti UI
- runtime plugin

Regola decisionale:

Una cosa va nel core-pack se e una funzionalita CMS baseline che puo essere
installata come plugin ufficiale minimo.

### `@trinacria-cms/sdk`

Responsabilita:

- client TypeScript per API HTTP
- tipi generati da OpenAPI
- runtime client senza dipendenze
- catalogo ufficiale delle API kernel/core-pack
- base stabile per backoffice e consumer esterni

Non deve contenere:

- logica backend
- repository
- componenti React
- stato applicativo backoffice
- conoscenza diretta di Mongo o runtime plugin

Regola decisionale:

Una cosa va nello SDK solo se serve a chiamare API HTTP o tipizzare risposte API.

### `@trinacria-cms/admin-kernel`

Responsabilita:

- shell applicativa backoffice
- route registry admin
- resource registry admin
- session bootstrap
- SDK initialization
- pagine ufficiali baseline
- wiring capability-aware
- moduli admin custom

Non deve contenere:

- componenti visuali puri e riusabili se non specifici del runtime admin
- logica backend
- contratti plugin backend
- repository o accesso Mongo

Regola decisionale:

Una cosa va in admin-kernel se riguarda il comportamento dell'app backoffice,
non il design system puro.

### `@trinacria-cms/trinacria-ui`

Responsabilita:

- token visuali
- theme CSS
- primitive React
- atoms/molecules/organisms riusabili
- shell component visuale
- Storybook e documentazione componenti

Non deve contenere:

- chiamate SDK
- sessione utente
- routing reale
- permission checks reali
- conoscenza dei plugin installati
- business logic admin

Regola decisionale:

Una cosa va in trinacria-ui se puo essere renderizzata e testata senza CMS
runtime, senza SDK e senza backend.

## App host

### `apps/playground`

Serve a far partire il backend locale con kernel e core-pack.

Deve restare sottile:

- bootstrap locale
- configurazione Mongo
- caricamento plugin per sviluppo
- esposizione OpenAPI

### `apps/backoffice`

Serve a montare `admin-kernel` in Vite.

Deve restare sottile:

- CSS host
- config API base
- moduli admin locali
- mount React

## Quando creare un nuovo package

Creare un nuovo package solo se almeno una di queste condizioni e vera:

- deve essere versionato o pubblicato separatamente
- ha dipendenze runtime molto diverse dagli altri package
- rappresenta un plugin installabile autonomo
- deve essere consumato da app esterne
- riduce un ciclo di dipendenze reale

Non creare un nuovo package solo per organizzare cartelle.

## Dove andranno i futuri plugin

I futuri plugin dominio non devono entrare in `core-pack`.

Esempi target:

```text
packages/editorial-pack
packages/media-pack
packages/commerce-pack
packages/seo-pack
```

Ogni plugin dominio dovrebbe dipendere da:

```text
@trinacria-cms/kernel
```

e solo se espone UI backoffice custom, puo avere un modulo admin collegato via
contratti admin.

## Decisione attuale

Non accorpare package ora.

Azioni consigliate:

1. mantenere i cinque package esistenti
2. rendere espliciti i confini nei README
3. evitare che `core-pack` assorba domini verticali
4. evitare che `trinacria-ui` importi SDK o logica CMS
5. usare `admin-kernel` come runtime backoffice e `apps/backoffice` come host
   sottile

Questa scelta mantiene il progetto modulare senza introdurre package inutili.

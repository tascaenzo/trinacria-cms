# CMS Architectural Principles and Plugin Contracts

> Status: proposta architetturale da discutere e approvare.
>
> Obiettivo: definire principi stabili per mantenere Trinacria CMS modulare, rigoroso, estendibile e coerente nel tempo.

## 1. Scopo

Questo documento raccoglie le regole architetturali di riferimento per kernel, plugin, API, SDK, backoffice e integrazioni interne.

Non introduce un nuovo framework parallelo. Formalizza e rende più coerenti meccanismi già presenti nel progetto, riducendo ambiguità, accoppiamento e possibilità di bypass delle regole applicative.

## 2. Principi fondamentali

### 2.1 Il kernel non contiene logica di dominio

Il kernel fornisce infrastruttura comune, lifecycle, dependency injection, contratti tecnici, request context, autenticazione, autorizzazione di base, validazione, eventi e integrazione dei plugin.

Il kernel non deve conoscere concetti specifici come articoli, asset, ordini, campagne o documenti.

### 2.2 Ogni plugin possiede il proprio dominio

Un plugin è responsabile di:

- controller e API del proprio dominio;
- servizi applicativi;
- invarianti e workflow;
- persistenza e repository;
- eventi di dominio o applicativi;
- contratti pubblici necessari alle integrazioni.

### 2.3 I controller sono adattatori HTTP

I controller devono:

- ricevere e validare la richiesta;
- costruire o ricevere il contesto dell'attore;
- invocare il servizio applicativo;
- tradurre risultati ed errori nel contratto HTTP.

Non devono contenere regole di dominio né accedere direttamente ai repository.

### 2.4 I servizi applicativi sono il confine operativo

Le operazioni applicative devono essere invocabili anche da ingressi diversi da HTTP senza perdere:

- controllo dei permessi;
- validazione;
- invarianti;
- isolamento tenant;
- eventi;
- gestione coerente degli errori.

Le operazioni sensibili devono ricevere un contesto esplicito dell'attore.

### 2.5 OpenAPI è il contratto pubblico delle API

Le API esposte dai plugin devono essere descritte in OpenAPI in modo completo e stabile.

OpenAPI è la fonte per:

- documentazione tecnica;
- generazione dell'SDK;
- verifica di compatibilità;
- integrazione dei client;
- test dei contratti pubblici.

### 2.6 L'SDK è generato, non duplicato manualmente

Il client ufficiale deve essere generato dalla documentazione OpenAPI.

Le modifiche alle API devono aggiornare contestualmente:

- snapshot OpenAPI;
- codice SDK generato;
- test di compatibilità;
- documentazione delle operazioni.

### 2.7 Le integrazioni tra plugin usano contratti pubblici

Un plugin non deve importare repository, servizi interni o path privati di un altro plugin.

Le integrazioni devono usare, secondo il caso:

- contratti o service pubblici per chiamate sincrone nello stesso processo;
- eventi per comunicazioni asincrone;
- API HTTP e SDK per client o processi esterni;
- riferimenti a entità per collegamenti tra domini.

Le dipendenze dirette tra plugin devono essere eccezionali, motivate e documentate.

### 2.8 Il backend non dipende dalla UI

I package backend non devono dipendere da React, `trinacria-ui`, `admin-kernel` o codice browser.

Le dipendenze di presentazione appartengono ai package amministrativi o frontend.

### 2.9 I dati persistenti non dipendono dai componenti React

I contenuti persistenti, inclusi eventuali blocchi editoriali, devono essere descritti da schemi di dominio stabili e versionabili.

I renderer React sono una rappresentazione, non il contratto persistente.

## 3. Responsabilità per livello

### Kernel

Responsabilità candidate:

- lifecycle e caricamento dei plugin;
- dependency injection;
- request e actor context;
- autenticazione e primitive di autorizzazione;
- contratti di validazione condivisi;
- eventi e osservabilità di base;
- supporto alla registrazione HTTP;
- contratti tecnici trasversali.

Non responsabilità:

- routing centralizzato di tutti gli use case;
- gateway globale delle operazioni;
- logica applicativa dei plugin;
- DTO specifici dei domini;
- componenti UI.

### Plugin backend

Responsabilità:

- controller;
- servizi applicativi;
- dominio e workflow;
- repository;
- autorizzazione applicativa delle operazioni sensibili;
- OpenAPI del proprio dominio;
- eventi e contratti pubblici.

### Plugin admin

Responsabilità:

- route amministrative;
- pagine e form;
- componenti specifici del dominio;
- uso dell'SDK;
- composizione dei componenti generici di `trinacria-ui`.

### Trinacria UI

Responsabilità:

- atomi, molecole e organismi generici;
- pattern visuali riutilizzabili;
- componenti per contenuti strutturati e blocchi;
- accessibilità, stati e comportamento visuale coerente.

Non deve conoscere plugin specifici né eseguire chiamate applicative.

## 4. Actor context

Il CMS dovrebbe convergere verso un contesto uniforme per le operazioni applicative.

Esempio concettuale:

```ts
type ActorContext = {
  actorId: string;
  tenantId?: string;
  roles?: string[];
  locale?: string;
  correlationId?: string;
  source?: string;
};
```

Il contratto effettivo deve riusare i tipi già presenti nel progetto e introdurre solo i campi realmente necessari.

Il contesto deve essere costruito dall'infrastruttura e propagato fino ai servizi applicativi senza ricostruzioni arbitrarie nei singoli plugin.

## 5. Autorizzazione

L'autorizzazione può essere verificata in modo preliminare a livello HTTP, ma le operazioni applicative sensibili devono garantire il controllo anche nel service o use case.

Principio:

```text
controllo nel controller = filtro iniziale
controllo applicativo = garanzia contro i bypass
```

Il repository non decide i permessi dell'utente.

## 6. Errori applicativi

I servizi applicativi dovrebbero usare un insieme limitato e coerente di errori indipendenti da HTTP.

Categorie candidate:

- validation;
- unauthorized;
- forbidden;
- not found;
- conflict;
- invariant violation;
- dependency unavailable.

I controller traducono questi errori in status code e response coerenti.

Gli error code pubblici devono essere stabili perché fanno parte del contratto SDK.

## 7. Convenzioni OpenAPI

Ogni operazione pubblica dovrebbe avere:

- `operationId` unico e stabile;
- tag coerente con il plugin o dominio;
- descrizione operativa chiara;
- schema completo di input e output;
- schema degli errori;
- requisiti di autenticazione;
- indicazione documentabile dei permessi richiesti, usando le estensioni già supportate o una convenzione minima condivisa.

Gli `operationId` non devono essere rinominati senza valutare l'impatto sullo SDK e sui client.

## 8. Riferimenti alle entità

Per collegare in modo uniforme risultati, audit, eventi, notifiche e interfacce, è utile un contratto minimale:

```ts
type EntityReference = {
  type: string;
  id: string;
};
```

Esempi di identificatori:

```text
editorial.entry
media.asset
core.user
report.document
```

Il riferimento non sostituisce il modello di dominio. Serve solo a identificare una risorsa in modo interoperabile.

## 9. Eventi applicativi

Gli eventi devono essere introdotti solo dove eliminano accoppiamento reale o supportano integrazioni asincrone.

Forma minima candidata:

```ts
type ApplicationEvent = {
  type: string;
  occurredAt: Date;
  actor?: ActorContext;
  entity?: EntityReference;
  payload?: unknown;
};
```

Gli eventi non devono sostituire chiamate sincrone quando il chiamante necessita immediatamente del risultato.

## 10. Versionamento e compatibilità

Sono contratti pubblici o persistenti da trattare con attenzione:

- endpoint e metodi HTTP;
- `operationId`;
- DTO pubblici;
- error code;
- tipi generati nell'SDK;
- contratti pubblici tra plugin;
- identificatori delle entità;
- eventi consumati da altri plugin;
- schemi persistenti dei contenuti e dei blocchi.

Le modifiche incompatibili devono essere esplicite e accompagnate da strategia di migrazione o versionamento.

## 11. Test architetturali

Le regole principali dovrebbero essere verificabili automaticamente.

Controlli candidati:

- il kernel non importa plugin di dominio;
- i package backend non importano `trinacria-ui`, React o `admin-kernel`;
- i plugin non importano path interni di altri plugin;
- i controller non accedono direttamente ai repository;
- gli endpoint pubblici hanno `operationId`;
- lo snapshot OpenAPI è aggiornato;
- il codice SDK generato è sincronizzato;
- gli errori pubblici rispettano il contratto comune.

Questi controlli possono essere introdotti progressivamente con lint, test statici o script di verifica del monorepo.

## 12. Regole per evitare overengineering

Non introdurre un'astrazione nuova quando un meccanismo esistente copre già il caso d'uso.

In particolare, evitare senza una necessità concreta:

- gateway globale nel kernel;
- capability framework parallelo a OpenAPI;
- command bus obbligatorio per ogni operazione CRUD;
- policy engine universale;
- registry duplicati;
- microfrontend senza requisiti di deploy indipendente;
- DSL complessi per la UI;
- eventi per ogni modifica interna;
- package eccessivamente granulari.

## 13. Ordine di consolidamento suggerito

### P0

- chiarire i confini tra controller, service e repository;
- garantire l'autorizzazione applicativa nelle operazioni sensibili;
- uniformare il contesto dell'attore;
- definire errori applicativi e traduzione HTTP;
- rendere complete e stabili le operazioni OpenAPI;
- mantenere sincronizzato l'SDK generato.

### P1

- formalizzare contratti pubblici tra plugin;
- introdurre `EntityReference` dove realmente utile;
- separare dipendenze backend e admin;
- aggiungere test architetturali;
- migliorare response e error envelope.

### P2

- introdurre eventi applicativi mirati;
- formalizzare compatibilità e migrazioni dei contratti persistenti;
- consolidare componenti strutturati in `trinacria-ui`;
- migliorare audit e osservabilità delle operazioni.

## 14. Criterio decisionale

Ogni nuova proposta architetturale dovrebbe rispondere a queste domande:

1. Riusa ciò che esiste già?
2. Mantiene il kernel indipendente dai domini?
3. Preserva l'autonomia dei plugin?
4. Riduce i bypass delle regole applicative?
5. Mantiene OpenAPI e SDK come contratto pubblico?
6. Evita dipendenze improprie tra backend e UI?
7. Introduce complessità proporzionata a un problema reale?
8. Può essere verificata con test o vincoli automatici?

## 15. Stato della proposta

Il documento non rappresenta ancora una decisione definitiva.

Dopo l'approvazione, i singoli principi possono essere trasformati in ADR, task implementativi e controlli automatici, mantenendo una migrazione incrementale e compatibile con l'impianto attuale del CMS.

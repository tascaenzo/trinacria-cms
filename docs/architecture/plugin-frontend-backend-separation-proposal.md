# Proposta: separazione frontend e backend dei plugin

> Stato: idea architetturale da valutare. Questo documento non rappresenta una decisione definitiva.

## Contesto

Attualmente diversi plugin CMS includono nello stesso package sia logica backend sia contributi per il backoffice. Questo rende naturale introdurre dipendenze verso `@trinacria-cms/trinacria-ui`, React, SDK e runtime amministrativo anche in package che contengono il dominio server.

La proposta consiste nel separare in modo più esplicito la parte backend dalla parte amministrativa di ogni plugin, mantenendo comunque tutto nello stesso monorepo e nella stessa applicazione backoffice.

L'obiettivo non è adottare subito microfrontend, ma ridurre l'accoppiamento tra dominio CMS e interfaccia amministrativa.

## Obiettivi

- permettere ai plugin backend di funzionare anche senza backoffice;
- evitare dipendenze React e UI nel codice server;
- rendere più chiari i confini architetturali;
- semplificare test, build e manutenzione;
- mantenere una singola SPA amministrativa;
- preparare una possibile evoluzione futura verso moduli caricati dinamicamente.

## Struttura proposta

```text
packages/
├── editorial-pack/
├── editorial-pack-admin/
├── media-pack/
├── media-pack-admin/
├── core-pack/
├── core-pack-admin/
├── admin-kernel/
├── trinacria-ui/
├── kernel/
└── sdk/
```

Per ogni dominio:

```text
@trinacria-cms/editorial-pack
@trinacria-cms/editorial-pack-admin
```

### Package backend

Responsabilità previste:

- dominio;
- servizi applicativi;
- repository e persistenza;
- controller e API HTTP;
- eventi di dominio;
- lifecycle del plugin;
- capability server;
- contratti pubblici necessari al runtime CMS.

Dipendenze ammesse, in linea generale:

```text
kernel
core contracts
storage contracts
other abstract capabilities
```

Dipendenze da evitare:

```text
React
React DOM
admin-kernel
trinacria-ui
component libraries
browser-only code
```

### Package amministrativo

Responsabilità previste:

- pagine React;
- route del backoffice;
- voci di navigazione;
- form;
- widget;
- integrazione SDK;
- contributi amministrativi;
- componenti specifici del dominio.

Dipendenze ammesse:

```text
admin-kernel
trinacria-ui
sdk
React
React DOM
```

## Relazione tra i package

```text
editorial-pack-admin
        ↓
SDK / API contracts
        ↓
editorial-pack
```

Il backend non deve importare il package amministrativo.

Il package amministrativo può consumare le API pubbliche del backend tramite SDK o contratti condivisi, ma non dovrebbe importarne direttamente repository o servizi interni.

## Regole architetturali candidate

1. I package `*-pack` non dipendono da React, `admin-kernel` o `trinacria-ui`.
2. I package `*-pack-admin` possono dipendere da `admin-kernel`, `trinacria-ui` e `sdk`.
3. `admin-kernel` non conosce direttamente i singoli plugin.
4. I plugin registrano route, navigation item, pagine e widget tramite contributi dichiarativi.
5. `trinacria-ui` non dipende da plugin di dominio.
6. Il backend resta utilizzabile in modalità headless.
7. La shell amministrativa rimane una sola applicazione distribuita insieme.

## Esempio di contributo amministrativo

```ts
export const editorialAdminContribution = defineAdminContribution({
  routes: [
    {
      path: "/editorial/entries",
      component: () => import("./pages/entries-page.js")
    }
  ],
  navigation: [
    {
      label: "Contenuti",
      route: "/editorial/entries"
    }
  ]
});
```

L'`admin-kernel` raccoglie i contributi e compone una singola applicazione React.

## Alternative

### Alternativa A: un solo package con entrypoint separati

```text
packages/editorial-pack/
├── src/server/
├── src/admin/
└── src/contracts/
```

```json
{
  "exports": {
    ".": "./dist/server/index.js",
    "./admin": "./dist/admin/index.js",
    "./contracts": "./dist/contracts/index.js"
  }
}
```

Vantaggi:

- migrazione più semplice;
- meno workspace;
- minore impatto iniziale.

Svantaggi:

- gli import errati restano possibili;
- le dipendenze UI rimangono nel package;
- i confini sono più facili da violare.

### Alternativa B: due package distinti

```text
@trinacria-cms/editorial-pack
@trinacria-cms/editorial-pack-admin
```

Vantaggi:

- confini verificabili dal package manager e da TypeScript;
- dipendenze server più pulite;
- build e test separabili;
- migliore supporto alla modalità headless.

Svantaggi:

- aumento del numero di workspace;
- maggiore complessità nella build orchestration;
- necessità di definire chiaramente i contratti condivisi.

## Perché non microfrontend, almeno inizialmente

La proposta non richiede:

- deploy indipendenti;
- Module Federation;
- import map remoti;
- runtime frontend separati;
- versioni React differenti;
- routing distribuito.

Il backoffice può rimanere una SPA modulare con lazy loading dei contributi dei plugin.

I microfrontend diventerebbero rilevanti solo in presenza di requisiti concreti come:

- release indipendenti dei plugin;
- team completamente autonomi;
- caricamento remoto a runtime;
- installazione dinamica senza rebuild della shell;
- tecnologie frontend differenti.

## Benefici attesi

- backend utilizzabile senza interfaccia amministrativa;
- dipendenze più piccole e coerenti;
- riduzione dell'accoppiamento tra dominio e presentazione;
- test server e frontend indipendenti;
- maggiore chiarezza nella ownership;
- migliore evoluzione futura verso plugin distribuiti;
- minore rischio che `trinacria-ui` diventi una dipendenza universale del CMS.

## Rischi e costi

- aumento del numero di package;
- maggiore complessità di build e typecheck;
- necessità di definire una API stabile per i contributi admin;
- possibile duplicazione di tipi tra SDK e frontend;
- migrazione graduale dei plugin esistenti;
- necessità di regole ESLint o dependency constraints.

## Strategia di valutazione

Prima di adottare il modello per tutti i plugin, si propone un esperimento su un solo dominio, preferibilmente `editorial-pack`.

### Esperimento suggerito

1. estrarre la cartella `admin` in `editorial-pack-admin`;
2. rimuovere dal backend le dipendenze da React e `trinacria-ui`;
3. mantenere invariati endpoint e contratti pubblici;
4. registrare il frontend tramite `admin-kernel`;
5. verificare build, typecheck, test e bundle;
6. misurare il costo reale della separazione.

## Criteri decisionali

La proposta può essere adottata se l'esperimento dimostra che:

- il backend compila senza dipendenze browser;
- la registrazione amministrativa resta semplice;
- non aumenta eccessivamente la duplicazione dei tipi;
- la build del monorepo rimane gestibile;
- i plugin risultano più facili da testare e comprendere;
- la modalità headless diventa realmente supportata.

## Decisione

Nessuna decisione presa al momento.

La proposta resta una opzione architetturale da confrontare con:

- package unico con entrypoint separati;
- package distinti backend/admin;
- mantenimento della struttura attuale con regole di import più rigide.

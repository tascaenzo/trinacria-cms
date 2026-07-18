# Riepilogo della discussione architetturale sul CMS

> Stato: documento di lavoro.
>
> Scopo: raccogliere in un unico punto le osservazioni, le ipotesi e le proposte emerse durante la revisione tecnica del branch `feat/editorial-pack-foundation`.

## 1. Obiettivo della revisione

L'obiettivo principale non è valutare la completezza funzionale dei singoli pack ancora in costruzione, ma capire quali miglioramenti strutturali servano affinché Trinacria CMS possa crescere come piattaforma modulare, estendibile e mantenibile.

In particolare, il `media-pack` è considerato ancora in costruzione. Le sue dipendenze attuali non vengono quindi trattate come un difetto definitivo del progetto, ma come un punto di integrazione da progettare con attenzione.

## 2. Valutazione generale

La foundation del CMS è stata giudicata positivamente.

Punti di forza principali:

- separazione esplicita tra framework Trinacria, kernel CMS, funzionalità baseline e pack di dominio;
- `core-pack` mantenuto focalizzato sulle funzionalità di piattaforma;
- `editorial-pack` trattato come dominio separato;
- composition root sottile;
- validazioni di dominio già presenti nei service;
- bootstrap prudente dei content type predefiniti;
- attenzione a hardening, osservabilità ed E2E.

Il rischio principale individuato non riguarda il singolo service, ma la crescita dell'accoppiamento tra workspace.

## 3. Focus strutturale per le prossime analisi

Le prossime revisioni dovrebbero concentrarsi su:

- confini tra `kernel`, `core-pack` e plugin;
- lifecycle e dipendenze dei plugin;
- contratti pubblici e compatibilità delle versioni;
- modello dei contenuti e versionamento degli schemi;
- workflow editoriali e transizioni;
- persistenza, concorrenza e consistenza;
- autorizzazioni e isolamento dei domini;
- eventi, audit log e revisioni;
- API pubbliche e SDK;
- architettura del backoffice;
- migrazioni e backward compatibility;
- testabilità, osservabilità e operatività.

## 4. Media Pack: interpretazione corretta della dipendenza

Poiché il `media-pack` è ancora in costruzione, non è prioritario giudicarne la completezza.

La domanda strutturale corretta è:

> L'Editorial Pack dipende da una capability astratta per gli asset oppure da una implementazione concreta del Media Pack?

Una possibile direzione futura è definire un contratto pubblico, per esempio:

```ts
interface MediaAssetProvider {
  getAsset(id: string): Promise<MediaAsset | null>;
  validateAssetReference(id: string): Promise<void>;
}
```

Il `media-pack` potrebbe implementare questa capability, mentre l'`editorial-pack` dipenderebbe soltanto dal contratto.

Benefici:

- sviluppo indipendente dei pack;
- test con adapter in-memory;
- possibilità di provider alternativi;
- minore accoppiamento diretto tra domini.

Questa resta una direzione da valutare, non una decisione già presa.

## 5. Dipendenza da Trinacria UI

È stato chiarito che l'uso condiviso di `trinacria-ui` non è di per sé un problema.

Un design system condiviso non implica automaticamente un frontend monolitico e non rende necessari i microfrontend.

Il vincolo diventa problematico quando un package che contiene logica backend dipende direttamente da:

- React;
- React DOM;
- `admin-kernel`;
- `trinacria-ui`;
- componenti browser-only.

Il backend dovrebbe poter funzionare senza backoffice, soprattutto in modalità headless.

## 6. Frontend modulare e microfrontend

La direzione suggerita per il breve periodo è una SPA amministrativa modulare.

Schema concettuale:

```text
admin-kernel
    ↓ carica contributi
core-pack admin
editorial-pack admin
media-pack admin
    ↓ usano
trinacria-ui
```

Ogni plugin può possedere:

- route;
- voci di navigazione;
- pagine;
- widget;
- form;
- integrazioni SDK.

L'`admin-kernel` compone tutti i contributi in una singola applicazione React.

Non sono necessari, per ora:

- deploy separati;
- Module Federation;
- import map remote;
- runtime frontend differenti;
- versioni React indipendenti;
- routing distribuito.

I microfrontend diventerebbero rilevanti soltanto in presenza di requisiti concreti come release indipendenti, caricamento remoto a runtime o installazione dinamica senza rebuild della shell.

## 7. Proposta di separazione frontend/backend per plugin

È stata proposta, come idea da valutare, la separazione tra package server e package amministrativo.

Esempio:

```text
@trinacria-cms/editorial-pack
@trinacria-cms/editorial-pack-admin
```

### Backend pack

Responsabilità:

- dominio;
- servizi applicativi;
- repository;
- controller HTTP;
- eventi;
- lifecycle;
- capability server;
- contratti pubblici del dominio.

Non dovrebbe dipendere da React o `trinacria-ui`.

### Admin pack

Responsabilità:

- pagine React;
- route;
- navigazione;
- form;
- widget;
- SDK;
- contributi amministrativi;
- componenti specifici del dominio.

Può dipendere da:

- `admin-kernel`;
- `trinacria-ui`;
- SDK;
- React e React DOM.

## 8. Alternative considerate

### Alternativa A: un unico package con entrypoint separati

```text
packages/editorial-pack/
├── src/server/
├── src/admin/
└── src/contracts/
```

Vantaggi:

- migrazione più semplice;
- meno workspace;
- minore impatto iniziale.

Svantaggi:

- confini più facili da violare;
- dipendenze UI ancora presenti nel package;
- import errati non impediti dal package manager.

### Alternativa B: package distinti

```text
@trinacria-cms/editorial-pack
@trinacria-cms/editorial-pack-admin
```

Vantaggi:

- confini verificabili;
- dipendenze backend più pulite;
- test e build indipendenti;
- migliore supporto headless.

Svantaggi:

- più workspace;
- build orchestration più complessa;
- necessità di contratti condivisi chiari.

### Alternativa C: mantenere la struttura attuale

La struttura corrente può essere mantenuta introducendo regole di import, lint e dependency constraints più severe.

Questa opzione ha il costo iniziale più basso, ma offre protezioni architetturali più deboli.

## 9. Esperimento suggerito

Prima di applicare una separazione a tutti i plugin, è stato suggerito un esperimento limitato a `editorial-pack`.

Passi proposti:

1. estrarre la parte `admin` in un workspace separato o in un entrypoint isolato;
2. rimuovere dal backend le dipendenze UI e browser;
3. mantenere invariati endpoint e contratti pubblici;
4. registrare il frontend tramite `admin-kernel`;
5. verificare build, typecheck, lint e test;
6. misurare impatto su bundle, manutenzione e developer experience.

La proposta dovrebbe essere adottata soltanto se l'esperimento dimostra un beneficio concreto.

## 10. Miglioramenti strutturali prioritari del CMS

### P0 — stabilità della foundation

- indici database univoci e gestione tipizzata dei conflitti;
- test delle invarianti principali;
- strategia per modifiche distruttive degli schemi;
- isolamento per namespace, ownership o tenant;
- contratti pubblici per comunicazione cross-pack;
- validazione delle entry rispetto a una versione precisa dello schema.

### P1 — crescita del dominio

- separazione tra responsabilità backend e admin;
- task graph del monorepo;
- build caching e task affected-only;
- lint reale per ogni workspace;
- versionamento dei preset;
- domain event per content type ed entry;
- optimistic concurrency.

### P2 — maturità della piattaforma

- capability negotiation tra plugin;
- migrazioni e rollback;
- audit log editoriale;
- revisioni e versionamento dei contenuti;
- scheduling, preview e publication pipeline;
- diagnostica e simulazione dei workflow.

## 11. Problemi specifici già individuati

### Concorrenza sulla chiave dei content type

Il controllo applicativo `findByKey` seguito da `create` non è sufficiente in caso di richieste concorrenti.

Serve anche:

- indice MongoDB univoco;
- traduzione degli errori duplicate key;
- errore di conflitto tipizzato.

### Modifiche distruttive degli schemi

Devono essere gestiti casi come:

- eliminazione di campi popolati;
- modifica del tipo;
- cambio cardinalità;
- rimozione di stati usati;
- cambio workflow su entry esistenti.

Possibile API futura:

```ts
type ContentTypeChangePlan = {
  compatible: boolean;
  warnings: ChangeWarning[];
  requiredMigrations: MigrationStep[];
};
```

Con operazioni:

- `validate`;
- `dry-run`;
- `apply`;
- eventualmente `rollback`.

### Workflow

La validazione attuale copre la struttura, ma in futuro può distinguere:

- errori strutturali;
- warning semantici;
- policy editoriali configurabili.

Esempi di warning:

- stati irraggiungibili;
- workflow bloccati;
- assenza di percorsi di recupero;
- transizioni senza policy autorizzativa.

### Preset di sistema

I preset dovrebbero evolvere con:

- versione;
- provenance;
- storico delle migrazioni;
- distinzione tra campi originali e modificati dall'utente;
- audit degli aggiornamenti automatici.

## 12. Guardrail architetturali candidati

1. I domain pack dipendono soltanto dalla API pubblica del kernel e da capability dichiarate.
2. Le dipendenze dirette tra domain pack devono essere eccezionali e documentate.
3. La comunicazione cross-pack preferisce capability, port, command o event.
4. Il codice admin non deve introdurre dipendenze UI negli entrypoint backend.
5. Gli export pubblici devono essere intenzionali e limitati.
6. Le invarianti del database completano, ma non sostituiscono, la validazione del dominio.
7. Le modifiche ai content model devono essere analizzate rispetto ai dati esistenti.
8. `trinacria-ui` non dipende dai plugin di dominio.
9. `admin-kernel` non contiene conoscenza hardcoded dei singoli plugin.
10. Il backoffice rimane sostituibile e il backend rimane headless-capable.

## 13. Decisioni e non-decisioni

### Decisioni operative già prese

- mantenere le analisi tecniche come documentazione Markdown nel repository;
- concentrare la revisione sui miglioramenti strutturali del CMS;
- considerare il `media-pack` come componente ancora in costruzione;
- non introdurre microfrontend senza un requisito concreto.

### Proposte ancora da valutare

- separare ogni plugin in package backend e package admin;
- introdurre capability astratte per integrazioni cross-pack;
- adottare un task graph come Turborepo, Nx o soluzione interna;
- introdurre un sistema formale di migrazione degli schemi;
- applicare dependency constraints automatici.

## 14. Metodo per le prossime revisioni

Per ogni feature branch significativa, la revisione dovrebbe coprire:

1. scopo e comportamento previsto;
2. confini architetturali;
3. invarianti di dominio;
4. persistenza e concorrenza;
5. sicurezza e autorizzazione;
6. compatibilità e migrazioni;
7. test e prontezza operativa;
8. raccomandazioni ordinate per priorità.

Le conclusioni dovrebbero essere aggiornate man mano che le proposte vengono validate o scartate.

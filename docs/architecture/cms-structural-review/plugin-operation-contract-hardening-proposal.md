# Proposta: consolidamento dei contratti operativi dei plugin

> Stato: proposta architetturale da valutare. Non rappresenta una decisione definitiva.

## Obiettivo

Rendere Trinacria CMS più rigoroso, estendibile e prevedibile nell'integrazione tra plugin, riutilizzando l'impianto già presente:

- controller di proprietà dei plugin;
- schemi e validazione già disponibili;
- documentazione OpenAPI;
- SDK generato;
- sistema di autenticazione e permessi;
- lifecycle e dependency injection del kernel.

La proposta non introduce un gateway centrale per tutti i casi d'uso e non sostituisce i controller dei plugin. Mira invece a rendere uniforme il percorso tra API pubblica, servizi applicativi e integrazioni interne.

## Principi

1. I plugin mantengono la proprietà dei propri controller e dei propri use case.
2. OpenAPI resta il catalogo delle operazioni pubbliche del CMS.
3. L'SDK generato resta il client standard per backoffice e integrazioni esterne.
4. Il kernel fornisce infrastruttura comune, ma non conosce la logica dei singoli domini.
5. Le regole di dominio non devono risiedere nei controller.
6. Le operazioni sensibili devono essere autorizzate anche nel livello applicativo.
7. Le integrazioni tra plugin devono usare contratti pubblici e stabili, non implementazioni interne.
8. Le nuove astrazioni vanno introdotte solo dove eliminano duplicazioni o bypass reali.

## Architettura di riferimento

### Percorso pubblico

```text
client / backoffice / integrazione esterna
        ↓
SDK generato da OpenAPI
        ↓
controller del plugin
        ↓
service applicativo o use case
        ↓
repository / eventi / contratti di altri plugin
```

### Percorso interno tra plugin

```text
plugin chiamante
        ↓
contratto pubblico del plugin destinatario
        ↓
service applicativo o use case
        ↓
repository / eventi
```

Non è consigliato usare richieste HTTP interne nello stesso processo quando è disponibile un contratto applicativo pubblico.

## Ruolo del kernel

Il kernel dovrebbe continuare a fornire soltanto primitive condivise:

- lifecycle dei plugin;
- dependency injection;
- registrazione dei controller;
- request context;
- actor context;
- autenticazione;
- contratti di autorizzazione;
- schemi e validazione;
- errori runtime tipizzati;
- eventi e comunicazione sicura tra plugin;
- strumenti di osservabilità e correlazione.

Il kernel non dovrebbe:

- instradare ogni operazione di dominio tramite un gateway globale;
- conoscere le operazioni editoriali, media, commerce o di altri domini;
- duplicare il routing dei controller;
- trasformarsi in un application service generale.

## Controller dei plugin

I controller restano di proprietà dei plugin e devono essere sottili.

Responsabilità previste:

- tradurre HTTP in input applicativo;
- recuperare actor, tenant e request context;
- applicare validazione e parsing con gli strumenti esistenti;
- delegare a un service o use case;
- tradurre errori applicativi in status HTTP;
- produrre response coerenti con OpenAPI.

Responsabilità da evitare:

- regole di dominio;
- accesso diretto ai repository quando esiste un service;
- orchestrazioni complesse;
- decisioni di autorizzazione replicate in modo diverso per ogni endpoint;
- comunicazioni dirette con implementazioni interne di altri plugin.

## Service applicativi e use case

Il livello applicativo deve diventare il confine riutilizzabile delle operazioni di dominio.

Un service o use case sensibile dovrebbe ricevere un contesto esplicito:

```ts
interface OperationContext {
  actor: ActorContext;
  tenantId?: string;
  correlationId?: string;
  source?: "http" | "internal" | "job" | "cli";
}
```

Esempio concettuale:

```ts
class PublishEditorialEntry {
  async execute(input: PublishEntryInput, context: OperationContext) {
    await this.authorization.require(
      context.actor,
      "editorial.entries.publish"
    );

    return this.entriesService.publish(input, context);
  }
}
```

Non è necessario creare una classe command per ogni CRUD. L'estrazione di un use case dedicato è consigliata quando l'operazione:

- ha effetti sensibili;
- coordina più servizi;
- modifica workflow o stato pubblico;
- deve essere invocata da più ingressi;
- richiede autorizzazioni o audit specifici.

## Autorizzazione

La proposta distingue due controlli.

### Controllo preliminare nel controller

Utile per:

- rifiutare rapidamente richieste non autorizzate;
- produrre errori HTTP coerenti;
- evitare elaborazioni inutili.

### Controllo autorevole nel livello applicativo

Necessario per impedire bypass quando lo stesso use case viene invocato da:

- controller differenti;
- job;
- eventi;
- plugin interni;
- strumenti amministrativi;
- script o CLI.

Regola proposta:

> Le operazioni sensibili non devono dipendere esclusivamente dall'autorizzazione del controller.

L'autorizzazione va espressa tramite i contratti già presenti nel CMS, senza introdurre un secondo sistema di permessi.

## OpenAPI come contratto pubblico

OpenAPI deve rimanere la fonte pubblica delle operazioni HTTP e dell'SDK.

Miglioramenti consigliati:

- `operationId` stabile e univoco per ogni endpoint pubblico;
- descrizioni operative precise;
- schemi di input e output completi;
- errori documentati in modo uniforme;
- tag coerenti per plugin e dominio;
- indicazione consistente dei requisiti di sicurezza;
- response envelope uniforme dove già previsto dall'architettura.

Esempi di descrizioni da preferire:

```text
Creates an editorial entry in draft state.
This operation does not publish the entry.
```

invece di:

```text
Create entry.
```

## SDK generato

L'SDK continua a essere prodotto dalla documentazione OpenAPI e deve essere considerato parte del contratto pubblico.

Guardrail consigliati:

- verifica automatica che il codice generato sia aggiornato;
- test dei metodi generati più critici;
- stabilità degli `operationId`;
- nessuna dipendenza dell'SDK da implementazioni server interne;
- gestione uniforme degli errori e dell'autenticazione;
- possibilità di identificare il plugin o tag di appartenenza di ogni operazione.

## Contratti pubblici tra plugin

Quando un plugin deve usare un altro plugin nello stesso runtime, dovrebbe dipendere da un contratto pubblico ristretto.

Esempio:

```ts
interface MediaAssetReader {
  findAsset(id: string, context: OperationContext): Promise<MediaAsset | null>;
}
```

Il contratto deve:

- rappresentare un bisogno del chiamante;
- evitare l'esposizione di repository o classi interne;
- mantenere invarianti e autorizzazioni pertinenti;
- essere registrato tramite dependency injection;
- documentare se la dipendenza è obbligatoria o opzionale.

Gli import diretti tra domini devono rimanere eccezioni motivate.

## Errori applicativi

I plugin dovrebbero restituire errori applicativi tipizzati e indipendenti da HTTP.

Esempi:

- `ValidationError`;
- `PermissionDeniedError`;
- `ConflictError`;
- `NotFoundError`;
- `WorkflowTransitionError`;
- `DependencyUnavailableError`.

Il controller si occupa della traduzione HTTP. In questo modo gli stessi use case possono essere riutilizzati da ingressi non HTTP.

## Risultati applicativi

Non è necessario introdurre un nuovo formato universale per ogni metodo interno. È però utile che le operazioni pubbliche restituiscano risultati prevedibili.

Caratteristiche consigliate:

- identificatori e tipo delle entità create o modificate;
- stato finale dell'operazione;
- warning separati dagli errori;
- riferimenti alle risorse coinvolte;
- correlation ID quando disponibile.

Queste informazioni migliorano:

- backoffice;
- integrazioni;
- audit;
- automazioni;
- debugging.

## Gap da verificare nel codice esistente

Prima dell'implementazione serve una verifica puntuale su:

- dove vengono eseguiti oggi i controlli di autorizzazione;
- quali service possono essere invocati senza actor context;
- quali controller accedono direttamente ai repository;
- quali plugin importano implementazioni interne di altri plugin;
- copertura e stabilità degli `operationId` OpenAPI;
- uniformità delle response e degli errori;
- disponibilità runtime degli schemi esistenti;
- completezza del request e actor context;
- audit e correlation ID sulle operazioni sensibili;
- presenza di operazioni interne che bypassano le stesse regole degli endpoint pubblici.

## Modifiche candidate

### P0 — definire e applicare i confini

- [ ] Documentare le responsabilità di controller, service, repository e kernel.
- [ ] Identificare le operazioni sensibili che richiedono autorizzazione applicativa.
- [ ] Definire un `OperationContext` minimo riutilizzando i tipi esistenti.
- [ ] Impedire ai controller di contenere regole di dominio rilevanti.
- [ ] Impedire l'accesso diretto ai repository da ingressi alternativi.
- [ ] Stabilizzare gli `operationId` OpenAPI pubblici.

### P1 — rendere coerenti le integrazioni

- [ ] Definire contratti pubblici per le integrazioni plugin-to-plugin già esistenti.
- [ ] Ridurre gli import diretti di implementazioni tra domain pack.
- [ ] Uniformare gli errori applicativi e la loro traduzione HTTP.
- [ ] Verificare che l'SDK copra tutte le operazioni pubbliche necessarie.
- [ ] Aggiungere test che confrontino OpenAPI e SDK generato.
- [ ] Aggiungere test per i bypass di autorizzazione più critici.

### P2 — rifiniture operative

- [ ] Migliorare correlation ID e audit delle operazioni sensibili.
- [ ] Rendere più uniformi i risultati delle mutazioni pubbliche.
- [ ] Documentare dipendenze obbligatorie e opzionali dei plugin.
- [ ] Introdurre dependency constraints automatici solo se i confini continuano a essere violati.
- [ ] Valutare command/use case dedicati per orchestrazioni complesse.

## Cosa non introdurre in questa fase

Per mantenere semplice l'architettura, questa proposta non richiede:

- gateway operativo globale nel kernel;
- command bus obbligatorio per tutte le operazioni;
- registry parallelo agli endpoint OpenAPI;
- nuova libreria di schema o validazione;
- nuovo sistema di permessi;
- service mesh interna;
- chiamate HTTP obbligatorie tra plugin nello stesso processo;
- astrazioni di rollback o workflow distribuito generiche.

## Criteri di successo

La proposta può considerarsi efficace se:

- i controller restano piccoli e prevedibili;
- le regole di dominio sono riutilizzabili fuori da HTTP;
- nessuna operazione sensibile può bypassare i permessi;
- OpenAPI e SDK rappresentano fedelmente l'API pubblica;
- i plugin collaborano tramite contratti intenzionali;
- il kernel rimane indipendente dai domini;
- aggiungere un nuovo plugin non richiede modifiche al kernel;
- la struttura resta comprensibile senza introdurre livelli superflui.

## Decisione proposta

Mantenere l'architettura corrente basata su controller modulari nei plugin e rafforzare il livello applicativo come confine comune per dominio, autorizzazione e integrazione.

Non introdurre un gateway centrale nel kernel.

Il kernel deve offrire primitive condivise; i plugin devono possedere API, use case e contratti pubblici del proprio dominio.
# Proposta: componenti riutilizzabili per contenuti a blocchi e risultati strutturati

> Stato: proposta architetturale da valutare. Il documento definisce un possibile ampliamento di `@trinacria-cms/trinacria-ui` senza introdurre dipendenze dai plugin di dominio.

## Contesto

`trinacria-ui` contiene già atomi, molecole e componenti riutilizzabili. L'evoluzione dell'Editorial Pack verso contenuti a blocchi e la necessità di rappresentare risultati strutturati, entità, report, documenti e azioni nel backoffice rendono utile consolidare un insieme comune di componenti visuali.

L'obiettivo non è trasformare `trinacria-ui` in un motore applicativo o in un package consapevole dei singoli domini. La libreria deve fornire componenti generici, guidati da proprietà, componibili e indipendenti da API, permessi e servizi.

## Obiettivi

- evitare duplicazione tra editor, backoffice, dashboard, report e viste conversazionali;
- offrire un linguaggio visuale coerente per contenuti strutturati;
- riutilizzare gli atomi e le molecole già presenti nella libreria;
- supportare sia rendering in sola lettura sia composizione editoriale;
- mantenere i componenti indipendenti dai plugin;
- consentire ai package di dominio di comporre componenti specifici senza duplicare strutture di base;
- introdurre l'infrastruttura in modo incrementale, senza costruire un framework eccessivamente generico.

## Principi

1. `trinacria-ui` contiene presentazione e interazione locale, non logica applicativa.
2. I componenti non effettuano chiamate HTTP e non conoscono SDK, permessi o servizi.
3. I componenti non importano package di dominio.
4. I dati persistiti non devono contenere nomi di componenti React.
5. I componenti specifici di dominio restano nei rispettivi package amministrativi.
6. Le API dei componenti devono essere semplici, tipizzate e guidate da proprietà.
7. Ogni nuova astrazione deve dimostrare almeno due casi d'uso reali prima di essere generalizzata.

## Confine delle responsabilità

```text
trinacria-ui
├── atomi e molecole
├── componenti visuali generici
├── layout per blocchi
├── card e pannelli strutturati
├── shell per editor
└── fallback visuali

admin-kernel
├── composizione dell'applicazione
├── eventuali registry applicativi
└── caricamento dei contributi dei plugin

plugin admin
├── componenti specifici del dominio
├── mapping tra dati di dominio e componenti UI
├── integrazione SDK
└── regole applicative e permessi
```

## Organizzazione candidata

La struttura deve adattarsi all'organizzazione reale della libreria. Una possibile estensione è:

```text
src/
├── atoms/
├── molecules/
├── organisms/
├── blocks/
│   ├── layout/
│   ├── content/
│   ├── data/
│   ├── entity/
│   ├── feedback/
│   └── forms/
├── editor/
└── patterns/
```

Non è necessario creare tutte le directory subito. La struttura può emergere progressivamente in base ai componenti effettivamente introdotti.

# Catalogo dei componenti proposti

## 1. Layout e composizione dei blocchi

### `BlockStack`

Dispone una sequenza verticale di blocchi con spaziatura coerente.

Responsabilità:

- spacing verticale;
- gestione di separatori opzionali;
- supporto a stati selezionati o disabilitati quando usato in un editor;
- nessuna conoscenza del tipo di blocco contenuto.

Esempio:

```tsx
<BlockStack gap="medium">
  {children}
</BlockStack>
```

### `BlockGrid`

Layout responsive per blocchi affiancati, metriche, card o risultati.

Responsabilità:

- numero di colonne responsivo;
- gap uniforme;
- comportamento coerente su viewport ridotti;
- nessuna logica di ordinamento dei dati.

### `BlockGroup`

Raggruppa blocchi correlati sotto titolo, descrizione e azioni opzionali.

Casi d'uso:

- sezione di un report;
- gruppo di campi editoriali;
- raccolta di risultati;
- area di anteprima.

### `BlockDivider`

Separatore semantico tra gruppi di contenuto, costruito sulle primitive già presenti.

## 2. Contenuto testuale e documentale

### `HeadingBlock`

Visualizza un titolo strutturato.

Proprietà candidate:

```ts
type HeadingBlockProps = {
  level?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  anchorId?: string;
};
```

Il componente non deve sostituire la tipografia di base, ma applicare una convenzione coerente ai contenuti composti.

### `TextBlock`

Contenitore per testo semplice o rich text già sanitizzato dal consumer.

Responsabilità:

- larghezza e ritmo tipografico;
- stato vuoto opzionale;
- varianti compatte e di lettura;
- nessuna sanitizzazione applicativa interna, salvo utility esplicitamente già presenti nella libreria.

### `QuoteBlock`

Molecola per citazioni con autore e fonte opzionali.

### `CalloutBlock`

Pannello per note, informazioni, avvisi o suggerimenti.

Proprietà candidate:

```ts
type CalloutBlockProps = {
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  title?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
};
```

### `CodeBlock`

Visualizzazione di codice o testo preformattato, con eventuale azione di copia se già coerente con le utility della libreria.

### `DocumentSection`

Componente di composizione per documenti e report, con titolo, contenuto, note e footer opzionali.

## 3. Media

### `ImageBlock`

Presenta immagine, didascalia, testo alternativo e stato di caricamento.

Non deve conoscere il Media Pack. Riceve una sorgente già risolta o un elemento renderizzabile.

```ts
type ImageBlockProps = {
  src: string;
  alt: string;
  caption?: React.ReactNode;
  aspectRatio?: string;
  fit?: "cover" | "contain";
};
```

### `MediaPlaceholder`

Fallback per asset mancanti, non disponibili o non supportati.

### `MediaGallery`

Griglia o sequenza di media generici. L'integrazione con selezione, upload e permessi resta fuori dalla libreria.

## 4. Dati strutturati

### `KeyValueList`

Visualizza metadati e proprietà in modo coerente.

```ts
type KeyValueItem = {
  label: React.ReactNode;
  value: React.ReactNode;
};
```

Casi d'uso:

- dettagli di un'entità;
- riepilogo di una operazione;
- metadati editoriali;
- informazioni su report e documenti.

### `DataTable`

Tabella generica per dati strutturati, basata sui componenti tabellari eventualmente già presenti.

Deve supportare inizialmente solo:

- colonne dichiarative;
- righe;
- stato vuoto;
- stato di caricamento;
- azioni di riga opzionali.

Ordinamento remoto, filtri complessi, virtualizzazione e paginazione avanzata non devono essere inclusi nella prima iterazione se non già disponibili.

### `MetricCard`

Card per valore principale, etichetta, variazione e dettaglio opzionale.

Casi d'uso:

- dashboard;
- report;
- risultati di elaborazioni;
- riepiloghi quantitativi.

### `ProgressSummary`

Visualizza avanzamento, conteggio completato e stato complessivo.

### `Timeline`

Sequenza di eventi o stati con data, titolo, descrizione e indicatore di stato.

Utile per audit, revisioni, workflow e cronologie, restando completamente generico.

## 5. Entità e risultati

### `EntityCard`

Card generica per rappresentare una risorsa del CMS senza conoscere il suo dominio.

Proprietà candidate:

```ts
type EntityCardProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  status?: React.ReactNode;
  media?: React.ReactNode;
  metadata?: KeyValueItem[];
  actions?: React.ReactNode;
  href?: string;
};
```

Esempi di composizione esterna:

- un articolo editoriale;
- un asset;
- un documento;
- un report;
- un utente;
- una configurazione.

Il mapping da entità di dominio a `EntityCardProps` appartiene al plugin amministrativo.

### `EntityList`

Lista di `EntityCard` o righe compatte con stato vuoto, loading e azioni.

### `ResultCard`

Rappresenta l'esito di una operazione o elaborazione.

Proprietà:

- titolo;
- stato;
- messaggio;
- dettagli;
- warning;
- azioni;
- entità correlate.

### `ActionCard`

Presenta un'azione proposta o disponibile con descrizione, conseguenze e controlli.

Non esegue direttamente operazioni applicative. Espone callback fornite dal consumer.

### `ApprovalCard`

Variante per richieste che necessitano conferma o revisione.

Proprietà candidate:

- titolo;
- riepilogo;
- impatto;
- elementi coinvolti;
- azione primaria;
- azione secondaria;
- stato di approvazione.

Il componente non verifica permessi e non conosce workflow applicativi.

### `DiffCard`

Componente generico per mostrare differenze tra due versioni.

Prima iterazione consigliata:

- righe aggiunte, rimosse e modificate;
- valori precedente e successivo;
- layout a lista o coppie chiave-valore.

Un editor rich text completo o un diff semantico avanzato non rientrano nella prima versione.

## 6. Feedback e stati

### `LoadingBlock`

Placeholder coerente per contenuti strutturati in caricamento.

### `EmptyBlock`

Stato vuoto per blocchi, liste e risultati.

### `ErrorBlock`

Errore contestuale con messaggio, dettaglio opzionale e azione di retry fornita dal consumer.

### `UnknownBlock`

Fallback quando un tipo di contenuto non può essere rappresentato.

Deve evitare crash dell'intera vista e mostrare informazioni diagnostiche minime in modalità sviluppo.

### `WarningSummary`

Raggruppa warning non bloccanti relativi a una operazione, un contenuto o un report.

## 7. Form e raccolta dati

### `FieldGroup`

Raggruppa controlli esistenti della libreria con titolo, descrizione e stato di errore.

### `DynamicFieldShell`

Shell visuale generica per un campo prodotto da uno schema o da una configurazione esterna.

Non deve contenere un motore completo di generazione form nella prima versione.

### `FormSummary`

Riepilogo dei dati che verranno inviati, utile prima di conferme o operazioni importanti.

### `ValidationSummary`

Presenta errori e warning prodotti dal sistema di validazione esistente.

## 8. Shell per editor a blocchi

### `BlockEditorShell`

Contenitore visuale dell'editor a blocchi.

Responsabilità:

- layout generale;
- toolbar slot;
- area contenuto;
- stato vuoto;
- stato disabilitato;
- eventuale area di anteprima.

Non deve implementare da solo il modello editoriale o la persistenza.

### `EditableBlockFrame`

Cornice visuale per un blocco selezionabile e modificabile.

Proprietà candidate:

```ts
type EditableBlockFrameProps = {
  selected?: boolean;
  disabled?: boolean;
  label?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
};
```

### `BlockToolbar`

Toolbar generica con slot per azioni quali sposta, duplica, elimina e configura.

Le azioni sono callback esterne; la libreria non modifica direttamente il documento.

### `BlockPicker`

Interfaccia generica per scegliere un tipo di blocco da una lista dichiarativa.

```ts
type BlockPickerItem = {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
};
```

Il catalogo reale dei blocchi viene fornito dal consumer.

### `BlockInsertionPoint`

Controllo visuale per inserire un blocco tra due elementi.

### `BlockPreview`

Contenitore per la resa non editabile di uno o più blocchi.

### `BlockOutline`

Vista compatta della struttura del documento. Da considerare solo dopo che l'editor base è stabile.

# Componenti che devono restare fuori da `trinacria-ui`

Esempi:

```text
EditorialEntryCard
EditorialWorkflowCard
PublishEntryApproval
MediaAssetPicker
ReportExportAction
AiExecutionPlan
AiConversationMessage
```

Questi componenti includono semantica di dominio, integrazione con SDK, permessi o workflow.

Devono essere costruiti nei rispettivi package amministrativi componendo i componenti generici della libreria.

Esempio:

```tsx
function EditorialEntryCard({ entry, onOpen, onReview }) {
  return (
    <EntityCard
      title={entry.title}
      subtitle={entry.contentTypeName}
      status={<StatusBadge>{entry.status}</StatusBadge>}
      metadata={[
        { label: "Locale", value: entry.locale },
        { label: "Updated", value: entry.updatedAt }
      ]}
      actions={/* azioni editoriali */}
    />
  );
}
```

# Rapporto con il modello persistente dei contenuti

I componenti UI non devono definire il formato persistente dell'Editorial Pack.

Il flusso corretto è:

```text
schema del blocco editoriale
        ↓
validazione e persistenza del dominio
        ↓
mapping del plugin admin
        ↓
componente trinacria-ui
```

Non deve essere salvato:

```json
{
  "component": "TextBlockView"
}
```

È preferibile un tipo di dominio stabile:

```json
{
  "type": "paragraph",
  "version": 1,
  "data": {
    "text": "Contenuto"
  }
}
```

Il plugin amministrativo associa `paragraph` al componente visuale appropriato.

# API condivisa per rendering a blocchi

Una prima iterazione può evitare un registry globale e limitarsi a componenti di composizione.

Quando almeno due consumer avranno bisogno di rendering dinamico, si può valutare un contratto minimo:

```ts
export type RenderableBlock<T = unknown> = {
  id?: string;
  type: string;
  data: T;
};

export type BlockRenderer<T = unknown> = React.ComponentType<{
  block: RenderableBlock<T>;
}>;
```

Un eventuale registry applicativo dovrebbe vivere nell'`admin-kernel` o nel consumer, mentre `trinacria-ui` può fornire il componente renderer e il fallback.

Questa astrazione non deve essere introdotta prima che esista un caso d'uso concreto condiviso.

# Accessibilità

Ogni componente deve rispettare le convenzioni di accessibilità già adottate dalla libreria.

In particolare:

- struttura semantica per titoli, liste e tabelle;
- navigazione da tastiera per editor e toolbar;
- focus visibile;
- etichette accessibili per azioni icon-only;
- annunci appropriati per errori, caricamenti e aggiornamenti dinamici;
- nessuna interazione disponibile esclusivamente tramite drag and drop;
- alternativa tramite pulsanti per spostamento dei blocchi.

# Storybook e documentazione

Ogni componente dovrebbe avere esempi isolati per:

- stato standard;
- stato vuoto;
- loading;
- errore;
- contenuto lungo;
- viewport ridotta;
- azioni disabilitate;
- tema chiaro e scuro, quando supportati.

Per i componenti editor devono essere inclusi esempi di navigazione da tastiera e selezione.

# Strategia di implementazione

## P0 — componenti immediatamente riutilizzabili

- [ ] `BlockStack`
- [ ] `BlockGrid`
- [ ] `CalloutBlock`
- [ ] `KeyValueList`
- [ ] `EntityCard`
- [ ] `ResultCard`
- [ ] `LoadingBlock`
- [ ] `EmptyBlock`
- [ ] `ErrorBlock`
- [ ] `UnknownBlock`

Questi componenti possono supportare rapidamente più aree del backoffice senza introdurre un motore editoriale.

## P1 — contenuti strutturati e report

- [ ] `HeadingBlock`
- [ ] `TextBlock`
- [ ] `ImageBlock`
- [ ] `DataTable`
- [ ] `MetricCard`
- [ ] `Timeline`
- [ ] `ActionCard`
- [ ] `ApprovalCard`
- [ ] `DiffCard`
- [ ] `ValidationSummary`

## P2 — editor a blocchi

- [ ] `BlockEditorShell`
- [ ] `EditableBlockFrame`
- [ ] `BlockToolbar`
- [ ] `BlockPicker`
- [ ] `BlockInsertionPoint`
- [ ] `BlockPreview`

## P3 — estensioni solo dopo validazione d'uso

- [ ] renderer dinamico condiviso;
- [ ] registry di renderer nell'admin kernel;
- [ ] `BlockOutline`;
- [ ] layout avanzati;
- [ ] drag and drop evoluto;
- [ ] virtualizzazione per documenti molto grandi.

# Criteri di accettazione

La proposta può essere considerata riuscita se:

- almeno due consumer riutilizzano i componenti senza fork locali;
- `trinacria-ui` non introduce dipendenze verso plugin o SDK;
- le API restano comprensibili senza conoscere il CMS internamente;
- i componenti specifici dei domini possono essere composti senza duplicare layout e stati;
- l'editoriale mantiene il proprio schema persistente indipendente da React;
- la libreria non incorpora autorizzazione, workflow o chiamate di rete;
- bundle e dipendenze restano controllati;
- test e Storybook coprono gli stati principali.

# Rischi

- trasformare la libreria in un contenitore di componenti troppo specifici;
- introdurre un renderer dinamico prima che il formato dei blocchi sia stabile;
- accoppiare schema persistente e componenti React;
- duplicare componenti già presenti con nomi differenti;
- implementare un editor completo prima di consolidare i casi d'uso;
- aumentare eccessivamente il bundle per consumer che usano solo gli atomi.

Mitigazioni:

- audit preliminare dei componenti esistenti;
- export granulari e tree shaking;
- promozione in `trinacria-ui` solo dopo riuso concreto;
- introduzione per fasi;
- componenti senza dipendenze applicative;
- revisione delle API dopo il primo consumer reale.

# Decisione

Nessuna decisione definitiva è presa con questo documento.

La raccomandazione è partire dai componenti P0, verificare ciò che esiste già nella libreria e usare l'Editorial Pack come primo consumer. I componenti dell'editor e l'eventuale rendering dinamico devono essere introdotti solo dopo aver stabilizzato il modello dei contenuti a blocchi e aver dimostrato il riuso in più contesti.
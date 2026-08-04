# Audit UI backoffice

Data: 2026-07-29  
Ambito: `admin-kernel`, `editorial-pack`, `media-pack`, `email-pack` e host `apps/backoffice`.

## Esito

Il backoffice ha già una buona adozione del design system: 74 dei 87 moduli
React analizzati importano `@trinacria-cms/trinacria-ui`. Il tema condiviso è
caricato dall'host prima dello stile locale. Le liste risorsa operative usano
gia il pattern `DataTable`/`ResourceTable`, e le pagine editoriali usano
`ResourcePage`.

Il problema non è la mancanza di componenti nella libreria: le primitive per
form, dialoghi, tabelle, sezioni, feedback e toast esistono già. Le
incoerenze derivano da alcuni pattern duplicati o da controlli nativi rimasti
nelle schermate specialistiche.

## Componenti da mantenere custom

Questi non vanno sostituiti ciecamente: hanno un comportamento editoriale o
di sistema che non è coperto da un normale campo/form/table.

- `media-pack/.../code-editor.tsx`: editor con numeri di riga, ricerca e Tab.
- `media-pack/.../csv-editor.tsx`: griglia editabile con selezione cella.
- `editorial-pack/.../editorial-rich-text.tsx` e `editorial-block-editor.tsx`:
  editor di contenuto strutturato.
- input `type=file` nascosto in `file-manager-frame.tsx`: è un bridge tecnico
  per l'upload, non un controllo visuale.

Questi componenti dovranno comunque usare token, `Button`, `Icon`, `Input` e
`Textarea` dove non compromettono l'interazione specialistica.

## Stato di implementazione

- [x] `ToastProvider` è montato nel punto di ingresso del backoffice.
- [x] I salvataggi di tema, template email, policy media, permessi plugin,
  impostazioni generiche, profilo, contenuto editoriale, modelli, workflow,
  azioni dichiarative, gestione plugin e operazioni principali del file manager
  usano toast coerenti; gli errori persistenti restano visibili inline tramite
  `ErrorBanner`/`FeedbackBanner`.
- [x] I pulsanti che persistono una modifica usano l’etichetta canonica
  `Salva`; creazione, eliminazione, ripristino e transizioni mantengono invece
  un’etichetta specifica dell’azione.
- [x] Le notifiche usano superfici semantiche dedicate e riconoscibili: verde
  chiaro per successo, rosso chiaro per errore, giallo per warning e azzurro per
  informazioni, con equivalenti accessibili nel tema scuro.
- [x] I tab condivisi seguono il modello shadcn: barra neutra compatta, stato
  attivo su superficie chiara e conteggi semplici senza pillola.
- [x] Uniformato il workspace impostazioni con `SettingsSectionLayout`: superficie
  aperta senza card di contenimento, header, griglie form, barra azioni, stato
  dirty, reset, conferma modifiche non salvate e navigazione mobile condivisi
  tra Core, Media ed Email.
- [x] Le sezioni dettaglio di plugin, content type e risorse dichiarative usano
  componenti canonici (`DetailSection`, `PropertyList`, `PropertyItem`).
- [x] Le pagine di contenuto usano `ContentSection`, un pattern lineare con
  separatori leggeri, al posto di card ripetute e poco leggibili.
- [x] Le card condivise hanno API di composizione uniforme
  (`CardHeader`/`CardContent`/`CardActions`), bordo, densità e padding
  espliciti; i widget Accessi, attività editoriale e contenuti recenti sono
  stati riallineati.
- [x] La panoramica usa due widget operativi coerenti: Accessi mantiene il
  grafico delle registrazioni; Editoriale occupa più spazio e riunisce articoli
  recenti e workflow. Il widget Media non pertinente è stato rimosso; i layout
  salvati precedenti adottano automaticamente le nuove dimensioni predefinite.
- [x] L’intera dashboard usa una grammatica condivisa: `PageHeader`, testate
  `CardHeading`, superfici senza shadow, stati di caricamento/errore/vuoto e
  widget dichiarativi o fallback coerenti. La personalizzazione consente di
  riattivare i widget nascosti e riordinarli anche da mobile; il salvataggio usa
  i toast canonici.
- [x] `editorial-overview` usa la `DataTable` canonica per i contenuti recenti:
  intestazione operativa, colonne e variante mobile sono coerenti con le altre
  liste; le card KPI non pertinenti sono state rimosse.
- [x] Le liste editoriali operative (`overview`, contenuti e modelli) usano il
  canvas a larghezza piena; azioni di creazione, consultazione e gestione sono
  raccolte nel primo header della tabella. Le pagine form/editor restano a
  larghezza contenuta per la leggibilità dei campi.
- [x] L’anteprima dell’editor a blocchi ha un canvas dedicato con viewport
  desktop/tablet/mobile, tipografia documento uniforme, rendering più leggibile
  di blocchi e tabelle e uno stato vuoto esplicito.
- [x] `scripts/check-admin-ui-primitives.mjs` protegge il perimetro: nuovi
  controlli nativi devono essere promossi in `trinacria-ui` oppure entrare
  esplicitamente nell'allow-list degli editor specialistici.
- [x] Build, test, lint e typecheck completi del monorepo eseguiti con esito
  positivo.

## Interventi prioritari

### P0 — unificare i feedback di azione

`ToastProvider` e `useToast` sono ora montati e usati dal backoffice. I flussi
migrati non mostrano più messaggi di successo locali; usano notifiche condivise
e mantengono i banner inline solo per gli errori che richiedono correzione.

Decisione proposta:

- [x] montare un solo `ToastProvider` al confine dell'applicazione;
- [x] usare toast per esiti transitori: successo, errore di richiesta, upload,
  operazioni su plugin e conferme non bloccanti;
- [x] mantenere `FeedbackBanner`/`ErrorBanner` inline per errori che bloccano una
  pagina, un form o richiedono un'azione correttiva;
- [x] standardizzare testi, tono e durata: success 4s, info 5s, warning/danger
  persistenti finché non chiusi.

### P1 — eliminare le duplicazioni di presentazione

- [x] Sostituire il `ErrorBanner` locale in
  `packages/email-pack/src/admin/components/email-template-manager.tsx` con il
  feedback canonico di `trinacria-ui`/`admin-kernel`.
- [x] Sostituire le sezioni card duplicate in
  `packages/editorial-pack/src/admin/content-type-detail/content-type-detail-section.tsx`
  e `packages/admin-kernel/src/pages/plugins/plugin-detail.tsx` con
  `PageSection`, `FormSection` o `DetailSection` di `trinacria-ui`, dopo aver
  scelto una sola semantica per le pagine dettaglio.
- [x] Allineare le card custom di impostazioni, widget e gestione media a `Card` o
  `PageSection`: la struttura, non la logica, è condivisibile.

### P1 — dettaglio, tabelle e form

- [x] Le tabelle di elenco sono già canonicali. Migrare la tabella key/value in
  `declarative-resource-detail.tsx` a `DetailSection` + `PropertyList` (o
  introdurre un `DetailList` in `trinacria-ui` se il layout label/valore serve
  anche altrove).
- [x] Mantenere custom le tabelle nel preview/editor documentale e nel CSV editor:
  rappresentano contenuto o un foglio di calcolo, non una tabella risorsa.
- [x] Rendere `FormSection` il contenitore standard per gruppi di campi nelle
  impostazioni e nei content type; i soli input nativi rimanenti devono essere
  quelli tecnicamente necessari agli editor.

### P2 — regole anti-regressione

- [x] Aggiungere una verifica che segnali nuovi `<input>`, `<select>`, `<textarea>`
  e `<table>` nei package admin, con allow-list per gli editor specialistici.
- [x] Richiedere una storia Storybook quando un nuovo pattern puramente
  presentazionale è riusato da almeno due schermate.
- [x] Aggiungere test contrattuali per gli esiti toast di successo ed errore,
  compresa la relativa semantica accessibile.
- [x] Aggiungere un guardrail statico che impedisca il ritorno di etichette di
  salvataggio contestuali (`Salva modello`, `Salva modifiche`, ecc.).
- [ ] Aggiungere test end-to-end di loading, successo e fallimento per ogni
  flusso di salvataggio migrato.

## Ordine di implementazione

1. [x] Montare il provider toast e migrare quattro flussi pilota: impostazioni
   tema, template email, media manager e content entry.
2. [x] Rimuovere l'`ErrorBanner` duplicato e consolidare le sezioni dettaglio.
3. [x] Normalizzare form e pagine di impostazione usando `FormSection` e
   `PageSection`.
4. [x] Chiudere il package UI con guardrail, Storybook e test accessibilità:
   addon a11y, smoke test axe, interazioni da tastiera e matrice contrasto sono
   attivi. Restano separatamente da pianificare i test end-to-end dei singoli
   flussi applicativi indicati nel P2.

## Revisione `trinacria-ui` — 2026-08-03

- [x] Corretto il contrasto di testo secondario, bordo forte e focus ring.
- [x] Alleggeriti i bordi a riposo dei campi e rimossi i contorni marcati da
  modali, drawer e dettagli risorsa; focus ed errore mantengono indicatori forti.
- [x] Rimossi gli alert manuali da autenticazione, Editorial e Media: errori e
  notice usano ora `ErrorBanner`/`FeedbackBanner` con semantica condivisa.
- [x] Ricondotte le superfici standard di profilo, impostazioni, overview,
  workflow e file manager a `Panel`, `EmptyState` e `PropertyList`.
- [x] Aggiunti i pattern riusabili `Disclosure` e `SelectableCard` con story,
  test e API pubblica; template email e selettori plugin li adottano.
- [x] Esteso il guardrail UI a pulsanti, disclosure, feedback ARIA e superfici
  custom, mantenendo in allow-list solo editor e drag-and-drop specialistici.
- [x] Corretta la cascata light/dark per gli accenti default, ocean, forest e trinacria.
- [x] Aggiunto il rispetto di `prefers-reduced-motion`.
- [x] Resa accessibile la sidebar mobile della shell: `inert`, focus trap, `Escape`, restore focus e `aria-current`.
- [x] Riallineata la combobox al pattern ARIA con focus mantenuto sull'input e option escluse dal tab order.
- [x] Uniformati id, ref e contenuti accessori dei controlli form base.
- [x] Collegati correttamente errori e hint di date, time e datetime picker; aggiunto l'invio nativo tramite `name`.
- [x] Aggiunte live region a banner, errori e notifiche; i toast con azioni restano persistenti.
- [x] Corretta la resa mobile di `DataTable` anche senza renderer custom.
- [x] Aggiunti landmark e nomi accessibili alla paginazione.
- [x] Ripristinato il focus del trigger dopo la selezione nei menu dropdown.
- [x] Distinte le varianti pulsante `secondary` e `outline`.
- [x] Resi configurabili i livelli heading di card e sezioni annidate.
- [x] Consolidato `SummaryCard` sul pattern canonico `StatCard`.
- [x] Attivato `@storybook/addon-a11y` su tutte le stories.
- [x] Aggiunti smoke test axe, test interattivi e test automatici della matrice di contrasto.

## Criteri di chiusura

- [x] nessun banner/notification custom nei flussi migrati per errori o successi ordinari;
- [x] tutti i salvataggi migrati espongono loading, successo ed errore coerenti;
- [x] tutte le liste risorsa usano `DataTable`/`ResourceTable`;
- [x] le eccezioni custom sono documentate e limitate agli editor specializzati;
- [x] ogni nuova UI riusabile nasce in `trinacria-ui` con documentazione e storia.

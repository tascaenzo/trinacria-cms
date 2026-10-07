# Installazione e primo avvio

Stato: implementato. Aggiornamento: 2026-10-05.

## Stato e configurazione

Lo stato autorevole è il record `{ kind: "install_state", key: "core-pack" }` in
`settings__plugin_core-pack`. Il playground lo legge da Mongo a ogni avvio;
il servizio legge lo stato senza cache locale. Eliminare il database riporta
il CMS al wizard. Il normale riavvio conserva installazione e credenziali.

Il file `.env` è una modalità di configurazione; sono valide anche variabili
iniettate dal processo, da Docker o da un secret manager. La presenza del file
non decide se l'installazione può procedere. Il wizard non scrive configurazioni
o segreti sul server.

## Verifica dei requisiti

Il playground esegue `inspectInstallationPrerequisites` prima di caricare i plugin.
`GET /v1/install/status` ripete i controlli e restituisce un elenco strutturato,
con esito `pass`, `fail` o `blocked` e un codice messaggio traducibile:

| Controllo | Verifica reale | Intervento quando fallisce |
| --- | --- | --- |
| `database` | Connessione e `ping` con l'URI effettivo del processo | Correggere URI, credenziali o raggiungibilità |
| `transactions` | `hello`: replica set o cluster sharded | Configurare Mongo per le transazioni |
| `write-access` | Inserimento, aggiornamento, lettura e cancellazione nella collezione settings, dentro una transazione annullata | Assegnare lettura e scrittura sul DB del CMS |
| `runtime-keys` | Validazione del keyring tramite lo stesso validatore del vault | Configurare ID attivo e chiavi valide |

La prova non persiste dati né stampa credenziali, URI o materiale crittografico.
Il client Mongo della verifica è indipendente dal ciclo di vita Mongoose del CMS.
Il provisioning dei plugin verifica inoltre indici, schemi e servizi durante l'avvio.
Le regole di hardening production (JWT, CORS, cookie e secret injection) restano
quelle del [runbook production](../../it/0020-runbook-deploy-production.md).

Se un requisito fallisce, il kernel usa `installerOnly`: registra gli endpoint
ambientali, conserva i plugin nel catalogo senza caricarli e non inizializza
servizi persistenti o vault. `/ready` risponde 503; le API dei plugin non sono
montate. La pagina **Prerequisiti di installazione** mostra una checklist compatta
con esiti testuali, le istruzioni per i soli controlli falliti e il pulsante
**Ripeti i controlli**. Le istruzioni uguali vengono mostrate una sola volta;
i controlli dipendenti bloccati non duplicano la stessa correzione. Gli esempi
di configurazione sono espandibili e includono solo le variabili da correggere.
Dopo aver corretto la configurazione occorre riavviare il processo per caricare
i plugin: il refresh della guida non promuove un runtime incompleto a CMS attivo.
Se Mongo è leggibile, la guida conserva anche l'informazione che il CMS era già installato.

## Wizard e dati iniziali

Il backoffice verifica i prerequisiti prima del wizard. Se tutti gli esiti sono
`pass` e il runtime non richiede un riavvio, apre direttamente il setup (o il
login, se il CMS è già installato). Dopo un nuovo controllo positivo il passaggio
è automatico; finché un requisito manca, i form del setup non sono accessibili.

Il wizard ha tre passi: **Sito**, **Amministratore**, **Riepilogo**, rappresentati
dallo stepper del design system, con colonne uguali e indicazione del passo
corrente anche su mobile. Non ripete i banner dei prerequisiti. Alla fine mostra
la conferma e il pulsante di accesso; il dettaglio dei controlli è espandibile.
La scelta iniziale è:

- `empty`: modelli articolo e pagina, nessun contenuto editoriale;
- `demo`: stessi modelli e due contenuti in bozza, assegnati al nuovo amministratore.

Non viene più creato contenuto di esempio durante `onLoad` dell'Editorial Pack.
Il dataset mock completo di sviluppo è separato: [script dedicato](../../../../scripts/dev/README.md).

`POST /v1/install/bootstrap` accetta nome/cognome, email, password e conferma,
siteName, siteTagline, locale, timezone e `dataMode`. La password richiede
10–200 caratteri. `dataMode` omesso equivale a `empty`; la UI presenta entrambe le scelte.
Locale e timezone omessi usano `en-US` e `UTC`; tagline omessa è una stringa vuota.

## Transazioni, concorrenza e ripresa

1. Validazione input e nuova verifica dei requisiti.
2. Acquisizione del lease condiviso `cms-installation` in `platform_locks__plugin_kernel`.
   Durata 30 secondi, rinnovo ogni 10 secondi, identificativo del proprietario ed epoch.
3. Provisioning idempotente di manifest, ruoli, permessi e definizioni delle impostazioni.
4. Un'unica transazione core crea/riattiva l'admin, salva hash scrypt e ruolo admin,
   scrive tutte le impostazioni richieste, registra l'evento durabile dell'utente e
   salva il checkpoint `content` con adminUserId, adminEmail e dataMode.
5. Esecuzione degli hook `onInstall` dei plugin caricati, attraverso i loro servizi proprietari.
6. Checkpoint `verification` e controllo finale.
7. Transazione finale: `installed=true`, fase `complete`, data e adminUserId.
8. Rilascio del lease; se il processo termina improvvisamente il lease scade.

Le transazioni core scrivono anche il fence del lease. Un runner che ha perso
il lease non può commettere il checkpoint o chiudere l'installazione. Una seconda
richiesta contemporanea riceve 409 `installation_in_progress`.

Un errore nelle impostazioni o nell'outbox annulla l'intera transazione core:
non vengono conservati utenti o credenziali parziali. Un errore successivo negli
hook o nei controlli finali conserva il checkpoint e lascia `installed=false`.
Il login resta bloccato finché l'installazione non è completata.

Per riprendere si reinvia il bootstrap con email, password e scelta contenuti
originali. Il servizio verifica la password già salvata prima di aggiornare dati:
credenziali diverse o cambio di modalità restituiscono 409
`installation_resume_mismatch`. Le impostazioni del sito possono essere corrette
al nuovo tentativo. Non è necessario eliminare il database.

La baseline dei manifest e i dati dei plugin non costituiscono una singola
transazione globale. Per questo ogni hook deve essere **idempotente**, con
identificatori naturali o unici per i suoi dati. L'Editorial Pack controlla
separatamente i due slug demo: dopo un'interruzione crea solo quello mancante,
senza duplicare utenti, revisioni o eventi di creazione già commessi.

## Controllo finale e accesso

Prima di `installed=true`, il backend verifica:

- requisiti ancora validi;
- tutti i plugin configurati caricati;
- health di runtime, dipendenze, servizi durabili e cluster (se attivo);
- admin attivo, credenziali verificabili e ruolo admin;
- rilettura delle quattro impostazioni sito con i valori attesi;
- completamento senza errori degli hook di installazione.

La risposta contiene gli esiti e il record admin. La UI accetta il risultato
solo se tutti i controlli passano, esegue il login e mostra **Installazione verificata**
con il pulsante **Entra nel backoffice**. Se il login fallisce dopo il completamento,
lo stato installato rimane corretto e si può usare la normale schermata di accesso.

## API e persistenza

| Metodo | Percorso | Risultato |
| --- | --- | --- |
| GET | `/v1/install/status` | Stato Mongo, fase, dataMode, canInstall, restartRequired, checks e metadati ambientali |
| POST | `/v1/install/bootstrap` | `{ status, adminUser }` dopo verifica e commit |

Fasi pubbliche: `prerequisites`, `ready`, `configuration`, `content`, `verification`, `complete`.
`configuration` è riservata al modello; la configurazione core viene commessa
atomicamente passando direttamente da `ready` a `content`.
`canInstall` indica che un CMS non ancora installato ha superato i requisiti;
non garantisce l'assenza di un'altra richiesta in corso, protetta dal lease.

Lo stato interno conserva solo i dati della ripresa, mai la password in chiaro.
Le credenziali sono in `local_credentials__plugin_core-pack`, gli utenti e i loro
ruoli incorporati in `users__plugin_core-pack`. Settings e credenziali hanno indici
unici su `{kind,key}` e `{userId}`; gli utenti hanno email unica. L'outbox è in
`event_outbox__plugin_kernel`.

| Codice | HTTP | Significato |
| --- | --- | --- |
| `validation_error` / `password_mismatch` | 400 | Correggere l'input |
| `installation_already_completed` | 409 | Usare il normale login |
| `installation_in_progress` | 409 | Attendere la richiesta attiva, poi verificare lo stato |
| `installation_resume_mismatch` | 409 | Usare credenziali e scelta originali |
| `platform_maintenance` / `platform_lease_lost` | 503 | Requisiti, verifica finale o lease non validi |
| `internal_error` | 500 | Errore di provisioning; stato non completato, ripresa possibile |

SDK e OpenAPI sono generati dalle stesse DTO dei controller.

## Estensione per altri plugin e host

Il kernel espone `KernelPluginHooks.onInstall(context, { dataMode, adminUserId })`.
L'hook usa i normali servizi del proprietario, deve propagare gli errori e deve
supportare riesecuzioni. Un plugin senza dati iniziali non deve dichiararlo.
`onLoad` rimane dedicato all'avvio ordinario e non deve inserire dati demo.

Un host basato su `startCmsApp` può configurare `installation.inspect` con i propri
controlli e selezionare `installerOnly` quando falliscono. Il playground implementa
la verifica Mongo/keyring completa; il controllo predefinito del kernel verifica
la connettività dell'adapter. Gli host esterni devono definire esplicitamente i
requisiti specifici del proprio deployment.

## Verifiche automatiche

Test unitari: errori nelle impostazioni, requisiti bloccati, ripresa con le stesse
credenziali e rifiuto di takeover, fallimento del controllo finale.

Test Mongo: rollback di admin/credenziali/outbox, installer concorrenti su stato
condiviso, checkpoint persistiti e una sola creazione durabile dell'utente.

Test host: chiavi mancanti con Mongo sano, stato installato conservato in modalità
guida, installazione vuota, riavvio, database eliminato, demo interrotta dopo il
primo contenuto e ripresa senza duplicati. Tutti usano database temporanei.

Test browser: wizard, schermata di verifica e accesso al backoffice.

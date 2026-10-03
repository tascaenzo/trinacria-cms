# Plugin fidati — semplificazione del runtime standard

Stato: implementato il 3 ottobre 2026, secondo la decisione approvata dal maintainer.
[Milestone M8](../../milestones/M8-public-plugin-platform.md) ·
[Decisione e contratto operativo](../../../docs/cms/architecture/plugin-platform/trusted-plugin-model.md).

## Risultato

- Plugin installati nello stesso processo Node.js, operazioni pubbliche con chiamate
  dirette e contratti di dipendenza/schema/ownership. Nessuna approvazione persistita
  delle integrazioni locali, nessun fence transazionale dei grant nel percorso standard.
- Autorizzazione delle facade una volta per target prima del lavoro. Contesti certificati,
  deleghe utente, ACL e controlli di dominio restano attivi. Le operazioni nominate sono
  tracciate nel drain su caller e owner; un riferimento della precedente attivazione
  non può essere riutilizzato dopo reload.
- Vault cifrato e atomico mantenuto: il permesso può appartenere al producer o al consumer
  dichiarato, come per l'invio email; evento, destinatari, scadenza e monouso restano verificati.
- Singola istanza per default nel playground; cluster opt-in. Lifecycle locale con revisioni,
  retry identici, rifiuto CAS/concorrenza e cache in memoria limitata. Stato disabled persistito.
- Backoffice Settings → Plugins utilizzabile senza cluster; centro approvazioni rimosso.
  Client HTTP firmati mantengono grant espliciti, autenticazione e protezione replay.
- Le estensioni installate sono fidate: nessuna promessa di isolamento dal sistema operativo.
- SDK/OpenAPI, fixture TypeScript, starter generato, esempi e runbook aggiornati insieme.

## Verifica

Il test Mongo del nuovo host esegue dieci letture tra catalogo e consumer, consegna
un evento protected persistente e verifica disable/enable/load e riferimenti obsoleti.
Risultato: zero comandi sulla collection dei grant e zero record di approvazione.
I test della policy coprono dipendenze, plugin disabilitati/isolated, deleghe utente,
contesti falsi e permessi/consumer del vault; quelli del lifecycle coprono drain,
idempotenza, revisioni obsolete e comandi concorrenti.
La rotazione del buffer diagnostico non azzera la revisione locale del plugin;
un test con un solo evento conservato verifica rifiuto della revisione precedente.

La suite integrata su Mongo e la prova del Core sono state verificate; Redis e S3
richiedono attivazione esplicita. Gli esiti del checkout ripulito sono nel task di pulizia.
La prova tarball esterna passa backend senza React, amministrazione Chromium,
catalogo/consumer senza approvazioni, overlay SDK, CRUD/conflitti e upgrade distribuito
0.1→0.2 con dati conservati. Nessun pacchetto pubblicato.
Build e check completo passati, inclusi TypeScript/SDK, lint, test, boundaries, API
pubbliche, firma e template. Chromium: 21 prove passate, incluso il ciclo
disable/enable/load dal backoffice in modalità locale e CAS obsoleto via SDK.

Runtime delle verifiche: Node 24.21.0 e npm 11.16.0. Comandi riproducibili:

```sh
npm run build
npm run check
TRINACRIA_RUN_MONGO_INTEGRATION=1 npm run test:integration -- --concurrency=1
npm run e2e
npm run release:test
```

Eseguire la suite Mongo separatamente da browser e packaging: nell'esecuzione
simultanea due fixture degli eventi, con deadline/lease brevi, sono fallite e una
ha richiesto l'interruzione del processo di test. La ripetizione senza quel carico
concorrente passa, incluse entrambe le fixture. Il codice di produzione e le
deadline non sono stati modificati per far passare i test. I due database temporanei
residui sono stati rimossi identificandoli per nome; dati di sviluppo conservati.

## Limiti e attività successive

- La cache dei comandi locali dura cinque minuti e non sopravvive al riavvio: ricaricare
  l'inventario prima di un comando successivo. Il plugin esegue codice fidato, può usare
  risorse Node.js e può compromettere il processo; la responsabilità dell'installazione
  appartiene all'operatore.
- Mongo continua a richiedere replica set per le transazioni. Più istanze CMS richiedono
  la configurazione esplicita del cluster e il runbook distribuito.
- Prova umana indipendente dello starter e acceptance del deployment del team aperte.
- Nessun reset del database di sviluppo, commit o pubblicazione effettuati da questo task.

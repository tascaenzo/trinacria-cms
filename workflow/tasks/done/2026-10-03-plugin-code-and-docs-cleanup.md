# Pulizia del codice plugin e dei documenti

Implementazione del 3 ottobre 2026, richiesta dal maintainer dopo il consolidamento
[del modello fidato](../../../docs/cms/architecture/plugin-platform/trusted-plugin-model.md).

## Codice eliminato

- Broker HTTP/mTLS, ammissione JSON, workload, query/storage e operazioni di dominio
  dei container sperimentali; bridge iframe e relativi export/test/comando dedicato.
- Contratti e configurazione dei profili di esecuzione nei manifest e nella discovery.
  Manifest e sorgenti con configurazione non supportata vengono rifiutati esplicitamente.
- Registrazione della collection workload nel bootstrap; nessuna cancellazione di dati esistenti.
- Wrapper/fence transazionali dei grant locali, enlist dinamico e request fence
  nell'adapter Mongo. La guardia di manutenzione/cluster rimane nella transazione,
  prima e dopo il lavoro; namespace, CAS e ownership restano verificati.
- Provisioning delle approvazioni Email e metodi di policy subscription/claim/invoke
  persistita che non hanno più chiamanti.
- Tipi di grant per eventi, claim e settings non utilizzati; gli accessi remoti hanno
  solo scope API. Il discriminatore fisico vuoto degli indici HTTP è conservato per
  mantenere gli ID e gli indici dei record esistenti, senza autorizzare payload.
- Traduzioni e whitelist UI del vecchio centro approvazioni.

La policy dei client remoti si chiama `ExternalPluginHttpAccessPolicyService`, accetta
solo contesti HTTP autenticati e mantiene request, CAS, audit e revoca. Le integrazioni
installate usano esclusivamente `TrustedPluginAccessPolicyService`.

## Contratti e documentazione

- Rimossi i documenti operativi dei componenti eliminati e il relativo task futuro.
- Specifica del sito pubblico rinominata `public-site-contracts.md`; contenuti del sito conservati.
- Checklist riscritta sui dodici ambiti attivi; piano, milestone, stato e storico ripuliti.
- Guide eventi/email, settings/auth, API plugin e runbook esterno/cluster allineati:
  nessuna approvazione locale né istruzione verso UI o classi eliminate.
- SDK/OpenAPI rigenerati, export pubblici e fixture aggiornati. Build di kernel/Core/admin
  eseguita dopo aver rimosso gli output precedenti, per escludere file orfani dai tarball.
  Il packaging rifiuta esplicitamente gli artefatti dei componenti eliminati.

## Verifica

Runtime: Node 24.21.0, npm 11.16.0. Controlli richiesti:

```sh
npm run build -- --force
npm run check
TRINACRIA_RUN_MONGO_INTEGRATION=1 npm run test:integration -- --concurrency=1
npm run e2e
npm run release:test
```

I test mirati verificano contesti/deleghe, policy HTTP separata, manifest non supportati,
discovery prima dell'import e visibilità delle impostazioni. Il browser confronta
anche lo schema live dei grant con quello del client: solo API, nessun campo eventName.
La suite Mongo viene eseguita separatamente da browser/packaging per evitare falsi
fallimenti delle fixture con deadline brevi. Tutte le prove usano dati temporanei dedicati.

Esiti: build pulita e check completo passati; 51 test mirati, 42 prove Mongo e
21 Chromium passati. Redis e S3 non attivati. Installazione degli otto tarball fuori
dal monorepo passata: backend senza React, browser, catalogo/consumer, overlay SDK,
CRUD/conflitti e upgrade distribuito 0.1→0.2 con dati conservati.
Link relativi dei documenti verificati; nessun riferimento operativo verso file eliminati.

Prova umana dello starter e acceptance del deployment restano aperte; nessun commit,
rilascio di pacchetti o reset del database di sviluppo è richiesto da questo task.

# Consolidamento automatico delle basi CMS e plugin

Stato: consegnato il 5 ottobre 2026. Questo task copre codice, verifiche locali e
procedure; non dichiara completate acceptance umana, CI remota o staging.

## Consegna

- Runner conformità: nove scenari prevalidati, ordine deterministico, stop al primo
  errore, teardown anche su fallimento, JSON stdout e log console stderr.
- Modulo fisico esterno con contratti pubblici, Mongo e Chromium reali, SDK overlay
  eseguito, dipendenza mancante, cleanup/reload e removal con conservazione dei dati.
- Catalogo 0.1→0.2 migrato da CLI. Reinstallazione esplicita riapre il writer fence
  conservato da uninstall; il normale startup non cancella maintenance.
- Recovery su DB vuoto distinto: tipi BSON, opzioni/indici, media con SHA-256 e
  configurazione privata. Riavvio/login/stato installato/catalogo/health verificati.
- Guardrail su tarball senza sorgenti orfani; output precedenti dei soli otto pacchetti
  TypeScript archiviati reversibilmente sotto `.tmp`, ricompilazione senza cache.
- CI con Chromium prima della fixture, check completi, integrazioni non cacheabili,
  primo avvio Mongo e artefatti redatti. Guide EN/IT e task allineati.

## Evidenze locali

Runtime: Node 24.21.0, npm 11.16.0, macOS arm64; Mongo 7 replica set, Redis 7,
MinIO RELEASE.2025-09-07T16-13-09Z. I servizi Redis/S3 temporanei sono separati dai
servizi esistenti. Browser e integrazioni reali usano DB dedicati, mai il DB mock.

| Comando | Esito |
| --- | --- |
| `npm run check` | 605 passati; 34 opt-in skip nel comando ordinario |
| `npm run test:integration -- --concurrency=1` con tre flag attivi | 45 passati, 0 skip |
| Test playground con flag Mongo | 12 passati, 0 skip; include primo avvio reale |
| `npm run e2e:ci` | 28/28 passati, porte dedicate |
| `npm run build -- --force` | 15/15 task |
| `npm run storybook:build` | 11/11 task |
| `npm run sdk:check` e API/signing/template | Passati |
| `npm run release:test` | Otto tarball fisici, nove scenari, upgrade e restore passati |
| `release:pack` / guardrail | Otto pacchetti coordinati, nessuna pubblicazione |

I report riproducibili sono `.tmp/release/external-host-result.json` e
`.tmp/release/catalog-conformance-result.json`; SHA-256 e integrità npm per i pacchetti
sono nel report esterno/inventario release. La CI li conserva come artefatti, senza
backup, credenziali o keyring. Il controllo statico da solo conserva `complete:false`.

Baseline del primo esito positivo (2026-10-05 12:57:29 UTC) con sei plugin: avvio più primo login 8133 ms, RSS 342900736 byte;
50 GET seriali, cinque warmup, mediana 9.14 ms, p95 10.06 ms. Backup fixture 36 ms;
restore e verifica 10757 ms, 27 collection, 1621 documenti, 69 indici, un media.
Sono misure della fixture, senza una soglia di capacità o RTO del deployment.

## Limiti e chiusura del team

La versione ufficiale 0.1.0 resta interna e non pubblicata. Il catalogo 0.2.0 è
l'artefatto di upgrade sintetico della fixture. Il backup helper non è una utility
operativa di produzione. La prova locale usa media su disco; S3 è verificato dalla
suite del provider e richiede una procedura di snapshot/restore specifica sullo staging.

DB mock letto dopo le prove: 31 collection, 4 utenti, 13 entry, 3 media; nessun reset.
I processi browser del test usano porte alternative perché il CMS di sviluppo è attivo.

Restano da assegnare staging, partecipante indipendente e reviewer G2. La CI remota
va eseguita sul candidato dopo push; G3/G4 restano gate autonomi.
[Registro operativo del team](../../../docs/cms/architecture/plugin-platform/single-instance-acceptance.md).


## Riproducibilità del checkpoint

Il contenuto del commit `1add372` è stato esportato con `git archive` in una directory
nuova senza `node_modules`, `dist` o cache Turbo. In quella copia sono passati `npm ci`
(0 vulnerabilità segnalate), build forzata 15/15, `npm run check` (605 passati, 34 opt-in
skip previsti), SDK generato (138 operazioni), otto tarball e tutti i nove scenari
esterni con upgrade/restore. Il codice dei domini è invariato dopo questa verifica. Gli incrementi successivi
aggiornano i registri e il cleanup della sola fixture esterna, verificato nuovamente
con la suite completa e controllo dell assenza del database temporaneo.

Report della ripetizione: `.tmp/release/clean-checkout-conformance-result.json` e
`.tmp/release/clean-checkout-external-host-result.json`. Il report del checkpoint
`.tmp/release/foundation-checkpoint.json` registra commit, verifiche e gate pendenti.
Gli artefatti restano locali e redatti, mentre le procedure/evidenze aggregate sono
versionate. Non sono stati eseguiti push, pubblicazioni o prove sullo staging del team.


## Cleanup dei database delle fixture

Il controllo finale ha identificato database sintetici residui: il figlio backend
poteva terminare prima di completare la propria pulizia. Il runner ora attende l'uscita
dei figli ed elimina esplicitamente il solo DB casuale di sua proprietà, anche dopo
errori del figlio. L'helper valida il prefisso/UUID, verifica il nome della connessione
ed esige zero collection residue; non richiede di elencare tutti i database del cluster.
Sono stati rimossi gli undici residui identificati, privi di utenti/contenuti/media.
Il database CMS e database non appartenenti alla fixture sono esclusi.

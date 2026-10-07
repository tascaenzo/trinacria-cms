# Audit funzionale dei pack

## Stato e perimetro

Data: 2026-10-07. Audit dei percorsi Core/IAM, Editorial, Media, Email e
impostazioni; correzioni IAM-01–05 implementate. Baseline: `8ed0593`, sorgenti
della PR #17, di cui il team ha comunicato merge e validazione del consolidamento.
Le prove e i limiti di questa fase sono riportati sotto, separatamente dalle
funzionalità future delle specifiche.

Il progetto è in beta: backend, SDK, UI e snapshot delle API vengono aggiornati
insieme, senza mantenere compatibilità con contratti precedenti. I plugin restano
installati e fidati nello stesso processo. Non viene aggiunto isolamento RPC.

Metodo: seguire attore, UI, contratto API, autorizzazione e persistenza. Una
capability pubblicata descrive una funzione disponibile, mentre il permesso
abilita l'utente. I test unitari da soli non dimostrano un percorso browser.

## Problemi risolti

| ID | Problema iniziale | Risultato |
| --- | --- | --- |
| IAM-01 | API gestionali legate all'ID del setup | Più amministratori; accesso backoffice esplicito; lettura dei propri ruoli/permessi per ogni account autenticato; autorizzazione delle singole operazioni |
| IAM-02 | Possibile sospendere/revocare l'ultimo gestore | Invariante nella transazione IAM, anche su modifica profilo e policy; ruolo admin protetto; recupero locale |
| IAM-03 | Assegnazioni disponibili solo via API | Dettaglio utente con assegnazione, rimozione confermata e riepilogo accessi; selezione di ruoli attivi |
| IAM-04 | Grant riscritti in sequenza perdendo provenienza | Aggiornamento aggregato con CAS, revisione obbligatoria e transazione; contributi plugin conservati; aggiunte e override manuali distinti |
| IAM-05 | UI esponeva grant senza valutare deny/condizioni | Valutatore condiviso, permission attive, proiezione globale e contestuale; controllo sui dettagli e menu delle righe |

Durante le prove sono stati corretti anche: guard dei manifest sovrascritti dai
metadati UI; discovery che richiedeva privilegi diagnostici all'autore;
impostazioni/audit vincolati all'amministratore completo; token che potevano
sopravvivere a sospensione e cambio password; challenge MFA pendenti; modifiche
API a policy fornite dai plugin; errori di invito/reset trattati come errori 500.

## Decisioni tecniche implementate

### Accesso alla shell e permessi di lavoro

`core-pack:backoffice:access` abilita la shell. Un pack può dichiarare e concedere
il proprio `<pluginId>:backoffice:access`: Core deriva l'accesso comune soltanto
se quella permission è registrata, attiva e consentita senza contesto di record.
Questo consente ai ruoli Editorial di funzionare senza grant nel namespace di
un altro plugin. Un deny su `core-pack:backoffice:access` prevale anche sul
permesso derivato.

La discovery minima (plugin installati, capability, contribution, estensioni
admin) richiede questo accesso. Sorgenti, diagnostica e operazioni del runtime
mantengono `plugins:read`/`plugins:manage`. L'accesso alla shell non concede
Users, Settings, Media o pubblicazione. Ogni richiesta mutativa è autorizzata dal
backend anche se la UI è rimasta aperta durante una revoca.

### Amministratore operativo e delega

Almeno un utente attivo con credenziali locali deve avere, senza condizioni,
`core-pack:backoffice:access`, `users:write`, `roles:write` e
`permissions:write`. Un invitato senza password non conta. L'ID salvato dal setup
resta un dato dell'installazione, non un'identità privilegiata permanente.

`roles.write` è amministrazione IAM piena, inclusa la possibilità di ampliare i
grant: concederlo solo a persone fidate. `users.write` da solo consente gestione
anagrafica e inviti, non assegnazione di ruoli: servono anche `roles.write`.
Per la UI del dettaglio utente servono `users.read`, `roles.read` e, per
scegliere permission nei form ruolo, `permissions.read`.

Il ruolo `admin` mantiene grant/stato gestiti dalla piattaforma; nome e
descrizione sono modificabili. Non viene introdotto un modello di delega limitata
con livelli gerarchici o vincolo «puoi concedere soltanto ciò che possiedi».

### Transazioni, concorrenza e provenienza

Le mutazioni IAM usano una transazione Mongo. Nella stessa transazione viene
aggiornato il documento di installazione: serializza la verifica dell'ultimo
amministratore anche quando due richieste modificano utenti diversi. La
violazione produce `409 iam_last_admin` e rollback, senza stato parziale.

PATCH ruolo e cambio stato richiedono `expectedUpdatedAt` letto dal record.
Metadati, grant e override vengono aggiornati in un unico CAS; versione obsoleta
produce `409 iam_revision_conflict`. Il form passa la revisione automaticamente
in un campo nascosto. Array di assegnazioni, grant e policy hanno CAS anche nei
repository usati dal provisioning.

I contributi dei plugin mantengono `sourcePluginId`. Le aggiunte dell'operatore
usano `core-pack-manual`; deselezionare un grant del plugin crea un deny con
source `core-pack-permission-overrides`. Reselezionarlo elimina quel deny. Il
reload del plugin non annulla una scelta dell'operatore; il cleanup cancella
soltanto contributi della propria source. Le policy fornite dai plugin sono
consultabili ma non modificabili tramite CRUD manuale: aggiungere una policy
manuale, oppure usare il selettore grant per l'override di una permission.

Una policy deny prevale sempre su allow e grant, anche provenienti da altri
ruoli. «Permessi del ruolo» nel form indica la selezione dei grant, non la
risultante di tutte le policy avanzate. Il riepilogo utente mostra invece le
azioni consentite senza record. `GET /v1/users/{id}/permissions?resourceId=…`
applica anche le condizioni sul record. Non pubblicare una permission
condizionata come se fosse globale.

### Sessioni, MFA e recupero

JWT access/refresh e challenge MFA portano `sessionVersion`. Sospensione,
riattivazione, password reset, invito accettato e cambio password invalidano le
sessioni precedenti. Riattivare non fa rivivere vecchi token. Il cambio password
autenticato verifica nuovamente le credenziali nella transazione e rinnova i
cookie del browser corrente. I challenge sono monouso; revoca/password change
rende invalidi anche quelli ancora pendenti.

Letture di ruoli e permission rilevanti all'autorizzazione usano il DB corrente,
senza dipendere da invalidazioni della cache su un'altra replica. Il backend
rivaluta gli accessi a ogni operazione; la UI aggiorna shell e menu dopo le
modifiche locali. Una scheda di un altro operatore non riceve push: può mostrare
un menu vecchio finché non ricarica, ma le richieste vengono respinte.

Le mutazioni IAM completate, fallite e negate producono audit redatto con attore,
operazione, risorsa e correlazione; nessuna password o payload del form. Un
fallimento del sink incrementa la metrica di errore audit senza annullare una
mutazione già completata. La CLI di recupero è un'azione locale dell'installatore,
con risultato redatto: conservarlo nel registro operativo esterno.

Procedura: [gestione e recupero accessi](./identity-access.md).

## Matrice Core

| Percorso/attore | API/SDK, dati e autorizzazione | Backoffice ed evidenza | Esito |
| --- | --- | --- | --- |
| Setup e secondo amministratore | Bootstrap, login, assegnazione admin; middleware basato su privilegi correnti | Wizard esistente; host IAM reale con due amministratori | Implementato e provato |
| Operatore editoriale | Login; proprie assegnazioni/permission senza users.read; discovery con accesso shell | Invito → assegnazione/rimozione autore → login e profilo in Chromium | Implementato e provato nel percorso E2E |
| Account pubblico | Login/profilo proprio; nessun accesso alla discovery o alla rubrica | Prove HTTP con account senza ruoli | Implementato e provato |
| Invito/registrazione/reset | Link con hash, scadenza, consumo e transazione; credenziali e outbox; reset non enumera account | E2E consumi ripetuti; unit su invito scaduto e reset già usato | Implementato e provato nel perimetro indicato |
| Sospensione/revoca | Controllo ultimo admin su profilo, stato, assegnazioni, ruoli e policy | Mongo: rollback sospensione/deny, revoche simultanee; token resta revocato dopo riattivazione | Implementato e provato |
| Modifica ruolo | Permission valide/attive, CAS aggregato, provenienza e override | Form con revisione nascosta; unit e HTTP con modifiche concorrenti | Implementato e provato |
| Policy avanzate | CRUD SDK, wildcard, deny e due condizioni; source protette | Decisione: editor avanzato via API, senza nuovo designer UI in questa fase | Implementato; scelta di prodotto esplicita |
| MFA | TOTP, recovery code, enrollment, challenge monouso/versionati; modalità obbligatoria/optional | Profilo/login già presenti; unit TOTP, replay e challenge revocato | Implementato; nessuna nuova prova browser TOTP in questa fase |
| Cambio password | Vecchie sessioni revocate; nuova sessione per il browser corrente | Chromium controlla cookie correnti, vecchio bearer e ricaricamento profilo | Implementato e provato |
| Recupero locale | CLI senza endpoint HTTP, transazione e DB esplicito | Host IAM temporaneo; procedura documentata | Implementato e provato |
| Elenchi | limit/offset nelle API e SDK; catalogo ruoli del pannello caricato a pagine da 200 | Liste dichiarative correnti; ricerca/paginazione UI dedicata non aggiunta | Funzione corrente; UX per grandi rubriche evolutiva |

## Matrice Editorial

| Percorso | Comportamento corrente ed evidenza | Esito/decisione |
| --- | --- | --- |
| Modelli e campi | Definizioni validate, chiavi stabili, schema/layout, soft delete/restore; modello popolato blocca cambi distruttivi. Unit e Mongo `editorial-hardening.integration` | Implementato; migrazione guidata dei modelli futuri separata |
| Autore/revisore/editor | Ownership globale/per modello, reviewer assegnato e permessi per transizione; proprietà derivata dall'attore. Prove Mongo con principal distinti e prova shell autore | Implementato; accesso shell corretto qui |
| Salvataggio e workflow | Validazione prima della persistenza, CAS/versione, transazioni e outbox; workflow direct/review e feedback UI loading/error/success | Implementato e coperto da test di dominio/E2E |
| Revisioni | Snapshot immutabili su transizione/snapshot esplicito; salvataggio ordinario senza nuova revisione; restore conserva stato di workflow/pubblicazione e valida schema corrente | Implementato; specifica aggiornata a questo comportamento |
| Pubblicazione e delivery | Snapshot e pointer separati dal lavoro corrente; ripubblicazione esplicita, withdrawal, Media rivalidati anche prima di 304 | Implementato; Mongo e roundtrip SDK/sito Chromium |
| Preview | Token monouso, destinazione esatta, cookie di preview, scadenza e autorizzazione corrente; nessun token nei log | Implementato e coperto da Mongo/browser |
| Date | `scheduledAt` impedisce transizione anticipata; UI «Pubblica non prima di» | Vincolo temporale manuale, nessun scheduler automatico; aiuto UI esplicito |
| Tassonomie/commenti/diff | Specifica futura più ampia del codice corrente | Non dichiarati implementati; roadmap separata |

Fonti: `packages/editorial-pack/src/operations/`, `modules/entries/services/`,
`modules/publications/`, `test/editorial-hardening.integration.test.ts`,
`publications.integration.test.ts`, `delivery.integration.test.ts`,
`preview.integration.test.ts`, e `test/e2e/production-readiness.spec.ts`.

## Matrice Media e collegamento Editorial

| Percorso | Comportamento corrente ed evidenza | Esito/decisione |
| --- | --- | --- |
| Upload e sostituzione | Staging/completion, dimensioni, firma formati, pixel, checksum S3; sostituzione mantiene ID/ACL e rivaluta permessi | Implementato; unit e Mongo; smoke S3 opzionale |
| Directory e ACL | Cicli impediti, directory con asset non eliminabile; ACL ereditate; permesso applicativo e ACL entrambi necessari; filtro prima di paginazione | Implementato e coperto da test |
| Picker e blocchi immagini | File Manager seleziona asset; authoring e preview usano URL temporanee autorizzate; pubblicazione richiede asset ready/public | Implementato: corretti riferimenti documentali al «futuro picker» |
| Ruoli editoriali e Media | Ruolo author non concede automaticamente Media; editor riceve read/upload/update, admin tutti i grant; ACL restano un secondo controllo | Scelta esplicita: abilitare un ruolo Media aggiuntivo/manuale per autori che usano asset |
| Rimozione e delivery | Soft delete/retention/purge; asset rimosso non pubblicabile e delivery rivalida riferimenti | Implementato; nessuna cancellazione automatica a cascata delle entry |
| Provider | Local disk con volume durevole; S3-compatible per repliche; health e segreti separati | Implementato; migrazione provider/resumable/reference graph fuori v0 |

Per un autore con immagini creare un ruolo, ad esempio `media-contributor`, con
`media-pack:assets:read`, `media-pack:assets:upload`, `media-pack:assets:update` e assegnarlo oltre ad
`author`. Le permission complete sono nel catalogo del CMS. Se deve rendere asset
pubblici, concedere separatamente `media-pack:shares:manage` e verificare l'ACL: l'upload da
solo crea un asset privato. Non assegnare `editor` soltanto per ottenere Media,
perché quel ruolo abilita anche approvazione/pubblicazione editoriale.

Fonti: `packages/media-pack/src/operations/media-operations.ts`,
`test/application-operations.test.ts`, `test/media-pack.test.ts`,
`test/media-pack.integration.test.ts`,
`packages/editorial-pack/src/admin/block-editor/image-block-fields.tsx`,
`modules/publications/publication-validation.ts` e `delivery.service.ts`.

## Matrice Email e impostazioni

| Percorso | Comportamento corrente ed evidenza | Esito/decisione |
| --- | --- | --- |
| Template | CRUD, locale/fallback, variabili e rendering; default idempotenti; permessi settings read/write Email | Implementato; salvataggio/validazione browser, unit e facade |
| Inviti/reset | Payload cifrati, notifiche prive di link segreti; consumo autorizzato e job durevole | Implementato; prova E2E email e token monouso |
| Fallimenti provider | Retry/backoff, lease, dead letter e riconciliazione dello stato incerto nel job host | Implementato; integrazioni `secure-email-jobs` del kernel, non promessa exactly-once SMTP |
| Provider reale | Console redatta e SMTP configurabile via settings | SMTP esterno non provato in questo audit; accettazione ambiente dell'installatore |
| Impostazioni | Default/override, proprietà pack, valori raggruppati, segreti cifrati e export mascherato; scritture autorizzate per singola operazione | Implementato; corretto gate per operatore delegato |
| Lifecycle e diagnostica | Discovery per accesso shell; management, audit, delivery e job con permission specifiche | Implementato; non cambiano i gate multi-replica/deployment di M8 |

Fonti: `packages/email-pack/src/operations/email-operations.ts`,
`modules/email-templates/`, `modules/email/services/`,
`packages/kernel/test/secure-email-jobs.integration.test.ts`,
`packages/core-pack/test/settings*.test.ts`, `owned-settings-host.integration.test.ts`
e suite browser.

## Verifiche e limiti

Risultati locali conclusivi (Node 24.21.0/npm 11.16.0):

| Verifica | Risultato |
| --- | --- |
| Suite ordinaria monorepo | 613 passati, 0 fallimenti/cancellazioni, 35 integrazioni opt-in saltate |
| Integrazioni con Mongo attivo | 44 passati, 0 fallimenti/cancellazioni; Redis e S3 opzionali saltati (2) |
| Chromium | 29/29 passati |
| Build | 15/15 task passati |
| Qualità e contratti | Lint, guardrail UI, confini, typecheck (incluso E2E), dipendenze, API pubbliche, signing, template e SDK generato passati |
| Distribuzione locale | Otto tarball coordinati 0.1.0 validati; bin recupero incluso; nessuna pubblicazione |

Risolto anche un timeout intermittente nel test di deadline degli eventi: attesa
esplicita dell'abort, emersione degli errori prima del dispatch e cleanup del
processo pendente. Gli eventi mantengono lo stesso comportamento runtime.

Usare Node 24.21.0. La suite normale lascia esplicitamente gated le prove di
infrastruttura; le integrazioni Mongo vengono eseguite con
`TRINACRIA_RUN_MONGO_INTEGRATION=1`. I database hanno nomi temporanei dedicati e
vengono rimossi al termine; puliti anche i residui delle prove interrotte.
Nessun reset del DB mock del team.

Il nuovo test `packages/core-pack/test/iam-host.integration.test.ts` usa HTTP e
Mongo reali e comprende due amministratori, utente pubblico, revoca/riattivazione,
protezione ultimo admin su profilo/policy, CAS concorrente, provenienza grant,
recupero CLI e audit. La suite browser comprende assegnazione/rimozione autore,
profilo non admin, isolamento Users e rinnovo cookie dopo cambio password.

Non sono nuove prove di staging: SMTP esterno, MinIO/S3 e Redis restano suite
opzionali; recovery MFA è coperto a livello servizio/CLI, non tramite dispositivo
reale. La protezione amministrativa serializza le scritture IAM e verifica gli
utenti attivi: adatta al CMS attuale; ottimizzare la scansione solo con misure su
rubriche grandi. Il registro audit è best effort, non un requisito di compliance.

## Estensioni successive, distinte da questa chiusura

1. Designer UI delle policy avanzate, delega IAM limitata, cambio email verificato
   e cancellazione/anonymizzazione account: richiedono requisiti di prodotto.
2. Ricerca/paginazione UI delle rubriche e gestione team/gruppi se necessari.
3. Editorial: tassonomie, commenti revisionali, scheduler durevole, migrazione
   guidata schema e diff avanzato.
4. Media: trasformazioni, reference graph, quote per utente e migrazione provider.
5. Email: dashboard dedicata dei job se l'attuale diagnostica non basta.

Nessuna di queste estensioni è presentata come funzione già completata.
Checklist e risultati finali: [task operativo](../../../../workflow/tasks/done/2026-10-07-pack-functional-audit.md).

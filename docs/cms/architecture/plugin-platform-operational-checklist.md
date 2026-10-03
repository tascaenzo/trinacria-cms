# Checklist operativa della piattaforma plugin

Contratto corrente: [modello dei plugin installati fidati](plugin-platform/trusted-plugin-model.md).
Il progetto è una beta non rilasciata. Contratti, SDK, esempi e guide cambiano insieme;
nessun alias o percorso parallelo di compatibilità. Non cancellare dati di sviluppo.

## 1. Contesto e fiducia dei plugin

- [x] Hook e handler ricevono `PluginHostServices`, con identità stabilita dall'host.
- [x] Operazioni pubbliche e private dichiarate; input/output validati e dipendenze esplicite.
- [x] I plugin installati condividono il processo Node.js e sono codice scelto dall'operatore.

Acceptance: contesti falsi, owner errato e riferimenti obsoleti devono essere rifiutati.
Le API riducono errori d'integrazione; non sono una sandbox delle risorse Node.js.
[Specifica A0](plugin-platform/security-and-operations.md#a0--contesto-plugin-e-confine-di-fiducia).

## 2. Eventi e cleanup

- [x] Public/protected/audit/private hanno visibilità e dichiarazioni verificate.
- [x] Protected/audit richiedono policy positiva, dipendenza e permesso del producer.
- [x] Policy e generation sono ricontrollate alla consegna; rollback ripulisce binding parziali.
- [x] Diagnostica redatta e disable/unload senza handler residui.

Acceptance: consumer non autorizzato, policy assente/fallita, reload durante valutazione,
bus stopOnError, compensazione fallita. Nessuna approvazione DB delle sottoscrizioni locali.
[Specifica A1](plugin-platform/security-and-operations.md#a1--policy-eventi-e-diagnostica).

## 3. Vault e payload sensibili

- [x] Cifratura con keyring esplicito; nessuna chiave di fallback.
- [x] Producer/consumer derivati dall'host; lista destinatari, evento/type/schema/permesso e TTL verificati.
- [x] Claim atomico con CAS, retry limitato, monouso e record restituiti senza ciphertext.
- [x] Rotazione CAS e retention separate dall'autorizzazione alla lettura.

Acceptance: claim concorrenti, payload scaduto/corrotto, destinatario non ammesso,
chiave assente, revoca concorrente e rotazione. Sottoscrizione wildcard non amplia i destinatari.
[Specifica A2](plugin-platform/security-and-operations.md#a2--claim-atomico-policy-strutturale-e-rotazione-vault).

## 4. Autorizzazione nei domini

- [x] User/plugin/system hanno contesti certificati; delega conserva i permessi dell'utente.
- [x] Facade autorizzano ogni target prima del lavoro; controller e plugin usano gli stessi servizi.
- [x] Editorial controlla workflow/ownership/publish; Media ACL; Settings secret/mutable/owner.
- [x] Activity su caller/owner, drain e servizi della vecchia activation invalidati.

Acceptance: chiamate interne senza permesso, system scope errato, private operations,
conflitti di dominio e principal falsi nel body. Le transazioni conservano i controlli
sui dati; non scrivono counter dei grant per le integrazioni locali.
[Inventario dei domini](plugin-platform/application-operation-inventory.md).

## 5. OpenAPI e SDK

- [x] Controller sono fonte della specifica HTTP; SDK e snapshot aggiornati insieme.
- [x] Client tipizzato, errori di validazione/CAS e signing canonico verificati.
- [x] Overlay di un plugin generato senza modificare il client ufficiale.

Acceptance: schema live, consumer TypeScript esterno, 401/403/409 e roundtrip browser.
[API e release](plugin-platform/api-sdk-and-release.md).

## 6. Export e versioni

- [x] Export intenzionali, snapshot `.d.ts`, inventario e fixture TypeScript.
- [x] Semver npm diretto; core/plugin/admin incompatibili rifiutati.
- [x] Componenti inutilizzati rimossi anche dai tarball; guide EN/IT allineate.

Acceptance: build pulita e controllo API; nessun file compilato orfano distribuito.

## 7. Packaging e backoffice

- [x] Backend separato da entry admin/metadata; una sola copia React nel browser.
- [x] Renderer registrati tramite manifest e modulo del backoffice.
- [x] Settings → Plugins funziona in locale con revisioni e comandi idempotenti.

Acceptance: tarball fuori dal monorepo, cold start, CRUD, API-down recovery,
disable/enable/load e revisione obsoleta. Uninstall del pacchetto resta un comando distinto.

## 8. Migrazioni e dati

- [x] Namespace/ownership persistente e nomi fisici senza collisioni lossy.
- [x] Migrazioni revisionate con checksum, registro, CAS e lock di manutenzione.
- [x] Uninstall conserva dati; purge distinto con backup e autorizzazione esplicita.

Acceptance: upgrade con dati conservati, lock concorrenti, checkpoint/ripresa,
index failure e backup/restore. Singola istanza: backup, arresto, migrazioni e riavvio.
[Lifecycle e migrazioni](plugin-platform/migrations-and-lifecycle.md).

## 9. Eventi persistenti ed email

- [x] Sync usa il bus locale; async/deferred dichiarati usano outbox/delivery/inbox.
- [x] Effetti Mongo e inbox atomici; retry idempotenti, partizioni e dead-letter operative.
- [x] Vault→job email cifrato e atomico; invii SMTP ambigui richiedono riconciliazione.

Acceptance: rollback, crash/riavvio, takeover, deadline cooperativa, replay e drain.
Nessuna promessa exactly-once per gli effetti esterni.
[Eventi durevoli](plugin-platform/durable-events.md).

## 10. Client HTTP e deployment opzionale con più istanze

- [x] Client HTTP firmati: HMAC, nonce Mongo atomici e accessi espliciti persistiti.
- [x] Decisioni HTTP con CAS/audit e permessi amministrativi; non governano i plugin installati.
- [x] Cluster opt-in: desired state, lease/epoch, drain, writer maintenance e readiness.

Acceptance: replay, revoca alla richiesta successiva, consumer diverso e decisioni concorrenti.
Per più istanze verificare convergenza, restart e rifiuto delle scritture da lease obsolete.
[Sicurezza HTTP/distribuita](plugin-platform/distributed-security.md) ·
[Runbook cluster](plugin-platform/distributed-runtime-runbook.md).

## 11. Sviluppatore esterno

- [x] Generatore e conformità distribuiti; catalogo/consumer, overlay e upgrade automatici verificati.
- [ ] Prova indipendente dello starter da parte di una persona che non lo ha scritto.
- [ ] Registro completo dei nove scenari di conformità dello starter.

Acceptance: installare solo tarball, senza workspace link; annotare passaggi ambigui,
rebuild e errori reali. La prova automatica non completa la prova umana.
[Runbook esterno](plugin-platform/external-plugin-runbook.md) ·
[Acceptance](plugin-platform/external-plugin-human-acceptance.md).

## 12. Sito pubblico

- [x] Snapshot pubblicati separati dalla working copy; delivery allowlist, Media e preview.
- [x] Frontend SSR/SEO, cache e invalidazioni persistenti; flusso backoffice verificato.
- [ ] Acceptance del deployment del team, con cache, log e restore su ambiente scelto.

[Contratti del sito](plugin-platform/public-site-contracts.md) ·
[Runbook prodotto](plugin-platform/public-site-runbook.md).

## Verifica finale e attività aperte

Usare il runtime di `.nvmrc`. Eseguire build/check, Mongo, browser e tarball esterni.
La suite Mongo usa database dedicati e viene eseguita separatamente dalle altre prove,
con `TRINACRIA_RUN_MONGO_INTEGRATION=1 npm run test:integration -- --concurrency=1`.
Redis/S3 sono prove opt-in; registrarne l'attivazione o l'esclusione.

Il [piano tecnico](plugin-platform-implementation-plan.md) e la
[milestone M8](../../../workflow/milestones/M8-public-plugin-platform.md) collegano i task.
Non dedurre il superamento di gate umani o di deployment dal solo codice o dai test automatici.

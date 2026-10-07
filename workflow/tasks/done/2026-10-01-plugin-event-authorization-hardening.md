# A1 — Autorizzazione degli eventi plugin e modello di fiducia

Completato il 1 ottobre 2026; contratto aggiornato il 3 ottobre per le estensioni fidate.
[Milestone M8](../../milestones/M8-public-plugin-platform.md) ·
[Specifica A1](../../../docs/cms/architecture/plugin-platform/security-and-operations.md#a1--policy-eventi-e-diagnostica).

## Risultato

`protected`/`audit` richiedono un authorizer esplicito, permesso dichiarato dal producer
ed esito `allowed === true`. Provider esplicito precede il token DI. Assenza, errore e
risposta invalida negano l'accesso. Core fornisce `TrustedPluginAccessPolicyService`,
che usa manifest e dipendenze in memoria. Public rimane dichiarativo; private è owner-only.

Al binding, un rifiuto fallisce il load. Alla consegna, un rifiuto o errore della policy
salta il consumer e produce diagnostica redatta; altri consumer autorizzati proseguono.
Dopo ogni await vengono verificati stato e generation del binding: listener fotografati
dal bus non possono invocare una precedente activation dopo unload/reload.
Un handler già iniziato può terminare; la configurazione non ritira effetti già prodotti.

Un fallimento del binding ripulisce teardown, moduli e contributi del tentativo anche
nei load ricorsivi; le dipendenze già condivise non vengono scaricate. Stato failed e
compensazioni sono registrati. Correggere un manifest richiede un nuovo load esplicito.

`onDeliveryDiagnostic` contiene timestamp, plugin consumer/owner, nome e ID evento,
outcome e motivo stabile. Nessun payload, envelope completo o testo dell'eccezione.
Il callback diagnostico non amplia l'union degli eventi lifecycle e non pubblica sul bus.

## Verifica e limiti

I test del runtime coprono policy assente/negata/invalida, ownership/public/private,
wildcard, DI, consumer disabilitati, reload con policy sospesa, bus stopOnError,
cleanup/rollback ricorsivo e diagnostica fallita. Barriere Promise creano le race.
La policy Core copre dipendenza, permesso, evento dichiarato e cambio della configurazione.
La prova Mongo del catalogo/consumer consegna un evento protetto e scrive nel namespace
owned senza approvazioni o comandi sulla collection dei grant HTTP.

I plugin installati sono codice fidato nello stesso processo. Hook/handler ricevono
servizi scoped, ma il confine delle API non limita import o risorse Node.js.
Vault atomico e cifratura sono A2; contesti/deleghe e facade applicative sono A3.
La prova umana dello starter e il deployment del team hanno acceptance separate.

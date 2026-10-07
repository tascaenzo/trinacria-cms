# Vault A2: configurazione, claim e rotazione chiavi

A2 usa direttamente il contratto target, senza alias legacy o migrazioni automatiche.
Le chiavi del vault sono separate dai secret settings. Lo starter richiede un keyring
esplicito in ogni ambiente, compresi sviluppo, staging e production.

## Configurazione

| Variabile | Requisito |
| --- | --- |
| `CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID` | ID writer attivo, 1–64 caratteri alfanumerici/punto/trattino/underscore |
| `CMS_SECURE_PAYLOAD_KEYS_JSON` | Oggetto JSON ID → base64 canonico di esattamente 32 byte |
| `CMS_SECURE_PAYLOAD_RETENTION_MS` | Opzionale, intero positivo; default 86400000 (24 ore) |

Generare ogni chiave con `openssl rand -base64 32` o CSPRNG equivalente e iniettarla
tramite secret manager. Il validatore rifiuta lunghezze/base64 errati e placeholder
ovvi; non può dimostrare la casualità di una singola chiave. Non usare passphrase,
chiavi ripetute o materiale prevedibile. Non committare né riportare nei log valori reali.
Non esiste fallback verso `CMS_SETTINGS_MASTER_KEY`, master precedente o chiave di sviluppo.

In un host custom è disponibile `startCmsApp({ ..., securePayloads: { keyring:
{ activeKeyId, keys }, retentionMs } })`; le stringhe sono base64 canonico, oppure il
codice host può fornire `Uint8Array` di 32 byte. Il provider host personalizzato è
responsabile delle proprie garanzie. Il keyring viene copiato dalla crypto: cambiare
l'oggetto originale non aggiorna un processo già avviato. Applicare la configurazione
tramite deploy/restart di tutte le istanze.

## Contratto dei plugin

```ts
const record = await context.services.securePayloads.create({
  eventName: `${context.pluginId}:secure-event-payload-ready`,
  payloadType: "email-pack:send-email-request",
  schemaVersion: 1,
  requiredPermission: "email-pack:email:send",
  payload: { to: "recipient@example.com", templateKey: "example", variables: {} },
  authorizedConsumerPluginIds: ["email-pack"]
});
```

Create fissa producer all'identità runtime. Claim fissa consumer, richiede schemaVersion
e verifica eventName/payloadType/permission. Entrambi rifiutano campi producerPluginId o
consumerPluginId nel body. Revoke è riservato al producer del record e non riapre un
record già terminale. Il client non espone binding identità, repository o rotazione.
Il token `CORE_TOKENS.SECURE_EVENT_PAYLOAD_HOST` e `forPlugin(id)` sono composizione host
avanzata; i contesti plugin ricevono soltanto il client fissato alla propria identità.
Core ed Email compongono client con identità costanti nei propri moduli backend.

Create/claim/revoke restituiscono record sanitizzati, senza encryptedPayload, revisione
storage o purgeAt. Il claim è l'unico percorso plugin che restituisce plaintext.
La policy riceve soltanto metadati sanitizzati e immutabili, mai ciphertext o plaintext.
Lo starter risolve l’authorizer al claim, anche quando Core registra la policy dopo
la prima costruzione del vault. Policy/grant assenti non sono memorizzati come concessioni.
Il bus contiene soltanto ID/type/version: non pubblicare valori sensibili nel payload.

## Semantica del claim

1. Validare record e limiti strutturali prima della policy. Scadenza, stato terminale,
   contatore esaurito, destinatario o metadati incompatibili negano sempre. Allowlist
   assente richiede comunque la policy; allowlist vuota nega tutti.
2. Richiedere `allowed === true` dall'authorizer. Assenza, eccezione o risposta invalida
   nega. Le ragioni/testi arbitrari della policy non vengono restituiti.
3. Decifrare con il key ID del record e parsare JSON prima di consumare il contatore.
   Ciphertext/tag/JSON corrotti e chiavi sconosciute non consumano il claim.
4. Rileggere il clock dopo policy/decrypt e applicare CAS con owner/metadati/lista/scadenza,
   contatore/max/stato e revisione/ciphertext invarianti. Solo il vincitore ottiene dati.
5. CAS perso: rileggere e rivalutare tutto, policy inclusa; massimo tre tentativi, poi
   conflitto senza plaintext. Non esiste fallback sul record letto prima dell'update.

Claim/revoke del payload sono linearizzati dal CAS Mongo. Se revoke vince, il claim
non ottiene dati; se claim vince, il risultato già acquisito non viene annullato.
Una richiesta già accettata può terminare dopo un cambio della configurazione.
Valutazioni successive usano manifest, stato e destinatari correnti. Servizi conservati dopo unload/reload
non iniziano nuove richieste; una richiesta già iniziata può terminare.

La scadenza usa il clock host acquisito immediatamente prima del CAS. Una richiesta
inviata al DB prima del deadline può completare dopo; non è un orologio transazionale
server Mongo. Sincronizzare gli host. TTL è soltanto pulizia asincrona, mai autorizzazione.

## Retention

Il campo interno `purgeAt` è una Date BSON e ha indice TTL `expireAfterSeconds: 0`.
Alla creazione è expiration + retention; consumo finale/revoca anticipata fissano
transition time + retention. Un claim parziale conserva il deadline originario.
La marcatura expired o una revoca ripetuta non estendono il periodo. Per available con
scadenza già passata, l'autorizzazione nega anche se il TTL monitor non ha ancora cancellato.

Lo starter inizializza indici di dominio/TTL e ownership prima di usare il vault.
Non viene introdotto un audit persistente: diagnostica e record non sostituiscono C2.

## Procedura di rotazione

1. Inventariare chiavi richieste dai record vivi e dai backup da conservare. Verificare
   backup/ripristino e distribuzione dei secrets prima di cambiare i writer.
2. Aggiungere v2 al keyring di tutti i reader/writer, mantenendo active v1; deploy completo.
   Verificare che le istanze leggano entrambe le versioni. Non cambiare ancora il writer
   mentre esistono reader che conoscono soltanto v1.
3. Impostare active v2 e completare deploy/restart di tutte le istanze writer/worker.
   Verificare nuovi record con keyVersion v2; nessuna istanza deve continuare a scrivere v1.
4. Con build corrente e ambiente host/secrets iniettati, eseguire inventario in sola lettura:

   ```bash
   npm run build
   node scripts/rotate-secure-payloads.mjs --from-key-id v1
   ```

   `MONGO_URI` e le due variabili keyring devono essere configurati nell'ambiente.
   Il comando stampa soltanto conteggi, senza URI, record, ciphertext o chiavi.
   Non crea indici o ownership durante l'inventario; il layout precedente è rifiutato.
5. Avviare la rotazione esplicita:

   ```bash
   node scripts/rotate-secure-payloads.mjs --from-key-id v1 --apply
   ```

   Batch massimo 100 record, CAS con retry limitati; status/count/retention invariati.
   Un fallimento interrompe il comando lasciando validi i batch già completati; mantenere
   entrambe le chiavi, risolvere configurazione/corruzione/concorrenza e rilanciare.
   La ripetizione è idempotente. Nessun record o chiave viene cancellato dal comando.
6. Ripetere inventario e verificare conteggio v1 uguale a zero, writer tutti v2 e letture
   riuscite; il conteggio vivo non autorizza a eliminare v1 se serve a backup conservati.
7. Ritirare v1 soltanto dopo verifica del requisito backup. Aggiornare runbook/recovery e
   deploy dei reader senza v1; testare ripristino dei backup ancora supportati.

Record cifrati con il vecchio master o privi di revisione non sono migrati automaticamente.
Il recupero di dati di sviluppo richiede un piano esplicito, mapping chiave verificato e
backup, senza assegnare plaintext a un key ID diverso arbitrariamente.

## Errori disponibili

| Code | Significato |
| --- | --- |
| `secure_event_payload_claim_denied` | Reason strutturale o policy, senza contenuto sensibile |
| `secure_event_payload_claim_conflict` | CAS esaurito dopo tre tentativi, anche in rotazione |
| `secure_event_payload_invalid_ciphertext` | Cifratura o JSON non validi |
| `secure_event_payload_key_unavailable` | Keyring assente/invalido o ID non disponibile |
| `secure_event_payload_input_invalid` | Identità nel body, ID/metadati/limiti non validi |
| `secure_event_payload_configuration_invalid` | Clock/retention non validi |
| `secure_event_payload_unavailable` | Errore infrastrutturale redatto all'ingresso client |

Not-found sul client equivale a denied con reason not_found, senza ciphertext o eccezioni
raw. Reason include policy_missing/policy_denied/policy_error, expired, claim_limit,
status terminale, mismatch di metadati, consumer_not_authorized e invalid_record.

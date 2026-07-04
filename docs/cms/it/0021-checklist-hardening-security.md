# 0021 - Checklist hardening security

Questa checklist copre i rischi principali emersi dalla piattaforma plugin-first: eventi sensibili,
replay, escalation permessi, CSRF e leakage di secret.

## 1. Nessun token sensibile nei payload evento normali

Regola: eventi pubblici o normali non devono contenere token, link monouso, password, credenziali o
secret.

Consentito:

```json
{
  "securePayloadId": "secure_event_payloads:123",
  "payloadType": "email-pack:send-email-request",
  "schemaVersion": 1
}
```

Vietato:

```json
{
  "resetUrl": "https://cms.example.com/reset-password?token=raw-token"
}
```

Verifiche:

- i flussi reset password, verifica email e invito creano payload nel secure payload store;
- l'evento emesso e solo `core-pack:secure-event-payload-ready` con metadati;
- `maxClaims` e TTL sono impostati;
- il consumer autorizzato e esplicito (`email-pack` per email ufficiali);
- test automatici controllano che il token raw non appaia nel payload evento.

## 2. Replay protection

Superfici:

- signed plugin auth per settings/API owner-scoped;
- secure payload claim;
- token auth flow monouso.

Checklist:

- `core-pack:plugin_auth:max_skew_seconds` resta basso e coerente con clock dei server;
- `core-pack:plugin_auth:nonce_cache_max_entries` dimensionato per il traffico;
- nonce gia visti vengono rifiutati;
- token reset/verifica/invito sono hashati a riposo;
- token consumati non possono essere riusati;
- payload secure passa a `consumed` quando raggiunge `maxClaims`.

Comandi/test:

```bash
npm run test -w @trinacria-cms/core-pack
npm run test -w @trinacria-cms/kernel
```

## 3. Permission escalation

Regole:

- un plugin puo referenziare permessi propri nel manifest admin;
- accessi cross-plugin sensibili passano da grant esplicito;
- un grant deve essere granulare: producer, consumer, event, payload type, permission, access type;
- il backoffice deve mostrare solo operazioni consentite dal backend.

Checklist:

- `core-pack:security:plugin_access_grants` contiene solo grant necessari;
- grant non usati sono `denied` o rimossi;
- `email-pack` puo claimare solo `email-pack:send-email-request` con `email-pack:email:send`;
- plugin terzi non ricevono payload sensibili senza approvazione admin;
- route admin hanno `requiredPermission` o guard equivalente;
- ruoli baseline non includono wildcard non necessari.

## 4. CSRF

Rischio: cookie auth rende possibili mutazioni cross-site se l'origine non viene validata.

Checklist:

- `CMS_CSRF_PROTECTION=true`;
- `HTTP_CORS_ORIGINS` esplicito e senza wildcard;
- `CMS_CSRF_TRUSTED_ORIGINS` contiene solo frontend controllati;
- mutazioni cookie da origini esterne vengono rifiutate;
- integrazioni server-to-server usano Bearer o signed plugin auth.

Test esistenti:

```bash
npm run test -w @trinacria-cms/playground
```

## 5. Secret leakage in settings/API/log

Regole:

- settings `secret: true` non devono uscire dalle API normali;
- log non devono contenere password, JWT, reset token, invite token, verification URL o SMTP password;
- errori API devono usare codici e messaggi controllati, non dump di oggetti sensibili;
- valori secret devono essere cifrati o caricati da secret manager/runtime env.

Checklist settings:

- `email-pack:email:smtp_password` resta secret;
- `CMS_JWT_SECRET`, `CMS_SETTINGS_MASTER_KEY`, `OBSERVABILITY_TOKEN` non sono mai in settings pubbliche;
- endpoint settings mascherano i secret;
- reveal secret, se presente, richiede owner/plugin auth o admin guard forte.

Checklist log:

- `LOG_FORMAT=json` in production;
- request log non stampa body;
- error log non serializza payload secure;
- access log rumorosi sono disattivati o redatti;
- incident review controlla che non ci siano token in log collector.

## 6. Verification table

| Area | Check | Stato atteso |
| --- | --- | --- |
| Eventi sensibili | Reset password emette solo secure payload metadata | nessun token raw |
| Replay | nonce signed plugin auth riusato | rifiutato |
| Secure payload | claim non autorizzato | rifiutato |
| Permission escalation | plugin senza grant sensitive | denied/pending |
| CSRF | mutazione cookie da origine non trusted | `csrf_origin_rejected` |
| Settings secret | lettura SMTP password via API admin normale | mascherata |
| Log | errore flusso reset password | niente token raw |

## 7. Release gate

Non promuovere a production se uno di questi punti e falso:

- test core/kernel/playground verdi;
- checklist CORS/CSRF completa;
- secret runtime configurati fuori repository;
- backup/restore Mongo verificato;
- permission center revisionato;
- nessun token sensibile in eventi normali o log;
- osservabilita protetta da token.


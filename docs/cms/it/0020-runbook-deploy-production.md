# 0020 - Runbook deploy production

Questo runbook descrive il profilo minimo per portare Trinacria CMS in staging/production in modo
controllato. Non sostituisce hardening infrastrutturale del provider, ma definisce cio che deve
essere vero per l'applicazione.

## Stato attuale

Il progetto e pronto per staging controllato, non ancora per produzione pubblica senza E2E e runbook
operativo verificato. Prima di pubblicare:

- `npm run build` deve passare.
- `npm run test` deve passare.
- `/ready` deve restituire stato pronto.
- `/ops/checklist` deve essere accessibile solo con token osservabilita.
- Mongo deve avere backup e restore testati.

## Variabili `.env` richieste

### Runtime

| Variabile | Richiesta | Note |
| --- | --- | --- |
| `NODE_ENV=production` | si | Attiva profilo hardened. `staging` applica lo stesso profilo critico. |
| `MONGO_URI` | si | URI Mongo completo. Ha precedenza sulle variabili split. |
| `CMS_PUBLIC_ORIGIN` | consigliata | Origine pubblica API/CMS usata anche per link e CSRF trusted origins. |
| `VITE_CMS_API_BASE_URL` | consigliata | Base URL usata dal backoffice quando servito separatamente. |
| `LOG_FORMAT=json` | si | Log strutturati per collector esterno. |
| `CMS_INSTALLED=true` | post-install | Segnale operativo per checklist; non sostituisce lo stato DB. |

### HTTP, reverse proxy, CORS e CSRF

| Variabile | Richiesta | Note |
| --- | --- | --- |
| `HTTP_CORS_ORIGINS` | si | Lista CSV di origini esplicite. `*` e rifiutato in production. |
| `CMS_CSRF_TRUSTED_ORIGINS` | si per cookie auth | Lista CSV di origini autorizzate per mutazioni con cookie. |
| `CMS_CSRF_PROTECTION=true` | default production | Lasciare attivo se si usano cookie auth. |
| `HTTP_TRUST_PROXY=true` | solo dietro proxy trusted | Abilitare solo se il proxy imposta correttamente `x-forwarded-*`. |
| `CMS_OPENAPI_ENABLED=false` | consigliata | Default production: disabilitato. |
| `CMS_SWAGGER_ENABLED=false` | consigliata | Default production: disabilitato. |

### JWT e cookie auth

| Variabile | Richiesta | Note |
| --- | --- | --- |
| `CMS_JWT_SECRET` oppure `CMS_JWT_SECRET_FILE` | si | Secret forte, non placeholder, non committato. Preferire file secret. |
| `CMS_STRICT_JWT_SECRET_REQUIRED=true` | si | In production viene forzato a `true`. |
| `CMS_JWT_COOKIE_SECURE=true` | si | In production viene impostato se assente. |
| `CMS_JWT_COOKIE_SAME_SITE=lax` | default | Usare `none` solo con HTTPS e proxy/cookie cross-site corretti. |
| `CMS_JWT_ACCESS_COOKIE_NAME` | opzionale | Default `cms_access_token`. |
| `CMS_JWT_REFRESH_COOKIE_NAME` | opzionale | Default `cms_refresh_token`. |

### Settings e secret

| Variabile | Richiesta | Note |
| --- | --- | --- |
| `CMS_SETTINGS_MASTER_KEY` | si | Chiave per secret settings. Deve essere stabile tra restart. |
| `CMS_SETTINGS_MASTER_KEY_VERSION` | consigliata | Versione logica persistita con il ciphertext. |
| `CMS_SECURE_PAYLOAD_MASTER_KEY` | consigliata | Chiave separata per secure payload; se assente usa `CMS_SETTINGS_MASTER_KEY`. |

### Observability

| Variabile | Richiesta | Note |
| --- | --- | --- |
| `OBSERVABILITY_TOKEN` | si | Protegge `/metrics` e `/ops/checklist`. Deve essere trattato come secret. |

## Esempio `.env.production`

```bash
NODE_ENV=production
MONGO_URI=mongodb://cms_app:REPLACE_ME@mongo.internal:27017/trinacria_cms?authSource=admin
CMS_PUBLIC_ORIGIN=https://cms.example.com
VITE_CMS_API_BASE_URL=https://cms.example.com

HTTP_CORS_ORIGINS=https://admin.example.com,https://cms.example.com
CMS_CSRF_TRUSTED_ORIGINS=https://admin.example.com,https://cms.example.com
HTTP_TRUST_PROXY=true
CMS_CSRF_PROTECTION=true
CMS_OPENAPI_ENABLED=false
CMS_SWAGGER_ENABLED=false

CMS_JWT_SECRET_FILE=/run/secrets/cms_jwt_secret
CMS_STRICT_JWT_SECRET_REQUIRED=true
CMS_JWT_COOKIE_SECURE=true
CMS_JWT_COOKIE_SAME_SITE=lax

CMS_SETTINGS_MASTER_KEY=replace-with-runtime-secret
CMS_SETTINGS_MASTER_KEY_VERSION=v1
CMS_SECURE_PAYLOAD_MASTER_KEY=replace-with-runtime-secret

LOG_FORMAT=json
OBSERVABILITY_TOKEN=replace-with-runtime-secret
CMS_INSTALLED=true
```

Nota: `CMS_JWT_SECRET_FILE` e supportato dal playground. Per `CMS_SETTINGS_MASTER_KEY` e
`CMS_SECURE_PAYLOAD_MASTER_KEY`, usare il secret manager della piattaforma per iniettare valori come
variabili ambiente. Non committare mai valori reali.

## Mongo

Requisiti minimi:

- utente applicativo dedicato, non root;
- TLS o rete privata;
- replica set per produzione reale;
- backup automatici e restore testato;
- monitoring su connessioni, spazio disco, lock, slow queries;
- accesso amministrativo separato dall'utente applicativo.

Backup manuale:

```bash
mongodump \
  --uri "$MONGO_URI" \
  --archive="/backups/trinacria-$(date +%Y%m%d-%H%M%S).archive" \
  --gzip
```

Restore su ambiente di test:

```bash
mongorestore \
  --uri "$MONGO_RESTORE_URI" \
  --archive="/backups/trinacria-YYYYMMDD-HHMMSS.archive" \
  --gzip \
  --drop
```

Regola operativa: un backup non e valido finche non e stato ripristinato almeno una volta su un
database separato e verificato con `/ready`, `/health` e login admin.

## Reverse proxy

Il proxy deve:

- terminare TLS;
- inoltrare `Host`, `X-Forwarded-Proto`, `X-Forwarded-For`;
- non riscrivere cookie auth;
- applicare body size limit ragionevole;
- inoltrare tutte le route API al backend;
- per il backoffice statico, servire `index.html` come fallback per route client-side.

Esempio Nginx minimale:

```nginx
server {
  listen 443 ssl http2;
  server_name cms.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

Se il backoffice vive su `admin.example.com`, aggiungere quell'origine in `HTTP_CORS_ORIGINS` e
`CMS_CSRF_TRUSTED_ORIGINS`.

## CORS e CSRF

Production accetta solo origini esplicite. Checklist:

- `HTTP_CORS_ORIGINS` non contiene `*`.
- Ogni frontend che usa cookie auth e presente in `CMS_CSRF_TRUSTED_ORIGINS`.
- Le mutazioni via cookie da origini non trusted falliscono con `csrf_origin_rejected`.
- Le integrazioni server-to-server usano Bearer/signed plugin auth, non cookie browser.

## JWT secret

Regole:

- minimo 32 caratteri ad alta entropia;
- rotazione pianificata con logout globale atteso;
- mai in repository, log o screenshot;
- preferire secret manager o file mount;
- in production non usare fallback dev.

Dopo rotazione, invalidare sessioni precedenti e verificare:

```bash
curl -i https://cms.example.com/ready
curl -i https://cms.example.com/health
```

## Observability token

`/metrics` e `/ops/checklist` devono essere protetti:

```bash
curl -H "Authorization: Bearer $OBSERVABILITY_TOKEN" https://cms.example.com/metrics
curl -H "Authorization: Bearer $OBSERVABILITY_TOKEN" https://cms.example.com/ops/checklist
```

Senza token devono restituire errore non autorizzato. `/ready` resta pubblico per probe
infrastrutturali.

## Checklist pre-release

- [ ] `npm run build`
- [ ] `npm run test`
- [ ] `NODE_ENV=production`
- [ ] `HTTP_CORS_ORIGINS` esplicito
- [ ] `CMS_CSRF_TRUSTED_ORIGINS` esplicito se si usano cookie
- [ ] `CMS_JWT_SECRET` o `CMS_JWT_SECRET_FILE` forte
- [ ] `CMS_SETTINGS_MASTER_KEY` stabile e secret
- [ ] `CMS_SECURE_PAYLOAD_MASTER_KEY` stabile o consapevolmente condiviso con settings master key
- [ ] `OBSERVABILITY_TOKEN` configurato
- [ ] `/ready` ok
- [ ] `/health` ok o degraded spiegato
- [ ] `/ops/checklist` protetto e revisionato
- [ ] backup Mongo creato
- [ ] restore Mongo provato su ambiente separato
- [ ] login/logout admin provati
- [ ] settings provider email provati
- [ ] reset password provato senza token nei log/eventi pubblici

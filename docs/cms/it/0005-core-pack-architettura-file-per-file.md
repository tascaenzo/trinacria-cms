# 0005 - Core-pack file per file: users, ruoli, permessi, settings, modello embedded

Questo capitolo descrive la struttura di `packages/core-pack/src` dopo l'estensione authz avanzata.

## 1. Mappa package

- `modules/users/`: utenti
- `modules/roles/`: ruoli + grants embedded
- `modules/permissions/`: catalogo permessi
- `modules/security/`: provisioning, user access, authz, policy rules, API keys
- `modules/settings/`: definizioni, valori e segreti cifrati per plugin

## 2. Security module: file chiave

- `security-provisioning.service.ts`: sync manifest security
- `security/user-access/user-roles.schemas.ts` / `security/user-access/user-roles.repository.ts` (assegnazioni embedded in `users`)
- `security/role-policy-rules/role-policy-rules.schemas.ts` / `security/role-policy-rules/role-policy-rules.repository.ts`
- `security/user-access/user-access.service.ts`
- `security/user-access/user-access.controller.ts`
- `security/api-keys/api-keys.schemas.ts` / `security/api-keys/api-keys.repository.ts`
- `security/api-keys/api-key-hashing.service.ts`
- `security/api-keys/api-keys.service.ts`
- `security/api-keys/api-keys.controller.ts`
- `core-pack-authz.service.ts`
- `openapi-tags.ts`: catalogo tag OpenAPI centralizzato (tag `Security` e `Api Keys`)

## 3. Nuove responsabilita

1. gestire assegnazioni ruolo utente senza collection join (`users.roleAssignments[]`)
2. supportare policy rules role-based (`allow`/`deny`, wildcard, condizioni)
3. risolvere regole authz finali per utente
4. esporre `CORE_TOKENS.AUTHZ_SERVICE`
5. supportare configurazioni plugin (`settings`) con isolamento forte sui secrets
6. emettere credenziali macchina (`api_keys`) riusabili da SDK o chiamate REST standard

## 4. Entita security attuali

- `permissions`
- `roles`
- `role_policy_rules`
- `api_keys`

Relazioni embedded:

- `roles.permissionGrants[]` (sostituisce `role_grants`)
- `users.roleAssignments[]` (sostituisce `user_roles`)

## 5. Modulo settings: file chiave

- `settings.schemas.ts`: una sola entita `settings` con discriminatore `kind` (`definition`, `value`, `secret`) e relativi indici.
- `settings.service.ts`: logica applicativa (ownership key, fallback default, masking secrets).
- `settings/definitions/settings-definitions.repository.ts`: proiezione definitions sulla collection unificata.
- `settings/values/settings-values.repository.ts`: proiezione values sulla collection unificata.
- `settings/secrets/settings-secrets.repository.ts`: proiezione secrets sulla collection unificata.
- `settings/secrets/settings-secrets-crypto.service.ts`: cifratura/decifratura AES-256-GCM.
- `settings/auth/settings-plugin-auth.ts`: canonicalizzazione richiesta + firma HMAC-SHA256.
- `settings/auth/settings-plugin-auth-key-provider.ts`: contratto `PluginAuthKeyProvider` + provider default da env.
- `settings/auth/settings-plugin-auth.service.ts`: verifica timestamp/nonce/signature e anti-replay.
- `settings/auth/settings-plugin-auth.middleware.ts`: inserisce il caller plugin autenticato in `ctx.state`.
- `settings.controller.ts`: API REST e enforcement middleware sulle route sensibili.

## 6. Protocollo autenticazione chiamante plugin (settings)

Header richiesti:

- `x-cms-plugin-id`
- `x-cms-plugin-ts`
- `x-cms-plugin-nonce`
- `x-cms-plugin-signature`

Firma (concetto):

1. canonical string con `METHOD`, `PATH`, `timestamp`, `nonce`, `pluginId`, `sha256(body)`;
2. HMAC-SHA256 con secret condiviso per plugin;
3. server verifica firma + skew temporale + nonce non riutilizzato.

Configurazione runtime:

- `CMS_PLUGIN_AUTH_KEYS_JSON`: mappa `{ pluginId: secret }`
- `CMS_PLUGIN_AUTH_MAX_SKEW_SECONDS`: tolleranza clock (default 300s)
- `PluginAuthKeyProvider`: punto di estensione DI per leggere secret da Vault/KMS invece che da env.

Effetto pratico:

- nessun plugin puo impersonare un altro plugin sulle route settings protette;
- i secrets restano leggibili solo dal plugin owner (isolamento forte, non solo logico).

## 7. Conclusione

`core-pack` e ora un plugin IAM + configuration completo, con authz avanzato, provisioning manifest-driven e isolamento forte dei secrets tramite autenticazione firmata del caller plugin.

## 8. Modulo per modulo: service esposti e API esposte

### 8.1 Auth

Responsabilita:

- autenticazione JWT locale
- lettura utente autenticato
- emissione cookie `httpOnly`

Service esposti:

- `CORE_PACK_JWT_AUTH_SERVICE_TOKEN` -> `JwtAuthService`

API esposte:

| Metodo | Endpoint | Scopo | Auth |
| --- | --- | --- | --- |
| `POST` | `/v1/auth/login` | login email/password, emette access token + refresh token + cookie | pubblica |
| `GET` | `/v1/auth/me` | risolve utente autenticato | bearer JWT |
| `POST` | `/v1/auth/logout` | invalida lato client la sessione corrente e pulisce i cookie | bearer JWT |

### 8.2 Installation

Responsabilita:

- bootstrap prima installazione
- creazione admin iniziale
- persistenza stato installazione
- hashing password locale

Service esposti:

- `CORE_PACK_INSTALLATION_SERVICE_TOKEN` -> `InstallationService`
- `PASSWORD_HASHING_SERVICE_TOKEN` -> `PasswordHashingService`

API esposte:

| Metodo | Endpoint | Scopo | Auth |
| --- | --- | --- | --- |
| `GET` | `/v1/install/status` | stato installazione CMS | pubblica |
| `POST` | `/v1/install/bootstrap` | crea primo admin e completa installazione | pubblica, one-shot |

Nota strutturale:

- le credenziali locali sono mantenute in `local_credentials` e non nel record `users`;
- questo separa identita applicativa da meccanismo di login.

### 8.3 Users

Responsabilita:

- CRUD base utenti
- stato attivo/sospeso

Service esposti:

- `USERS_SERVICE_TOKEN` -> capability `users.service`

API esposte:

| Metodo | Endpoint | Scopo | Auth |
| --- | --- | --- | --- |
| `GET` | `/v1/users` | lista utenti | admin JWT |
| `GET` | `/v1/users/:id` | dettaglio utente | admin JWT |
| `POST` | `/v1/users` | crea utente | admin JWT |
| `PATCH` | `/v1/users/:id/status` | attiva o sospende utente | admin JWT |

### 8.4 Permissions

Responsabilita:

- catalogo permission key canoniche
- attivazione/disattivazione permission

Service esposti:

- `PERMISSIONS_SERVICE_TOKEN` -> capability `permissions.service`

API esposte:

| Metodo | Endpoint | Scopo | Auth |
| --- | --- | --- | --- |
| `GET` | `/v1/permissions` | lista permessi | admin JWT |
| `GET` | `/v1/permissions/:id` | dettaglio permesso | admin JWT |
| `POST` | `/v1/permissions` | crea permesso | admin JWT |
| `PATCH` | `/v1/permissions/:id/status` | attiva o disabilita permesso | admin JWT |

### 8.5 Roles

Responsabilita:

- catalogo ruoli
- permission grant embedded nel ruolo
- stato attivo/disabilitato del ruolo

Service esposti:

- `ROLES_SERVICE_TOKEN` -> capability `roles.service`

API esposte:

| Metodo | Endpoint | Scopo | Auth |
| --- | --- | --- | --- |
| `GET` | `/v1/roles` | lista ruoli | admin JWT |
| `GET` | `/v1/roles/:id` | dettaglio ruolo | admin JWT |
| `POST` | `/v1/roles` | crea ruolo | admin JWT |
| `PATCH` | `/v1/roles/:id/status` | attiva o disabilita ruolo | admin JWT |

### 8.6 Security

Responsabilita:

- assegnazione ruoli a utenti
- risoluzione effective permissions
- CRUD policy rules
- provisioning security dichiarata nel manifest
- motore authz esposto al kernel

Service esposti:

- `CORE_PACK_USER_ACCESS_SERVICE_TOKEN` -> `UserAccessService`
- `CORE_PACK_ROLE_POLICY_RULES_SERVICE_TOKEN` -> `RolePolicyRulesService`
- `CORE_PACK_AUTHZ_SERVICE_TOKEN` -> `CorePackAuthzService`
- `API_KEYS_SERVICE_TOKEN` -> `ApiKeysService`
- `CORE_PACK_SECURITY_PROVISIONING_SERVICE_TOKEN` -> `CorePackSecurityProvisioningService`
- `CORE_TOKENS.AUTHZ_SERVICE` -> alias pubblico verso `CorePackAuthzService`

API esposte:

| Metodo | Endpoint | Scopo | Auth |
| --- | --- | --- | --- |
| `GET` | `/v1/users/:id/roles` | lista assegnazioni ruolo utente | admin JWT |
| `POST` | `/v1/users/:id/roles` | assegna ruolo a utente | admin JWT |
| `DELETE` | `/v1/users/:id/roles/:roleCode` | rimuove ruolo da utente | admin JWT |
| `GET` | `/v1/users/:id/permissions` | effective permissions utente | admin JWT |
| `GET` | `/v1/roles/:roleCode/policy-rules` | lista policy rules di un ruolo | admin JWT |
| `POST` | `/v1/roles/:roleCode/policy-rules` | crea policy rule | admin JWT |
| `PATCH` | `/v1/roles/:roleCode/policy-rules/:ruleId` | aggiorna policy rule | admin JWT |
| `DELETE` | `/v1/roles/:roleCode/policy-rules/:ruleId` | elimina policy rule | admin JWT |
| `GET` | `/v1/api-keys` | lista API key emesse | admin JWT |
| `GET` | `/v1/api-keys/:id` | dettaglio metadata API key | admin JWT |
| `POST` | `/v1/api-keys` | crea una nuova API key | admin JWT |
| `POST` | `/v1/api-keys/:id/rotate` | ruota una API key esistente | admin JWT |
| `POST` | `/v1/api-keys/:id/revoke` | revoca una API key | admin JWT |

Nota strutturale:

- le API key ereditano ruoli, permission key e policy rules;
- `CorePackAuthzService` tratta il subject `api-key:<id>` come un caller macchina di primo livello;
- questo permette di usare lo stesso motore authz sia per utenti JWT sia per integrazioni server-to-server.

### 8.7 Settings

Responsabilita:

- definizioni settings
- valori espliciti o default
- segreti cifrati
- export snapshot plugin
- autenticazione firmata del caller plugin

Service esposti:

- `SETTINGS_SERVICE_TOKEN` -> capability `settings.service`
- `SETTINGS_PLUGIN_AUTH_SERVICE_TOKEN` -> `SettingsPluginAuthService`
- `SETTINGS_SECRETS_CRYPTO_SERVICE_TOKEN` -> `SettingsSecretsCryptoService`

API esposte:

| Metodo | Endpoint | Scopo | Auth |
| --- | --- | --- | --- |
| `GET` | `/v1/settings/definitions` | lista definizioni | bearer admin oppure signed plugin auth |
| `GET` | `/v1/settings/definitions/:key` | dettaglio definizione | bearer admin oppure signed plugin auth |
| `POST` | `/v1/settings/definitions` | crea/aggiorna definizione | signed plugin auth |
| `GET` | `/v1/settings/values/:key` | risolve valore o default | bearer admin oppure signed plugin auth |
| `PUT` | `/v1/settings/values/:key` | crea/aggiorna valore | signed plugin auth |
| `GET` | `/v1/settings/secrets/:key` | metadata secret mascherato | bearer admin oppure signed owner plugin |
| `PUT` | `/v1/settings/secrets/:key` | crea/aggiorna secret cifrato | signed plugin auth |
| `POST` | `/v1/settings/secrets/:key/reveal` | reveal del secret owner-only | signed plugin auth |
| `GET` | `/v1/settings/export/:pluginId` | export snapshot con secret mascherati | signed plugin auth |

Policy operativa aggiornata:

- il backoffice puo leggere definizioni, valori risolti e metadata secret mascherati;
- reveal, export e scritture restano owner-scoped tramite `SettingsPluginAuth`;
- ogni futura UX di scrittura deve restare plugin-aware e non puo trasformare il backoffice in un bypass dell'ownership plugin;
- riferimento operativo: `docs/cms/it/0013-settings-sicurezza-e-ownership-operativa.md`.

Bootstrap catalogo iniziale `core-pack`:

- `core-pack:site:name`
- `core-pack:site:url`
- `core-pack:cms:locale`
- `core-pack:cms:timezone`
- `core-pack:branding:tagline`
- `core-pack:branding:logo_url`
- `core-pack:features:editorial_workflow`

## 9. Stile di risposta HTTP del core-pack

Tutti i controller business del `core-pack` usano `createPluginApiResponder(CORE_PACK_PLUGIN_ID)`.

Questo produce envelope uniforme:

### 9.1 Success response

```json
{
  "data": {
    "id": "core-pack:users:abc123"
  },
  "meta": {
    "pluginId": "core-pack"
  }
}
```

### 9.2 List response

```json
{
  "data": [
    { "id": "1" },
    { "id": "2" }
  ],
  "meta": {
    "pluginId": "core-pack",
    "count": 2,
    "limit": 20,
    "offset": 0
  }
}
```

### 9.3 Error response

```json
{
  "error": {
    "code": "not_found",
    "message": "User \"missing\" not found"
  },
  "meta": {
    "pluginId": "core-pack"
  }
}
```

Significato operativo:

- `data`: payload dominio
- `error.code`: codice stabile per SDK/UI
- `error.message`: testo umano
- `error.details`: dettagli opzionali strutturati
- `meta.pluginId`: origine della risposta
- `meta.count`: cardinalita della lista
- `meta.limit` / `meta.offset`: eco paginazione

Come viene generata:

1. il controller valida `params`, `query`, `body`;
2. il service restituisce un valore dominio o lancia eccezione;
3. `responder.success(...)` o `responder.list(...)` genera l'envelope di successo;
4. `responder.fromError(...)` mappa errore -> `error.code` coerente;
5. `response(...)` viene usato solo quando servono header HTTP custom, per esempio `Set-Cookie` in `auth/login` e `auth/logout`.

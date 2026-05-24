# Settings core

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-22`

## Decisione

`settings` e il configuration registry sicuro della piattaforma CMS.

Conserva configurazioni core, plugin e secret. Ogni voce ha owner, namespace,
visibility, schema, audit e policy di accesso.

## Responsabilita

| Area               | Owner                      | Responsabilita                      |
| ------------------ | -------------------------- | ----------------------------------- |
| Registry contract  | `@trinacria-cms/core-pack` | Definizioni, valori, secret         |
| Signed plugin auth | `@trinacria-cms/core-pack` | Autenticazione owner plugin         |
| Encryption service | `@trinacria-cms/core-pack` | AES/KMS provider futuro             |
| Namespace policy   | `@trinacria-cms/kernel`    | Collisioni e canonical key          |
| Backoffice broker  | `packages/admin-kernel`    | Metadata, masking, azioni operative |

## Modello dati

```ts
export interface SettingDefinitionDocument {
  id: string;
  ownerPluginId: string;
  namespace: string;
  key: string;
  canonicalKey: string;
  type: "string" | "number" | "boolean" | "json" | "secret";
  visibility: "public" | "protected" | "secret";
  required: boolean;
  schema?: unknown;
  defaultValue?: unknown;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettingValueDocument {
  id: string;
  canonicalKey: string;
  ownerPluginId: string;
  value?: unknown;
  secretRef?: string;
  version: number;
  updatedAt: Date;
  updatedBy?: string;
}

export interface SettingSecretDocument {
  id: string;
  canonicalKey: string;
  ownerPluginId: string;
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: string;
  rotatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Contratti TypeScript target

```ts
export interface SettingsRegistry {
  define(definition: SettingDefinitionInput): Promise<SettingDefinition>;
  get(canonicalKey: string, actor: SettingsActor): Promise<SettingReadResult>;
  set(canonicalKey: string, value: unknown, actor: SettingsActor): Promise<void>;
  revealSecret(canonicalKey: string, actor: SettingsActor): Promise<string>;
  rotateSecret(canonicalKey: string, value: string, actor: SettingsActor): Promise<void>;
}

export interface SettingsActor {
  type: "admin" | "plugin";
  id: string;
  pluginId?: string;
  permissions?: string[];
}
```

## API HTTP target

| Method | Path                                         | Auth          | Permission                 |
| ------ | -------------------------------------------- | ------------- | -------------------------- |
| `GET`  | `/v1/settings/definitions`                   | admin bearer  | `core-pack:settings:read`  |
| `GET`  | `/v1/settings/values`                        | admin bearer  | `core-pack:settings:read`  |
| `PUT`  | `/v1/settings/values/{canonicalKey}`         | admin bearer  | `core-pack:settings:write` |
| `POST` | `/v1/settings/secrets/{canonicalKey}/reveal` | plugin signed | owner/policy               |
| `POST` | `/v1/settings/secrets/{canonicalKey}/rotate` | plugin signed | owner/policy               |

## DTO request/response

```ts
export interface SettingValueDto {
  canonicalKey: string;
  ownerPluginId: string;
  type: string;
  visibility: "public" | "protected" | "secret";
  value?: unknown;
  maskedValue?: string;
  version: number;
  updatedAt: string;
}

export interface UpdateSettingValueRequestDto {
  value: unknown;
}

export interface RotateSecretRequestDto {
  value: string;
}
```

## Storage Mongo

Collections:

| Collection                       | Unique index                  |
| -------------------------------- | ----------------------------- |
| `cms_core_settings_definitions`  | `{ canonicalKey: 1 }`         |
| `cms_core_settings_values`       | `{ canonicalKey: 1 }`         |
| `cms_core_settings_secrets`      | `{ canonicalKey: 1 }`         |
| `cms_core_settings_audit_events` | `{ canonicalKey: 1, at: -1 }` |

Canonical key:

```text
<ownerPluginId>.<namespace>.<key>
```

## Security e permission

### Classi di visibilita

| Visibilita  | Lettura valore       | Scrittura | Reveal secret     | Uso previsto                                  |
| ----------- | -------------------- | --------- | ----------------- | --------------------------------------------- |
| `public`    | admin, plugin        | owner     | N/A               | site name, locale, feature flag non sensibili |
| `protected` | admin, owner, policy | owner     | N/A               | config condivisa tra plugin, limiti, integraz |
| `secret`    | solo owner/policy    | owner     | solo owner/policy | API key, webhook secret, OAuth secret, token  |

### Regole

1. Solo l'owner puo scrivere una voce salvo delega esplicita.
2. Solo l'owner o una policy esplicita puo fare reveal di un secret.
3. Un plugin non puo leggere configurazioni `protected` o `secret` di altri plugin senza capability/policy.
4. Le chiamate plugin-to-core per reveal o scrittura sensibile devono essere signed.
5. Ogni reveal, write, rotation e failed access genera audit.
6. Il backoffice mostra metadata e valore mascherato. Non diventa owner implicito dei secret.
7. Le API admin usano bearer token con permission `core-pack:settings:read` / `core-pack:settings:write`.

### Audit

Ogni operazione produce un audit event con:

- canonical key
- attore (admin ID o plugin ID)
- operazione (read, write, reveal, rotate)
- esito
- timestamp

## Eventi

### Eventi di settings

| Nome canonico                   | Owner     | Visibility | Delivery | Payload                                 | Quando                    |
| ------------------------------- | --------- | ---------- | -------- | --------------------------------------- | ------------------------- |
| `core.settings.defined`         | core-pack | `audit`    | `sync`   | `{ canonicalKey, ownerPluginId, type }` | nuova definition          |
| `core.settings.value.set`       | core-pack | `audit`    | `sync`   | `{ canonicalKey, version, actorId }`    | valore aggiornato         |
| `core.settings.secret.revealed` | core-pack | `audit`    | `sync`   | `{ canonicalKey, actorId }`             | reveal secret             |
| `core.settings.secret.rotated`  | core-pack | `audit`    | `sync`   | `{ canonicalKey, keyVersion, actorId }` | rotazione secret          |
| `core.settings.access_denied`   | core-pack | `audit`    | `sync`   | `{ canonicalKey, actorId, reason }`     | tentativo non autorizzato |

### Delivery e retry

- Tutti `sync` (in-process).
- Nessun retry automatico: se la pubblicazione fallisce, l'errore e loggato ma l'operazione settings non viene bloccata.
- Idempotency: le operazioni di set/rotate sono gia idempotenti per design (versione incrementale).
- Audit policy: tutti gli eventi settings sono `audit` e persistiti in `cms_core_audit_events`.

## Errori

| Code                            | HTTP | Quando                 |
| ------------------------------- | ---- | ---------------------- |
| `settings_definition_invalid`   | 400  | definition non valida  |
| `settings_key_not_found`        | 404  | canonical key assente  |
| `settings_access_denied`        | 403  | actor non autorizzato  |
| `settings_secret_required`      | 400  | valore secret mancante |
| `settings_secret_reveal_denied` | 403  | reveal non autorizzato |

## Lifecycle

Le definitions dichiarate dai plugin vengono provisionate dopo il load plugin.
La rimozione plugin non cancella automaticamente valori o secret: li marca come
orphaned o inactive per evitare perdita dati.

## Compatibilita e versioning

- `canonicalKey` e persistente. Rename richiede alias o migration esplicita.
- `schema` puo evolvere solo in modo compatibile (aggiunta campi opzionali) o con migration.
- Cambi breaking richiedono version bump del plugin che possiede la definition.
- Nuovi tipi `type` possono essere aggiunti. Rimuovere un tipo esistente e breaking.
- I secret cifrati con chiave precedente restano decifrabili fino a rotazione della chiave.

## Acceptance criteria

- schema e collection sono definiti
- classi visibility sono operative
- reveal/rotate hanno policy chiare
- backoffice broker e non owner secret
- event/audit model e definito

## Out of scope

- KMS obbligatorio nella prima implementazione
- UI visuale avanzata per tutti i plugin
- sincronizzazione multi-region

## Gap rispetto al codice attuale

- Settings, secrets e signed access esistono gia in `core-pack`.
- Serve riallineare naming `settings` -> configuration registry nelle API/docs.
- Serve audit trasversale via event bus.

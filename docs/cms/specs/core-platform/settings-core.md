# Settings core

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-20`

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

- `public`: leggibile da admin e plugin autorizzati.
- `protected`: richiede permission/policy.
- `secret`: ciphertext at-rest, reveal solo a owner plugin o policy esplicita.
- il backoffice non fa reveal diretto come owner implicito.
- ogni reveal/rotate/write produce audit.

## Eventi

| Evento                          | Visibility | Quando            |
| ------------------------------- | ---------- | ----------------- |
| `core.settings.defined`         | `audit`    | nuova definition  |
| `core.settings.value.set`       | `audit`    | valore aggiornato |
| `core.settings.secret.revealed` | `audit`    | reveal secret     |
| `core.settings.secret.rotated`  | `audit`    | rotazione secret  |

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

`canonicalKey` e persistente. Rename richiede alias o migration esplicita.
`schema` puo evolvere solo in modo compatibile o con migration.

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

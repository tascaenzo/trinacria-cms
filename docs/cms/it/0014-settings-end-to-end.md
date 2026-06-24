# 0014 - Settings end-to-end

## Obiettivo

Descrivere il dominio `settings` da un capo all'altro: modello dati, policy di sicurezza, endpoint HTTP, SDK ufficiale, flusso backoffice e utilizzo lato plugin owner.

Questa pagina consolida il risultato operativo di `M2`.

## 1. Modello del dominio

Il dominio `settings` usa una collection unificata con tre proiezioni logiche:

- `definition`: contratto del setting, con `schema`, `defaultValue`, `status`, `category`;
- `value`: valore esplicito non-secret scritto dal plugin owner;
- `secret`: valore sensibile cifrato a riposo e visibile solo come metadata mascherato fuori dal reveal owner-only.

Ogni chiave deve rispettare il formato:

`<pluginId>:<domain>:<name>`

Esempi canonici:

- `core-pack:site:name`
- `core-pack:site:url`
- `core-pack:cms:locale`
- `core-pack:cms:timezone`
- `core-pack:branding:logo_url`

L'ownership deriva dal prefisso `pluginId` della chiave.

## 2. Superfici di lettura e scrittura

### Definitions

Rappresentano il catalogo visibile del dominio configurazione:

- chiave;
- plugin owner;
- categoria;
- descrizione;
- schema JSON-like;
- default;
- stato.

### Values risolti

Lettura di un setting non-secret:

- restituisce il valore esplicito se presente;
- altrimenti restituisce il default definito nella definition;
- espone `source = value | default`.

### Secrets metadata

La superficie leggibile dal backoffice e dalle integrazioni autorizzate non contiene mai il plaintext.

Sono esposti solo:

- `algorithm`
- `keyVersion`
- `maskedValue`
- timestamp e metadata operativi

### Reveal

Il reveal del plaintext e una operazione separata e owner-only.

### Export

L'export snapshot di un namespace plugin restituisce:

- definitions;
- values;
- secrets metadata mascherati.

Non restituisce mai secret in chiaro.

## 3. Policy di accesso

Riferimento decisionale: `0013 - Settings: sicurezza e ownership operativa`.

Matrice sintetica:

| Operazione                      | Admin bearer | Plugin signed owner | Plugin signed non-owner |
| ------------------------------- | ------------ | ------------------- | ----------------------- |
| List/get definitions            | si           | si                  | si                      |
| Get grouped settings forms      | si           | si                  | si                      |
| Patch grouped valori non-secret | si           | si                  | no                      |
| Get resolved value              | si           | si                  | si                      |
| Get masked secret metadata      | si           | si                  | no                      |
| Write definition/secret         | no           | si                  | no                      |
| Reveal secret                   | no           | si                  | no                      |
| Export plugin snapshot          | no           | si                  | no                      |

Conseguenza operativa:

- il backoffice puo salvare setting attivi, mutabili e non-secret tramite form raggruppati autenticati come admin;
- definitions, secrets, reveal plaintext ed export snapshot restano operazioni owner-scoped;
- le chiavi runtime tecniche del core restano disponibili al backend ma sono nascoste dal workspace principale dei settings.

## 4. Endpoint HTTP

| Metodo  | Endpoint                           | Auth                                    | Note                                     |
| ------- | ---------------------------------- | --------------------------------------- | ---------------------------------------- |
| `GET`   | `/v1/settings/definitions`         | bearer admin oppure plugin signed       | catalogo definizioni                     |
| `GET`   | `/v1/settings/definitions/:key`    | bearer admin oppure plugin signed       | dettaglio definizione                    |
| `POST`  | `/v1/settings/definitions`         | plugin signed owner                     | upsert definition                        |
| `GET`   | `/v1/settings/groups`              | bearer admin oppure plugin signed       | form impostazioni raggruppati            |
| `GET`   | `/v1/settings/groups/:groupId`     | bearer admin oppure plugin signed       | form impostazioni risolto                |
| `PATCH` | `/v1/settings/groups/:groupId`     | bearer admin oppure plugin signed owner | patch valori non-secret raggruppati      |
| `GET`   | `/v1/settings/values/:key`         | bearer admin oppure plugin signed       | valore risolto                           |
| `PUT`   | `/v1/settings/values/:key`         | bearer admin oppure plugin signed owner | upsert valore non-secret                 |
| `GET`   | `/v1/settings/secrets/:key`        | bearer admin oppure plugin signed owner | metadata mascherati                      |
| `PUT`   | `/v1/settings/secrets/:key`        | plugin signed owner                     | upsert secret cifrato                    |
| `POST`  | `/v1/settings/secrets/:key/reveal` | plugin signed owner                     | plaintext owner-only                     |
| `GET`   | `/v1/settings/export/:pluginId`    | plugin signed owner                     | snapshot namespace con secret mascherati |

Errori attesi:

- `401` quando manca o fallisce l'autenticazione bearer/plugin signed;
- `403` quando il caller autenticato non possiede il namespace richiesto;
- `404` quando la risorsa settings richiesta non esiste.

## 5. Protocollo signed plugin caller

Le route owner-scoped richiedono:

- `x-cms-plugin-id`
- `x-cms-plugin-ts`
- `x-cms-plugin-nonce`
- `x-cms-plugin-signature`

La firma viene calcolata dal plugin owner sul metodo, path, timestamp, nonce e body canonico.

Il backend applica:

- verifica secret del plugin caller;
- controllo skew temporale;
- anti-replay su `nonce`;
- verifica ownership della chiave target.

## 6. Esempio HTTP: scrittura valore non-secret

Richiesta:

```http
PUT /v1/settings/values/core-pack:site:name
x-cms-plugin-id: core-pack
x-cms-plugin-ts: 1775460000
x-cms-plugin-nonce: 7dd0a1c4
x-cms-plugin-signature: <firma-calcolata-dal-plugin>
content-type: application/json

{
  "value": "Trinacria Editorial",
  "updatedBy": "core-pack:init"
}
```

Risposta:

```json
{
  "data": {
    "id": "plugin_core_pack__settings:42",
    "key": "core-pack:site:name",
    "ownerPluginId": "core-pack",
    "value": "Trinacria Editorial",
    "version": 1,
    "updatedBy": "core-pack:init",
    "createdAt": "2026-04-06T10:00:00.000Z",
    "updatedAt": "2026-04-06T10:00:00.000Z"
  },
  "meta": {
    "pluginId": "core-pack"
  }
}
```

## 7. Esempio HTTP: reveal secret

Richiesta:

```http
POST /v1/settings/secrets/core-pack:integrations:stripe_api_key/reveal
x-cms-plugin-id: core-pack
x-cms-plugin-ts: 1775460000
x-cms-plugin-nonce: 58af1b0d
x-cms-plugin-signature: <firma-calcolata-dal-plugin>
```

Risposta:

```json
{
  "data": {
    "key": "core-pack:integrations:stripe_api_key",
    "value": "sk_live_xxx"
  },
  "meta": {
    "pluginId": "core-pack"
  }
}
```

Questa response non deve mai essere esposta dal backoffice admin generico.

## 8. SDK ufficiale

Metodi principali del namespace `cms.settings`:

- `listSettingsGroups`
- `getSettingsGroupById`
- `upsertSettingsGroupValues`
- `listSettingDefinitions`
- `getSettingDefinitionByKey`
- `getSettingValueByKey`
- `getSettingSecretMetadata`
- `upsertSettingDefinition`
- `upsertSettingValue`
- `upsertSettingSecret`
- `revealSettingSecret`
- `exportPluginSettings`

Esempio lettura:

```ts
const response = await cms.settings.getSettingValueByKey({
  path: { key: "core-pack:site:name" }
});

console.log(response.data.value);
```

Esempio scrittura form raggruppato:

```ts
await cms.settings.upsertSettingsGroupValues({
  path: { groupId: "core-pack-general-settings" },
  body: {
    values: {
      "core-pack:site:name": "Trinacria Editorial",
      "core-pack:site:url": "https://cms.example.com"
    },
    updatedBy: "backoffice"
  }
});
```

Esempio scrittura low-level owner-signed:

```ts
await cms.settings.upsertSettingValue(
  {
    path: { key: "core-pack:site:name" },
    body: {
      value: "Trinacria Editorial",
      updatedBy: "core-pack:init"
    }
  },
  {
    headers: {
      "x-cms-plugin-id": "core-pack",
      "x-cms-plugin-ts": "<unix-ts>",
      "x-cms-plugin-nonce": "<nonce>",
      "x-cms-plugin-signature": "<signature>"
    }
  }
);
```

Nota:

- l'SDK tipizza anche le operazioni sensibili;
- resta responsabilita del plugin caller calcolare e iniettare gli header signed.

## 9. Backoffice

La pagina `settings` del backoffice ora supporta:

- filtro per plugin owner;
- overview CMS con site name, public URL, locale e timezone;
- workspace modale con form raggruppati;
- barra di salvataggio fissa in basso per setting attivi, mutabili e non-secret;
- chiavi core tecniche nascoste, incluse auth lockout, cookie JWT, cache e policy cifratura.

Il flusso operativo:

1. l'operatore apre una sezione settings come Generale, Branding o Funzionalita;
2. modifica i campi visibili;
3. il backoffice valida e salva i valori non-secret;
4. le impostazioni runtime tecniche restano gestite da configurazione backend, variabili ambiente o tooling plugin dedicato.

Il browser admin non rivela e non scrive plaintext secret.

## 10. Bootstrap catalogo core-pack

Il `core-pack` provisiona in `onInit` un catalogo iniziale idempotente:

- `core-pack:site:name`
- `core-pack:site:url`
- `core-pack:cms:locale`
- `core-pack:cms:timezone`
- `core-pack:branding:tagline`
- `core-pack:branding:logo_url`
- `core-pack:features:editorial_workflow`

Questo serve a:

- rendere operativa la panoramica CMS;
- validare il dominio con casi reali;
- offrire un catalogo minimo stabile per SDK e backoffice.

## 11. Debugging operativo

Checklist rapida:

1. `GET /v1/settings/groups` per verificare i gruppi esposti agli operatori.
2. `GET /v1/settings/groups/:groupId` per ispezionare i campi risolti di un gruppo.
3. `GET /v1/settings/definitions` per verificare che una definition low-level esista e sia `active`.
4. `GET /v1/settings/values/:key` per capire se il valore arriva da `value` o `default`.
5. `GET /v1/settings/secrets/:key` per verificare presenza del secret, `keyVersion` e ultimo update.
6. Se una write signed owner fallisce con `403`, controllare il namespace della chiave rispetto a `x-cms-plugin-id`.
7. Se una write signed owner fallisce con `401`, controllare skew temporale, nonce, secret del plugin e firma.

## 12. File chiave

- `packages/core-pack/src/modules/settings/settings.controller.ts`
- `packages/core-pack/src/modules/settings/settings.service.ts`
- `packages/core-pack/src/modules/settings/settings.bootstrap.ts`
- `packages/core-pack/src/modules/settings/auth/*`
- `packages/sdk/openapi/trinacria-cms.openapi.json`
- `packages/sdk/src/generated/settings.gen.ts`
- `packages/admin-kernel/src/pages/settings/settings-page.tsx`
- `packages/admin-kernel/src/pages/settings/settings-page.utils.ts`

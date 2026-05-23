# API e SDK contract

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-22`

## Decisione

Le API core e plugin devono usare envelope coerente, error model stabile,
OpenAPI snapshot e SDK generato.

## Responsabilita

| Area           | Owner               | Responsabilita               |
| -------------- | ------------------- | ---------------------------- |
| API envelope   | `kernel`            | `data`/`error`/`meta`        |
| OpenAPI        | `kernel` + packages | snapshot contract            |
| SDK generation | `packages/sdk`      | client generato              |
| Backoffice SDK | `admin-kernel`      | consumo SDK e parsing errori |

## Modello dati

```ts
export interface ApiSuccessResponse<TData> {
  data: TData;
  meta?: ApiResponseMeta;
  requestId?: string;
}

export interface ApiErrorResponse {
  error: ApiError;
  meta?: ApiResponseMeta;
  requestId?: string;
}
```

## Contratti TypeScript target

```ts
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponseMeta {
  pluginId?: string;
  count?: number;
  limit?: number;
  offset?: number;
  nextCursor?: string;
}
```

## API HTTP target

Regole:

- tutte le API `v1` usano JSON envelope
- errori non tornano payload raw
- endpoint protetti dichiarano bearer auth in OpenAPI
- API plugin devono dichiarare owner plugin e tag OpenAPI

## DTO request/response

Ogni DTO deve essere:

- serializzabile JSON
- documentato in OpenAPI
- compatibile con SDK generated
- senza tipi runtime non rappresentabili

## Storage Mongo

Nessuno storage diretto. Questa specifica governa contratti API.

## Security e permission

### Regole

1. OpenAPI deve esporre scheme reali:
   - bearer admin auth
   - plugin signed auth dove richiesto
2. Le API protette dichiarano la permission richiesta nell'OpenAPI operation.
3. L'SDK generato non deve includere chiavi o secret.
4. L'envelope `ApiErrorResponse` non espone stack trace o dettagli interni.
5. Le API pubbliche (es. health, install state) non richiedono auth e sono documentate come tali.

### Audit

- Le API che espongono dati sensibili (audit events, secret operations) registrano l'accesso negli audit events.
- L'SDK non ha accesso diretto agli audit events - passa dalle API core.

## Eventi

### Eventi di API contract

| Nome canonico                    | Owner     | Visibility | Delivery | Payload                                     | Quando                       |
| -------------------------------- | --------- | ---------- | -------- | ------------------------------------------- | ---------------------------- |
| `core.api.contract.changed`      | kernel    | `audit`    | `sync`   | `{ area, change, version }`                 | breaking change API          |
| `core.api.sdk.generated`         | kernel    | `audit`    | `sync`   | `{ version, endpointCount, timestamp }`     | SDK rigenerato               |

### Delivery e retry

- Tutti `sync` (in-process).
- Nessun retry automatico.
- Idempotency: non richiesta. Gli eventi di API contract sono puramente diagnostici.
- Audit policy: eventi persistiti in `cms_core_audit_events`.

## Errori

Error code stabili:

```text
<area>_<reason>
```

Esempi:

- `plugin_not_found`
- `settings_access_denied`
- `security_permission_invalid`

## Lifecycle

1. Il backend espone nuove API o modifica DTO esistenti.
2. Viene generato lo snapshot OpenAPI (`npm run sdk:snapshot`).
3. Lo snapshot viene validato per breaking changes (`npm run sdk:check`).
4. L'SDK viene rigenerato (`npm run sdk:generate`).
5. Il changelog operativo documenta le modifiche.
6. Se il cambiamento e breaking, viene emesso `core.api.contract.changed`.
7. Non modificare a mano `packages/sdk/src/generated/*`.

Regole:
- Lo snapshot OpenAPI e la fonte di verita per l'SDK.
- Breaking changes richiedono major version dell'API.
- Lo snapshot deve essere committato nel repository.
- La generazione SDK e automatica via CI dopo merge su branch principale.

## Compatibilita e versioning

- aggiungere campi opzionali e compatibile
- rimuovere o rinominare campi e breaking
- cambiare significato di enum e breaking
- nuovi endpoint sono additive

## Acceptance criteria

- envelope applicato a tutte le API
- error code documentati
- OpenAPI/SDK workflow definito
- auth scheme coerenti

## Out of scope

- GraphQL
- SDK multi-linguaggio
- versioning `/v2`

## Gap rispetto al codice attuale

- Envelope helper esiste.
- SDK workflow esiste.
- Serve copertura specifica per API plugin future.

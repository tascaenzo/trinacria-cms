# API e SDK contract

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-20`

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

OpenAPI deve esporre scheme reali:

- bearer admin auth
- plugin signed auth dove richiesto

## Eventi

Breaking change API produce changelog operativo e, se necessario, evento
`core.api.contract.changed` in ambiente diagnostico.

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

Flusso canonico dopo cambio contratto backend:

```bash
npm run sdk:snapshot
npm run sdk:generate
npm run sdk:check
```

Non modificare a mano `packages/sdk/src/generated/*`.

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

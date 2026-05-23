# Observability e operations core

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-22`

## Decisione

Il core espone health, diagnostics, runtime events, audit operativo e operation
feedback per rendere il CMS gestibile in backoffice e API.

Decisione chiusa: il kernel possiede runtime diagnostics e runtime events.
`core-pack` possiede lo storage audit centralizzato (`cms_core_audit_events`) e
materializza gli audit events prodotti da kernel e plugin.

## Responsabilita

| Area            | Owner             | Responsabilita               |
| --------------- | ----------------- | ---------------------------- |
| Health snapshot | `kernel`          | runtime, db, dependencies    |
| Runtime events  | `kernel`          | plugin lifecycle diagnostics |
| Audit events    | `core-pack`       | storage audit centralizzato  |
| Audit producers | `kernel` + plugin | emissione eventi audit       |
| Admin feedback  | `admin-kernel`    | UI operation result          |

## Modello dati

```ts
export interface CoreOperationEvent {
  id: string;
  type: string;
  ownerPluginId?: string;
  actorId?: string;
  severity: "info" | "warning" | "error";
  payload: Record<string, unknown>;
  createdAt: Date;
}
```

## Contratti TypeScript target

```ts
export interface CoreHealthSnapshot {
  ok: boolean;
  checkedAt: Date;
  runtime: { ok: boolean; loadedPlugins: number; failedPlugins: number };
  mongo: { ok: boolean; reason?: string };
  dependencies: PluginDependencyGraphSnapshot;
}
```

## API HTTP target

| Method | Path                      | Permission               |
| ------ | ------------------------- | ------------------------ |
| `GET`  | `/v1/system/health`       | none/admin optional      |
| `GET`  | `/v1/system/events`       | `core-pack:plugins:read` |
| `GET`  | `/v1/system/audit-events` | `core-pack:audit:read`   |

## DTO request/response

```ts
export interface OperationEventDto {
  id: string;
  type: string;
  severity: "info" | "warning" | "error";
  ownerPluginId?: string;
  actorId?: string;
  payload: Record<string, unknown>;
  createdAt: string;
}
```

## Storage Mongo

Collections:

- `cms_kernel_plugin_runtime_events`
- `cms_core_audit_events`

Ownership:

- `cms_kernel_plugin_runtime_events`: kernel
- `cms_core_audit_events`: core-pack

Indici:

| Collection              | Index                           |
| ----------------------- | ------------------------------- |
| `cms_core_audit_events` | `{ createdAt: -1 }`             |
| `cms_core_audit_events` | `{ type: 1, createdAt: -1 }`    |
| `cms_core_audit_events` | `{ actorId: 1, createdAt: -1 }` |

## Security e permission

### Accesso

| Endpoint                      | Permission                 | Chi puo fare |
| ----------------------------- | -------------------------- | ------------ |
| `GET /v1/system/health`       | nessuna (pubblico ridotto) | anyone       |
| `GET /v1/system/events`       | `core-pack:plugins:read`   | admin bearer |
| `GET /v1/system/audit-events` | `core-pack:audit:read`     | admin bearer |

### Regole

1. Health endpoint pubblico restituisce solo stato sintetico (ok/fail). Dettagli completi richiedono admin permission.
2. Gli eventi di runtime sono accessibili solo ad admin con `core-pack:plugins:read`.
3. Gli audit events sono accessibili solo ad admin con `core-pack:audit:read`.
4. Le operazioni di audit non devono generare eventi di audit ricorsivi (no loop).
5. La retention dei dati e configurabile per environment.

### Audit

- L'accesso agli audit events e tracciato come operazione sensibile.
- La modifica della retention policy richiede permission `core-pack:settings:write`.

## Eventi

### Eventi di observability

| Nome canonico                          | Owner     | Visibility | Delivery | Payload                                      | Quando                  |
| -------------------------------------- | --------- | ---------- | -------- | -------------------------------------------- | ----------------------- |
| `core.observability.health.changed`    | core-pack | `audit`    | `sync`   | `{ status, previousStatus, details }`        | health snapshot changes |
| `core.observability.audit.stored`      | core-pack | `audit`    | `sync`   | `{ eventType, actorId, success }`            | audit event persistito  |
| `core.observability.retention.updated` | core-pack | `audit`    | `sync`   | `{ collection, oldRetention, newRetention }` | retention modificata    |

### Regola anti-loop

Gli eventi di audit non producono nuovi eventi di audit. Se `core.observability.audit.stored`
fallisce, l'errore e loggato ma non viene generato un secondo evento.

### Delivery e retry

- Tutti `sync` (in-process).
- Nessun retry automatico per eventi di observability.
- Idempotency: non richiesta. Gli eventi di audit sono append-only.
- Audit policy: gli eventi di observability sono persistiti in `cms_core_audit_events` con retention configurabile (default 90 giorni).

## Errori

| Code                          | HTTP | Quando                |
| ----------------------------- | ---- | --------------------- |
| `observability_access_denied` | 403  | permesso mancante     |
| `health_check_failed`         | 500  | check interno fallito |

## Lifecycle

1. Il kernel e core-pack producono eventi di runtime e audit durante le operazioni.
2. Gli eventi vengono raccolti e persistiti nelle rispettive collection.
3. Runtime events: retention default 30 giorni o 1.000 eventi per plugin, configurabile.
4. Audit events: retention default 90 giorni, configurabile via configuration registry.
5. La retention viene applicata tramite TTL index o job periodico.
6. Health snapshot viene generato a ogni richiesta `GET /v1/system/health`.
7. Eventi precedenti alla retention vengono rimossi automaticamente o archiviati.

## Compatibilita e versioning

- Event `type` e payload devono essere versionabili. Payload non compatibili richiedono nuovo event type o `version`.
- Nuovi `type` di eventi osservabili possono essere aggiunti senza breaking.
- Rimuovere o rinominare un event type esistente e breaking per i consumer.
- Health snapshot DTO puo ricevere nuovi campi opzionali.
- La struttura di `CoreOperationEvent` puo evolvere con nuovi campi non obbligatori.

## Acceptance criteria

- health snapshot e definito
- audit/runtime event storage definito
- permission e retention chiarite
- API diagnostics definite

## Out of scope

- integrazione Prometheus/OTel obbligatoria
- SIEM esterno
- tracing distribuito completo

## Gap rispetto al codice attuale

- Health e plugin events esistono.
- Audit trasversale va consolidato in `core-pack` come storage centralizzato,
  mantenendo il kernel come produttore di runtime/audit events.

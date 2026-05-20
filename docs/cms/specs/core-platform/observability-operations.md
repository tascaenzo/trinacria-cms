# Observability e operations core

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-20`

## Decisione

Il core espone health, diagnostics, runtime events, audit operativo e operation
feedback per rendere il CMS gestibile in backoffice e API.

## Responsabilita

| Area            | Owner              | Responsabilita               |
| --------------- | ------------------ | ---------------------------- |
| Health snapshot | `kernel`           | runtime, db, dependencies    |
| Runtime events  | `kernel`           | plugin lifecycle diagnostics |
| Audit events    | `core-pack`/kernel | security/settings/admin ops  |
| Admin feedback  | `admin-kernel`     | UI operation result          |

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

Indici:

| Collection              | Index                           |
| ----------------------- | ------------------------------- |
| `cms_core_audit_events` | `{ createdAt: -1 }`             |
| `cms_core_audit_events` | `{ type: 1, createdAt: -1 }`    |
| `cms_core_audit_events` | `{ actorId: 1, createdAt: -1 }` |

## Security e permission

Health pubblico puo essere ridotto. Dettagli runtime/audit richiedono admin
permission.

## Eventi

Observability produce eventi audit e diagnostics, ma deve evitare loop infiniti:
gli eventi di audit non riemettono se stessi.

## Errori

| Code                          | HTTP | Quando                |
| ----------------------------- | ---- | --------------------- |
| `observability_access_denied` | 403  | permesso mancante     |
| `health_check_failed`         | 500  | check interno fallito |

## Lifecycle

Runtime events sono append-only/bounded. Audit events sono append-only con
retention configurabile.

## Compatibilita e versioning

Event `type` e payload devono essere versionabili. Payload non compatibili
richiedono nuovo event type o `version`.

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
- Audit trasversale va consolidato.

# Plugin packaging e discovery

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: low-level specification
- Ultimo aggiornamento: `2026-05-20`

## Decisione

Un plugin e un package npm/workspace con entrypoint esplicito e manifest
validabile. La prima fase supporta discovery locale/configurata, non marketplace
remoto.

## Responsabilita

| Area           | Owner  | Responsabilita                   |
| -------------- | ------ | -------------------------------- |
| Package shape  | plugin | exports e manifest               |
| Discovery      | kernel | local/configured plugin loading  |
| Compatibility  | kernel | version range e dependency check |
| Enable/disable | kernel | stato runtime persistito         |

## Modello dati

```ts
export interface PluginDiscoverySource {
  type: "workspace" | "package" | "local-path";
  name: string;
  entrypoint: string;
  enabledByDefault?: boolean;
}
```

## Contratti TypeScript target

```ts
export interface PluginDiscoveryService {
  discover(sources: PluginDiscoverySource[]): Promise<CmsPluginDefinition[]>;
}
```

## API HTTP target

La discovery non ha API pubblica mutativa nella prima fase.

Endpoint diagnostico:

| Method | Path                         | Permission               |
| ------ | ---------------------------- | ------------------------ |
| `GET`  | `/v1/system/plugins/sources` | `core-pack:plugins:read` |

## DTO request/response

```ts
export interface PluginSourceDto {
  type: "workspace" | "package" | "local-path";
  name: string;
  entrypoint: string;
  status: "discovered" | "failed" | "disabled";
  error?: string;
}
```

## Storage Mongo

Discovery source puo essere config-only nella prima fase.

Stato persistito in:

```text
cms_kernel_plugin_runtime
```

## Security e permission

Solo operatori con `core-pack:plugins:operate` possono abilitare/disabilitare
plugin. Installazione da path/package esterni resta fuori scope.

## Eventi

| Evento                          | Visibility |
| ------------------------------- | ---------- |
| `core.plugin.source.discovered` | `audit`    |
| `core.plugin.source.failed`     | `audit`    |

## Errori

| Code                        | HTTP | Quando            |
| --------------------------- | ---- | ----------------- |
| `plugin_source_invalid`     | 400  | source non valida |
| `plugin_entrypoint_missing` | 500  | export mancante   |
| `plugin_manifest_missing`   | 500  | manifest assente  |

## Lifecycle

1. carica source configurate
2. importa entrypoint
3. valida plugin definition
4. registra nel runtime

## Compatibilita e versioning

`requiresCore` e semver range obbligatorio. Versioni plugin devono essere semver.

## Acceptance criteria

- package shape chiaro
- discovery locale/configurata definita
- marketplace fuori scope
- errori diagnostici definiti

## Out of scope

- marketplace remoto
- installazione npm runtime
- firma supply-chain plugin

## Gap rispetto al codice attuale

- Playground registra plugin in modo esplicito.
- Serve discovery service formale.
